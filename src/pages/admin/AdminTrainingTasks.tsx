import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { 
  GraduationCap, 
  Plus, 
  Loader2, 
  Clock, 
  Star, 
  CheckCircle2, 
  XCircle,
  Users,
  FileText,
  Award,
  Eye,
  EyeOff,
  Trash2,
  ExternalLink,
} from "lucide-react";

export default function AdminTrainingTasks() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [feedback, setFeedback] = useState("");
  const [starsToAward, setStarsToAward] = useState(1);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    requirements: "",
    difficulty: "easy",
    stars_reward: 1,
    deadline_hours: 24,
    category_id: "",
    submission_method: "files" as "files" | "gdrive",
  });

  // Fetch categories for linking to tasks
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ["training-tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_tasks")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: assignments, isLoading: assignmentsLoading } = useQuery({
    queryKey: ["training-assignments-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_assignments")
        .select("*, training_tasks(title, difficulty, stars_reward)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      
      // Fetch freelancer profiles separately
      if (data && data.length > 0) {
        const freelancerIds = [...new Set(data.map(a => a.freelancer_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", freelancerIds);
        
        return data.map(assignment => ({
          ...assignment,
          profiles: profiles?.find(p => p.user_id === assignment.freelancer_id)
        }));
      }
      
      return data || [];
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async () => {
      if (!formData.category_id) {
        throw new Error("يرجى اختيار التخصص/القسم");
      }

      const taskData = {
        title: formData.title,
        description: formData.description,
        requirements: formData.requirements,
        difficulty: formData.difficulty,
        stars_reward: formData.stars_reward,
        deadline_hours: formData.deadline_hours,
        category_id: formData.category_id,
         audience: "freelancers",
        is_category_specific: true,
        target_categories: [formData.category_id],
        submission_method: formData.submission_method,
        created_by: user?.id,
      };
      const { error } = await supabase.from("training_tasks").insert(taskData);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-tasks"] });
      toast({ title: "تم إنشاء المهمة التدريبية بنجاح! ✅" });
      setShowCreateDialog(false);
      setEditingTask(null);
      setFormData({
        title: "",
        description: "",
        requirements: "",
        difficulty: "easy",
        stars_reward: 1,
        deadline_hours: 24,
        category_id: "",
        submission_method: "files",
      });
    },
    onError: (error: any) => {
      toast({ title: "حدث خطأ", description: error.message, variant: "destructive" });
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: async () => {
      if (!editingTask?.id) throw new Error("لا توجد مهمة للتعديل");
      if (!formData.category_id) throw new Error("يرجى اختيار التخصص/القسم");

      const { error } = await supabase
        .from("training_tasks")
        .update({
          title: formData.title,
          description: formData.description,
          requirements: formData.requirements,
          difficulty: formData.difficulty,
          stars_reward: formData.stars_reward,
          deadline_hours: formData.deadline_hours,
          category_id: formData.category_id,
          audience: "freelancers",
          is_category_specific: true,
          target_categories: [formData.category_id],
          submission_method: formData.submission_method,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingTask.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-tasks"] });
      toast({ title: "تم حفظ التعديلات ✅" });
      setShowCreateDialog(false);
      setEditingTask(null);
    },
    onError: (error: any) => {
      toast({ title: "حدث خطأ", description: error.message, variant: "destructive" });
    },
  });

  const toggleTaskMutation = useMutation({
    mutationFn: async ({ taskId, isActive }: { taskId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("training_tasks")
        .update({ is_active: isActive })
        .eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-tasks"] });
      toast({ title: "تم تحديث حالة المهمة ✅" });
    },
    onError: (error: any) => {
      toast({ title: "حدث خطأ", description: error.message, variant: "destructive" });
    }
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from("training_tasks")
        .delete()
        .eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-tasks"] });
      toast({ title: "تم حذف المهمة ✅" });
    },
    onError: (error: any) => {
      toast({ title: "حدث خطأ", description: error.message, variant: "destructive" });
    }
  });

  const reviewAssignmentMutation = useMutation({
    mutationFn: async ({ id, status, feedback, stars }: { 
      id: string; 
      status: "approved" | "rejected"; 
      feedback: string;
      stars: number;
    }) => {
      const { error } = await supabase
        .from("training_assignments")
        .update({ 
          status, 
          admin_feedback: feedback,
          stars_earned: status === "approved" ? stars : 0,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id
        })
        .eq("id", id);
      if (error) throw error;

      // If approved, update freelancer profile stars
      if (status === "approved") {
        const assignment = assignments?.find((a: any) => a.id === id);
        if (assignment) {
          // Get current profile
          const { data: profile } = await supabase
            .from("freelancer_profiles")
            .select("stars, training_completed")
            .eq("user_id", assignment.freelancer_id)
            .single();
          
          if (profile) {
            await supabase
              .from("freelancer_profiles")
              .update({ 
                stars: (profile.stars || 0) + stars,
                training_completed: (profile.training_completed || 0) + 1
              })
              .eq("user_id", assignment.freelancer_id);
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-assignments-admin"] });
      toast({ title: "تم تقييم المهمة بنجاح! ✅" });
      setSelectedAssignment(null);
    },
    onError: (error: any) => {
      toast({ title: "حدث خطأ", description: error.message, variant: "destructive" });
    }
  });

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return <Badge className="bg-green-100 text-green-700">سهلة</Badge>;
      case "medium":
        return <Badge className="bg-yellow-100 text-yellow-700">متوسطة</Badge>;
      case "hard":
        return <Badge className="bg-red-100 text-red-700">صعبة</Badge>;
      default:
        return <Badge variant="outline">{difficulty}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />معلقة</Badge>;
      case "accepted":
        return <Badge className="bg-blue-100 text-blue-700">مقبولة</Badge>;
      case "in_progress":
        return <Badge className="bg-yellow-100 text-yellow-700">قيد التنفيذ</Badge>;
      case "submitted":
        return <Badge className="bg-purple-100 text-purple-700">تم التسليم</Badge>;
      case "approved":
        return <Badge className="bg-green-100 text-green-700"><CheckCircle2 className="w-3 h-3 mr-1" />معتمدة</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-700"><XCircle className="w-3 h-3 mr-1" />مرفوضة</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pendingReview = assignments?.filter((a: any) => a.status === "submitted") || [];

  const openEdit = (task: any) => {
    setEditingTask(task);
    setFormData({
      title: task.title || "",
      description: task.description || "",
      requirements: task.requirements || "",
      difficulty: task.difficulty || "easy",
      stars_reward: task.stars_reward || 1,
      deadline_hours: task.deadline_hours || 24,
      category_id: task.category_id || "",
      submission_method: (task.submission_method as "files" | "gdrive") || "files",
    });
    setShowCreateDialog(true);
  };

  return (
    <DashboardLayout
      sidebar={<AdminSidebar />}
      title="المهام التدريبية"
      subtitle="إدارة مهام التدريب للفريلانسرز الجدد"
    >
      <Tabs defaultValue="tasks" className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="tasks" className="gap-2">
              <GraduationCap className="w-4 h-4" />
              المهام ({tasks?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="submissions" className="gap-2">
              <FileText className="w-4 h-4" />
              التسليمات
              {pendingReview.length > 0 && (
                <Badge variant="destructive" className="mr-1">{pendingReview.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 ml-2" />
            مهمة جديدة
          </Button>
        </div>

        <TabsContent value="tasks">
          {tasksLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : tasks && tasks.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {tasks.map((task: any) => (
                <Card key={task.id} className={!task.is_active ? "opacity-60" : ""}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{task.title}</CardTitle>
                      {getDifficultyBadge(task.difficulty)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {task.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {task.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500" />
                        {task.stars_reward} نجمة
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        {task.deadline_hours} ساعة
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <Badge variant={task.is_active ? "default" : "secondary"}>
                        {task.is_active ? "نشطة" : "متوقفة"}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => navigate(`/admin/training/${task.id}`)}
                        >
                          <ExternalLink className="w-4 h-4 text-primary" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(task)}
                        >
                          <FileText className="w-4 h-4 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => toggleTaskMutation.mutate({ 
                            taskId: task.id, 
                            isActive: !task.is_active 
                          })}
                          disabled={toggleTaskMutation.isPending}
                        >
                          {task.is_active ? (
                            <EyeOff className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <Eye className="w-4 h-4 text-green-600" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm("هل أنت متأكد من حذف هذه المهمة؟")) {
                              deleteTaskMutation.mutate(task.id);
                            }
                          }}
                          disabled={deleteTaskMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <GraduationCap className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">لا توجد مهام تدريبية</h3>
              <p className="text-muted-foreground mb-4">أنشئ مهام للفريلانسرز الجدد</p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 ml-2" />
                مهمة جديدة
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="submissions">
          {assignmentsLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : assignments && assignments.length > 0 ? (
            <div className="space-y-4">
              {assignments.map((assignment: any) => (
                <Card key={assignment.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-medium">{assignment.profiles?.full_name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {assignment.training_tasks?.title}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {getStatusBadge(assignment.status)}
                        {assignment.status === "submitted" && (
                          <Button 
                            size="sm"
                            onClick={() => {
                              setSelectedAssignment(assignment);
                              setFeedback("");
                              setStarsToAward(assignment.training_tasks?.stars_reward || 1);
                            }}
                          >
                            <Award className="w-4 h-4 ml-1" />
                            تقييم
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <FileText className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">لا توجد تسليمات</h3>
              <p className="text-muted-foreground">ستظهر هنا تسليمات الفريلانسرز</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Task Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTask ? "تعديل المهمة التدريبية" : "إنشاء مهمة تدريبية جديدة"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>عنوان المهمة *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="مثال: تصميم شعار بسيط"
              />
            </div>

            <div className="space-y-2">
              <Label>التخصص/القسم *</Label>
              <Select
                value={formData.category_id}
                onValueChange={(value) => {
                  const next: any = { ...formData, category_id: value };
                  const cat = categories?.find((c: any) => c.id === value);
                  if (cat?.name === "video") next.submission_method = "gdrive";
                  setFormData(next);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر التخصص" />
                </SelectTrigger>
                <SelectContent>
                  {(categories || []).map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name_ar || c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>طريقة التسليم</Label>
              <Select
                value={formData.submission_method}
                onValueChange={(value) => setFormData({ ...formData, submission_method: value as any })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر طريقة التسليم" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="files">رفع ملفات</SelectItem>
                  <SelectItem value="gdrive">رابط Google Drive (عام)</SelectItem>
                </SelectContent>
              </Select>
              {formData.submission_method === "gdrive" && (
                <p className="text-xs text-muted-foreground">
                  مهام الفيديو يجب تسليمها كرابط Google Drive عام لتوفير المساحة.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>الوصف</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="وصف المهمة..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>المتطلبات</Label>
              <Textarea
                value={formData.requirements}
                onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                placeholder="ما المطلوب تسليمه..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>التخصص (اختياري)</Label>
              <Select
                value={formData.category_id}
                onValueChange={(v) => setFormData({ ...formData, category_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر تخصص..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع التخصصات</SelectItem>
                  {categories?.map((cat: any) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name_ar}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                سيظهر للفريلانسرز المتخصصين في هذا المجال فقط
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>الصعوبة</Label>
                <Select
                  value={formData.difficulty}
                  onValueChange={(v) => setFormData({ ...formData, difficulty: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">سهلة</SelectItem>
                    <SelectItem value="medium">متوسطة</SelectItem>
                    <SelectItem value="hard">صعبة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>النجوم</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={formData.stars_reward}
                  onChange={(e) => setFormData({ ...formData, stars_reward: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="space-y-2">
                <Label>المدة (ساعة)</Label>
                <Input
                  type="number"
                  min={1}
                  value={formData.deadline_hours}
                  onChange={(e) => setFormData({ ...formData, deadline_hours: parseInt(e.target.value) || 24 })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              إلغاء
            </Button>
            <Button 
              onClick={() => (editingTask ? updateTaskMutation.mutate() : createTaskMutation.mutate())}
              disabled={!formData.title || !formData.category_id || createTaskMutation.isPending || updateTaskMutation.isPending}
            >
              {(createTaskMutation.isPending || updateTaskMutation.isPending) && (
                <Loader2 className="w-4 h-4 animate-spin ml-2" />
              )}
              {editingTask ? "حفظ التعديلات" : "إنشاء المهمة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Assignment Dialog */}
      <Dialog open={!!selectedAssignment} onOpenChange={() => setSelectedAssignment(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>تقييم التسليم</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="font-medium">{selectedAssignment?.profiles?.full_name}</p>
              <p className="text-sm text-muted-foreground">{selectedAssignment?.training_tasks?.title}</p>
            </div>
            
            {selectedAssignment?.delivery_notes && (
              <div>
                <Label>ملاحظات التسليم</Label>
                <p className="text-sm mt-1 p-3 bg-muted rounded-lg">
                  {selectedAssignment.delivery_notes}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>تقييمك</Label>
              <Textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="أضف تقييمك وملاحظاتك..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>النجوم المستحقة</Label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setStarsToAward(star)}
                    className="p-1"
                  >
                    <Star 
                      className={`w-6 h-6 ${star <= starsToAward ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}`}
                    />
                  </button>
                ))}
                <span className="text-sm text-muted-foreground mr-2">{starsToAward} نجوم</span>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSelectedAssignment(null)}>
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={() => reviewAssignmentMutation.mutate({
                id: selectedAssignment.id,
                status: "rejected",
                feedback,
                stars: 0
              })}
              disabled={reviewAssignmentMutation.isPending}
            >
              <XCircle className="w-4 h-4 ml-1" />
              رفض
            </Button>
            <Button
              onClick={() => reviewAssignmentMutation.mutate({
                id: selectedAssignment.id,
                status: "approved",
                feedback,
                stars: starsToAward
              })}
              disabled={reviewAssignmentMutation.isPending}
            >
              <CheckCircle2 className="w-4 h-4 ml-1" />
              قبول
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
