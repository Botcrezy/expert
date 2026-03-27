import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { 
  Plus, 
  Loader2, 
  Users, 
  CheckCircle2, 
  Clock, 
  Star,
  FileText,
  Calendar,
  DollarSign,
  X
} from "lucide-react";
import { format, isValid } from "date-fns";
import { ar } from "date-fns/locale";

interface ProjectTasksManagerProps {
  requestId: string;
  requestTitle?: string;
}

export function ProjectTasksManager({ requestId, requestTitle }: ProjectTasksManagerProps) {
  const queryClient = useQueryClient();
  const [showAddTaskDialog, setShowAddTaskDialog] = useState(false);
  const [selectedFreelancer, setSelectedFreelancer] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    requirements: "",
    deadline: "",
    payment_amount: 0
  });

  // Fetch project tasks for this request
  const { data: projectTasks, isLoading } = useQuery({
    queryKey: ["project-tasks", requestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_tasks")
        .select("*")
        .eq("request_id", requestId)
        .order("created_at", { ascending: true });
      
      if (error) throw error;

      // Fetch freelancer profiles
      if (data && data.length > 0) {
        const freelancerIds = [...new Set(data.filter(t => t.freelancer_id).map(t => t.freelancer_id!))];
        if (freelancerIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, full_name, email")
            .in("user_id", freelancerIds);
          
          return data.map(task => ({
            ...task,
            freelancer_profile: profiles?.find(p => p.user_id === task.freelancer_id)
          }));
        }
      }
      
      return data || [];
    },
  });

  // Fetch all verified freelancers
  const { data: freelancers } = useQuery({
    queryKey: ["verified-freelancers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("freelancer_profiles")
        .select("*")
        .eq("is_verified", true);
      
      if (!data || data.length === 0) return [];
      
      const userIds = data.map((f) => f.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", userIds);
      
      return data.map((f) => ({
        ...f,
        name: profiles?.find((p) => p.user_id === f.user_id)?.full_name || "غير معروف",
        email: profiles?.find((p) => p.user_id === f.user_id)?.email,
      }));
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("project_tasks").insert({
        request_id: requestId,
        freelancer_id: selectedFreelancer || null,
        title: formData.title,
        description: formData.description,
        requirements: formData.requirements,
        deadline: formData.deadline || null,
        payment_amount: formData.payment_amount || 0,
        status: selectedFreelancer ? "assigned" : "pending",
        assigned_at: selectedFreelancer ? new Date().toISOString() : null,
      });
      if (error) throw error;

      // Send in-app notification to freelancer if assigned
      if (selectedFreelancer) {
        await supabase.from("notifications").insert({
          user_id: selectedFreelancer,
          type: "task_assignment",
          title: "تم تعيينك لمهمة فرعية جديدة",
          body: `تم تعيينك للعمل على: ${formData.title}`,
          reference_type: "request",
          reference_id: requestId,
        });

        // Send Telegram notification to freelancer (if linked)
        try {
          await supabase.functions.invoke("telegram-send", {
            body: {
              user_id: selectedFreelancer,
              message_type: "task_assigned",
              data: {
                title: formData.title,
                deadline: formData.deadline,
                payment_amount: formData.payment_amount,
              },
              reference_type: "request",
              reference_id: requestId,
            },
          });
        } catch (telegramError) {
          console.error("Telegram task_assigned (project task) error:", telegramError);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-tasks", requestId] });
      toast({ title: "تم إضافة المهمة بنجاح ✅" });
      setShowAddTaskDialog(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "حدث خطأ", description: error.message, variant: "destructive" });
    }
  });

  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: string }) => {
      const updateData: any = { status };
      if (status === "completed") {
        updateData.completed_at = new Date().toISOString();
      }
      const { error } = await supabase.from("project_tasks").update(updateData).eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-tasks", requestId] });
      toast({ title: "تم تحديث حالة المهمة" });
    }
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      requirements: "",
      deadline: "",
      payment_amount: 0
    });
    setSelectedFreelancer("");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline"><Clock className="w-3 h-3 ml-1" />معلقة</Badge>;
      case "assigned":
        return <Badge className="bg-blue-100 text-blue-700">معينة</Badge>;
      case "in_progress":
        return <Badge className="bg-yellow-100 text-yellow-700">قيد التنفيذ</Badge>;
      case "submitted":
        return <Badge className="bg-purple-100 text-purple-700">تم التسليم</Badge>;
      case "approved":
        return <Badge className="bg-green-100 text-green-700"><CheckCircle2 className="w-3 h-3 ml-1" />مقبولة</Badge>;
      case "completed":
        return <Badge className="bg-emerald-100 text-emerald-700">مكتملة</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const safeFormatDate = (dateString: string | null | undefined) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      if (!isValid(date) || date.getFullYear() > 2100 || date.getFullYear() < 1900) {
        return null;
      }
      return format(date, "d MMMM yyyy", { locale: ar });
    } catch {
      return null;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          المهام الفرعية للمشروع
        </CardTitle>
        <Button size="sm" onClick={() => setShowAddTaskDialog(true)}>
          <Plus className="w-4 h-4 ml-1" />
          إضافة مهمة
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : projectTasks && projectTasks.length > 0 ? (
          <div className="space-y-4">
            {projectTasks.map((task: any) => (
              <div 
                key={task.id} 
                className="p-4 border rounded-xl bg-card hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium">{task.title}</h4>
                      {getStatusBadge(task.status)}
                    </div>
                    
                    {task.description && (
                      <p className="text-sm text-muted-foreground mb-3">{task.description}</p>
                    )}
                    
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      {task.freelancer_profile && (
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4 text-primary" />
                          <span>{task.freelancer_profile.full_name}</span>
                        </div>
                      )}
                      
                      {task.deadline && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span>{safeFormatDate(task.deadline)}</span>
                        </div>
                      )}
                      
                      {task.payment_amount > 0 && (
                        <div className="flex items-center gap-1 text-green-600">
                          <DollarSign className="w-4 h-4" />
                          <span>{task.payment_amount} ج.م</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {task.status === "submitted" && (
                      <Button 
                        size="sm" 
                        onClick={() => updateTaskStatusMutation.mutate({ taskId: task.id, status: "approved" })}
                      >
                        <CheckCircle2 className="w-4 h-4 ml-1" />
                        قبول
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground mb-2">لا توجد مهام فرعية</p>
            <p className="text-sm text-muted-foreground">أضف مهام وعين فريلانسرز متعددين</p>
          </div>
        )}
      </CardContent>

      {/* Add Task Dialog */}
      <Dialog open={showAddTaskDialog} onOpenChange={setShowAddTaskDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>إضافة مهمة فرعية جديدة</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>عنوان المهمة *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="مثال: تصميم الصفحة الرئيسية"
              />
            </div>
            
            <div className="space-y-2">
              <Label>وصف المهمة</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="تفاصيل المهمة المطلوبة..."
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label>المتطلبات</Label>
              <Textarea
                value={formData.requirements}
                onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                placeholder="ما المطلوب تسليمه..."
                rows={2}
              />
            </div>
            
            <div className="space-y-2">
              <Label>تعيين فريلانسر</Label>
              <Select
                value={selectedFreelancer}
                onValueChange={setSelectedFreelancer}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر فريلانسر..." />
                </SelectTrigger>
                <SelectContent>
                  {freelancers?.map((f: any) => (
                    <SelectItem key={f.user_id} value={f.user_id}>
                      <div className="flex items-center gap-2">
                        <span>{f.name}</span>
                        <span className="text-muted-foreground">({f.completed_tasks} مهمة)</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>الموعد النهائي</Label>
                <Input
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label>المبلغ (ج.م)</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.payment_amount}
                  onChange={(e) => setFormData({ ...formData, payment_amount: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddTaskDialog(false)}>
              إلغاء
            </Button>
            <Button 
              onClick={() => createTaskMutation.mutate()}
              disabled={!formData.title || createTaskMutation.isPending}
            >
              {createTaskMutation.isPending && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
              إضافة المهمة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
