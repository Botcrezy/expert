import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { 
  Palette, 
  Globe, 
  Target, 
  Plus, 
  Loader2, 
  CheckCircle2, 
  Clock, 
  XCircle,
  FileText,
  MessageSquare,
  Receipt,
  Users,
  ArrowLeft,
  Send,
  Ban,
  Trash2,
  UserPlus,
  ClipboardList,
  Eye,
  Star,
  AlertCircle
} from "lucide-react";

export default function AdminBrandDetails() {
  const { brandId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [suspendReason, setSuspendReason] = useState("");
  const [invoiceData, setInvoiceData] = useState({ amount: "", description: "" });
  const [assignData, setAssignData] = useState({ freelancerId: "", role: "", paymentAmount: "" });
  const [taskData, setTaskData] = useState({ 
    title: "", description: "", requirements: "", 
    freelancerId: "", deadline: "", paymentAmount: "" 
  });

  // Fetch brand details
  const { data: brand, isLoading } = useQuery({
    queryKey: ["admin-brand-details", brandId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brands")
        .select("*")
        .eq("id", brandId)
        .single();
      if (error) throw error;
      
      // Fetch user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", data.user_id)
        .single();
      
      return { ...data, profiles: profile };
    },
    enabled: !!brandId,
  });

  // Fetch brand goals
  const { data: goals = [] } = useQuery({
    queryKey: ["admin-brand-goals", brandId],
    queryFn: async () => {
      const { data } = await supabase
        .from("brand_goals")
        .select("*")
        .eq("brand_id", brandId)
        .order("sort_order");
      return data || [];
    },
    enabled: !!brandId,
  });

  // Fetch brand assignments
  const { data: assignments = [] } = useQuery({
    queryKey: ["admin-brand-assignments", brandId],
    queryFn: async () => {
      const { data } = await supabase
        .from("brand_assignments")
        .select("*")
        .eq("brand_id", brandId)
        .order("assigned_at", { ascending: false });
      
      if (data && data.length > 0) {
        const freelancerIds = [...new Set(data.map(a => a.freelancer_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", freelancerIds);
        
        const { data: freelancerProfiles } = await supabase
          .from("freelancer_profiles")
          .select("user_id, stars, rating, completed_tasks")
          .in("user_id", freelancerIds);
        
        return data.map(a => ({
          ...a,
          profile: profiles?.find(p => p.user_id === a.freelancer_id),
          freelancer: freelancerProfiles?.find(f => f.user_id === a.freelancer_id)
        }));
      }
      return data || [];
    },
    enabled: !!brandId,
  });

  // Fetch brand tasks
  const { data: tasks = [] } = useQuery({
    queryKey: ["admin-brand-tasks", brandId],
    queryFn: async () => {
      const { data } = await supabase
        .from("brand_tasks")
        .select("*")
        .eq("brand_id", brandId)
        .order("created_at", { ascending: false });
      
      if (data && data.length > 0) {
        const freelancerIds = [...new Set(data.filter(t => t.freelancer_id).map(t => t.freelancer_id))];
        if (freelancerIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, full_name")
            .in("user_id", freelancerIds);
          
          return data.map(t => ({
            ...t,
            freelancer_profile: profiles?.find(p => p.user_id === t.freelancer_id)
          }));
        }
      }
      return data || [];
    },
    enabled: !!brandId,
  });

  // Fetch all freelancers for assignment
  const { data: freelancers = [] } = useQuery({
    queryKey: ["freelancers-for-brand"],
    queryFn: async () => {
      const { data } = await supabase
        .from("freelancer_profiles")
        .select("*")
        .eq("is_verified", true)
        .order("stars", { ascending: false });
      
      if (data && data.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", data.map(f => f.user_id));
        
        return data.map(f => ({
          ...f,
          profile: profiles?.find(p => p.user_id === f.user_id)
        }));
      }
      return data || [];
    },
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").eq("is_active", true);
      return data || [];
    },
  });

  // Group freelancers by category
  const freelancersByCategory = categories.map((cat: any) => ({
    category: cat,
    freelancers: freelancers.filter((f: any) => f.categories?.includes(cat.id))
  })).filter(g => g.freelancers.length > 0);

  // Add note mutation
  const addNoteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("brand_notes").insert({
        brand_id: brandId,
        admin_id: user?.id,
        note: noteText
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-brand-details", brandId] });
      toast({ title: "تم إرسال الملاحظة بنجاح! ✅" });
      setShowNoteDialog(false);
      setNoteText("");
    }
  });

  // Create invoice mutation
  const createInvoiceMutation = useMutation({
    mutationFn: async () => {
      const invoiceNumber = `INV-${Date.now()}`;
      const { error } = await supabase.from("brand_invoices").insert({
        brand_id: brandId,
        user_id: brand?.user_id,
        invoice_number: invoiceNumber,
        amount: parseFloat(invoiceData.amount),
        description: invoiceData.description,
        created_by: user?.id
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-brand-details", brandId] });
      toast({ title: "تم إنشاء الفاتورة بنجاح! ✅" });
      setShowInvoiceDialog(false);
      setInvoiceData({ amount: "", description: "" });
    }
  });

  // Assign freelancer mutation
  const assignFreelancerMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("brand_assignments").insert({
        brand_id: brandId,
        freelancer_id: assignData.freelancerId,
        assigned_by: user?.id,
        role: assignData.role,
        payment_amount: parseFloat(assignData.paymentAmount) || 0
      });
      if (error) throw error;
      
      // Send notification
      await supabase.from("notifications").insert({
        user_id: assignData.freelancerId,
        type: "brand_assignment",
        title: "تم تعيينك في مشروع جديد",
        body: `تم تعيينك في مشروع براند: ${brand?.name}`,
        reference_type: "brand",
        reference_id: brandId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-brand-assignments", brandId] });
      toast({ title: "تم تعيين الفريلانسر بنجاح! ✅" });
      setShowAssignDialog(false);
      setAssignData({ freelancerId: "", role: "", paymentAmount: "" });
    }
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("brand_tasks").insert({
        brand_id: brandId,
        freelancer_id: taskData.freelancerId || null,
        title: taskData.title,
        description: taskData.description,
        requirements: taskData.requirements,
        deadline: taskData.deadline || null,
        payment_amount: parseFloat(taskData.paymentAmount) || 0
      });
      if (error) throw error;
      
      if (taskData.freelancerId) {
        await supabase.from("notifications").insert({
          user_id: taskData.freelancerId,
          type: "brand_task",
          title: "مهمة جديدة",
          body: `تم إسناد مهمة جديدة لك: ${taskData.title}`,
          reference_type: "brand_task",
          reference_id: brandId
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-brand-tasks", brandId] });
      toast({ title: "تم إنشاء المهمة بنجاح! ✅" });
      setShowTaskDialog(false);
      setTaskData({ title: "", description: "", requirements: "", freelancerId: "", deadline: "", paymentAmount: "" });
    }
  });

  // Suspend/unsuspend brand
  const toggleSuspendMutation = useMutation({
    mutationFn: async (suspend: boolean) => {
      const { error } = await supabase
        .from("brands")
        .update({
          is_suspended: suspend,
          suspended_at: suspend ? new Date().toISOString() : null,
          suspended_by: suspend ? user?.id : null,
          suspension_reason: suspend ? suspendReason : null
        })
        .eq("id", brandId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-brand-details", brandId] });
      toast({ title: brand?.is_suspended ? "تم إلغاء تعليق البراند" : "تم تعليق البراند" });
      setShowSuspendDialog(false);
      setSuspendReason("");
    }
  });

  // Update brand status
  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await supabase
        .from("brands")
        .update({ status })
        .eq("id", brandId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-brand-details", brandId] });
      toast({ title: "تم تحديث الحالة بنجاح! ✅" });
    }
  });

  // Approve task delivery
  const approveDeliveryMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const task = tasks.find((t: any) => t.id === taskId);
      
      const { error: taskError } = await supabase
        .from("brand_tasks")
        .update({ 
          status: "approved",
          qc_reviewed_at: new Date().toISOString(),
          qc_reviewer_id: user?.id,
          completed_at: new Date().toISOString()
        })
        .eq("id", taskId);
      if (taskError) throw taskError;
      
      // Create visible delivery for client
      if (task) {
        await supabase.from("brand_deliveries").insert({
          brand_id: brandId,
          task_id: taskId,
          freelancer_id: task.freelancer_id,
          files: task.delivery_files || [],
          notes: task.delivery_notes,
          is_approved: true,
          is_visible_to_client: true,
          approved_by: user?.id,
          approved_at: new Date().toISOString()
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-brand-tasks", brandId] });
      toast({ title: "تم الموافقة على التسليم! ✅" });
    }
  });

  const getTaskStatusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge className="bg-gray-100 text-gray-700">معلق</Badge>;
      case "in_progress": return <Badge className="bg-blue-100 text-blue-700">جاري</Badge>;
      case "submitted": return <Badge className="bg-yellow-100 text-yellow-700">بانتظار المراجعة</Badge>;
      case "approved": return <Badge className="bg-green-100 text-green-700">معتمد</Badge>;
      case "rejected": return <Badge className="bg-red-100 text-red-700">مرفوض</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout sidebar={<AdminSidebar />} title="تفاصيل البراند">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!brand) {
    return (
      <DashboardLayout sidebar={<AdminSidebar />} title="تفاصيل البراند">
        <div className="text-center py-20">
          <AlertCircle className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">البراند غير موجود</h3>
          <Button asChild>
            <Link to="/admin/brands">العودة للبراندات</Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      sidebar={<AdminSidebar />}
      title={`إدارة البراند: ${brand.name}`}
      subtitle={`العميل: ${brand.profiles?.full_name}`}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/admin/brands">
              <ArrowLeft className="w-4 h-4 ml-2" />
              العودة
            </Link>
          </Button>
          <Button 
            variant={brand.is_suspended ? "default" : "destructive"}
            onClick={() => brand.is_suspended ? toggleSuspendMutation.mutate(false) : setShowSuspendDialog(true)}
          >
            <Ban className="w-4 h-4 ml-2" />
            {brand.is_suspended ? "إلغاء التعليق" : "تعليق البراند"}
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Brand Header */}
        <Card>
          <div 
            className="h-4 rounded-t-lg"
            style={{ backgroundColor: (brand.colors as any)?.primary || "#3b82f6" }}
          />
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div 
                  className="w-16 h-16 rounded-xl flex items-center justify-center text-white font-bold text-2xl"
                  style={{ backgroundColor: (brand.colors as any)?.primary || "#3b82f6" }}
                >
                  {brand.name?.charAt(0)}
                </div>
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    {brand.name}
                    {brand.is_suspended && (
                      <Badge className="bg-red-100 text-red-700">
                        <Ban className="w-3 h-3 mr-1" />
                        معلق
                      </Badge>
                    )}
                  </CardTitle>
                  <p className="text-muted-foreground">{brand.profiles?.full_name} - {brand.profiles?.email}</p>
                  {brand.industry && <p className="text-sm text-muted-foreground">{brand.industry}</p>}
                </div>
              </div>
              <div className="flex gap-2">
                <Select value={brand.status} onValueChange={(v) => updateStatusMutation.mutate(v)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">قيد المراجعة</SelectItem>
                    <SelectItem value="approved">معتمد</SelectItem>
                    <SelectItem value="active">نشط</SelectItem>
                    <SelectItem value="rejected">مرفوض</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Quick Actions */}
        <div className="grid sm:grid-cols-4 gap-4">
          <Button onClick={() => setShowNoteDialog(true)} variant="outline" className="h-auto py-4 flex-col">
            <MessageSquare className="w-6 h-6 mb-2" />
            <span>إرسال ملاحظة</span>
          </Button>
          <Button onClick={() => setShowInvoiceDialog(true)} variant="outline" className="h-auto py-4 flex-col">
            <Receipt className="w-6 h-6 mb-2" />
            <span>إنشاء فاتورة</span>
          </Button>
          <Button onClick={() => setShowAssignDialog(true)} variant="outline" className="h-auto py-4 flex-col">
            <UserPlus className="w-6 h-6 mb-2" />
            <span>تعيين فريلانسر</span>
          </Button>
          <Button onClick={() => setShowTaskDialog(true)} variant="outline" className="h-auto py-4 flex-col">
            <ClipboardList className="w-6 h-6 mb-2" />
            <span>إضافة مهمة</span>
          </Button>
        </div>

        {/* Goals Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              أهداف العميل ({goals.filter((g: any) => g.is_completed).length}/{goals.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {goals.length > 0 ? (
              <div className="grid sm:grid-cols-2 gap-3">
                {goals.map((goal: any) => (
                  <div 
                    key={goal.id}
                    className={`p-3 rounded-lg border ${goal.is_completed ? "bg-green-50 border-green-200" : ""}`}
                  >
                    <div className="flex items-center gap-2">
                      {goal.is_completed ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <Clock className="w-5 h-5 text-muted-foreground" />
                      )}
                      <span className={goal.is_completed ? "line-through text-muted-foreground" : ""}>
                        {goal.title}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">لم يحدد العميل أي أهداف بعد</p>
            )}
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="assignments" className="space-y-4">
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="assignments">
              <Users className="w-4 h-4 ml-1" />
              التعيينات ({assignments.length})
            </TabsTrigger>
            <TabsTrigger value="tasks">
              <ClipboardList className="w-4 h-4 ml-1" />
              المهام ({tasks.length})
            </TabsTrigger>
            <TabsTrigger value="deliveries">
              <FileText className="w-4 h-4 ml-1" />
              للمراجعة ({tasks.filter((t: any) => t.status === "submitted").length})
            </TabsTrigger>
          </TabsList>

          {/* Assignments Tab */}
          <TabsContent value="assignments">
            <Card>
              <CardContent className="pt-6">
                {assignments.length > 0 ? (
                  <div className="space-y-4">
                    {assignments.map((assignment: any) => (
                      <div key={assignment.id} className="p-4 rounded-lg border flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="font-bold text-primary">
                              {assignment.profile?.full_name?.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{assignment.profile?.full_name}</p>
                            <p className="text-sm text-muted-foreground">{assignment.role || "فريلانسر"}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Star className="w-3 h-3 text-yellow-500" />
                              <span className="text-xs">{assignment.freelancer?.stars || 0} نجوم</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-left">
                          <p className="font-semibold">{assignment.payment_amount} ج.م</p>
                          <Badge className={assignment.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}>
                            {assignment.status === "active" ? "نشط" : assignment.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">لم يتم تعيين أي فريلانسر بعد</p>
                    <Button className="mt-4" onClick={() => setShowAssignDialog(true)}>
                      <UserPlus className="w-4 h-4 ml-2" />
                      تعيين فريلانسر
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks">
            <Card>
              <CardContent className="pt-6">
                {tasks.length > 0 ? (
                  <div className="space-y-4">
                    {tasks.map((task: any) => (
                      <div key={task.id} className="p-4 rounded-lg border">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium">{task.title}</p>
                            <p className="text-sm text-muted-foreground">{task.description}</p>
                          </div>
                          {getTaskStatusBadge(task.status)}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>الفريلانسر: {task.freelancer_profile?.full_name || "غير معين"}</span>
                          <span>المبلغ: {task.payment_amount} ج.م</span>
                          {task.deadline && <span>الموعد: {new Date(task.deadline).toLocaleDateString("ar-EG")}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ClipboardList className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">لا توجد مهام بعد</p>
                    <Button className="mt-4" onClick={() => setShowTaskDialog(true)}>
                      <Plus className="w-4 h-4 ml-2" />
                      إضافة مهمة
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Deliveries for Review Tab */}
          <TabsContent value="deliveries">
            <Card>
              <CardContent className="pt-6">
                {tasks.filter((t: any) => t.status === "submitted").length > 0 ? (
                  <div className="space-y-4">
                    {tasks.filter((t: any) => t.status === "submitted").map((task: any) => (
                      <div key={task.id} className="p-4 rounded-lg border bg-yellow-50">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-medium">{task.title}</p>
                            <p className="text-sm text-muted-foreground">
                              الفريلانسر: {task.freelancer_profile?.full_name}
                            </p>
                          </div>
                          <Badge className="bg-yellow-100 text-yellow-700">بانتظار المراجعة</Badge>
                        </div>
                        {task.delivery_notes && (
                          <div className="bg-white p-3 rounded mb-3">
                            <p className="text-sm">{task.delivery_notes}</p>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Button 
                            size="sm"
                            onClick={() => approveDeliveryMutation.mutate(task.id)}
                            disabled={approveDeliveryMutation.isPending}
                          >
                            <CheckCircle2 className="w-4 h-4 ml-1" />
                            موافقة ونشر للعميل
                          </Button>
                          <Button size="sm" variant="outline">
                            <Eye className="w-4 h-4 ml-1" />
                            عرض الملفات
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">لا توجد تسليمات بانتظار المراجعة</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Note Dialog */}
      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إرسال ملاحظة للعميل</DialogTitle>
          </DialogHeader>
          <Textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="اكتب ملاحظتك هنا..."
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNoteDialog(false)}>إلغاء</Button>
            <Button 
              onClick={() => addNoteMutation.mutate()}
              disabled={!noteText.trim() || addNoteMutation.isPending}
            >
              <Send className="w-4 h-4 ml-2" />
              إرسال
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Invoice Dialog */}
      <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إنشاء فاتورة جديدة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>المبلغ (ج.م) *</Label>
              <Input
                type="number"
                value={invoiceData.amount}
                onChange={(e) => setInvoiceData({ ...invoiceData, amount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>الوصف</Label>
              <Textarea
                value={invoiceData.description}
                onChange={(e) => setInvoiceData({ ...invoiceData, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInvoiceDialog(false)}>إلغاء</Button>
            <Button 
              onClick={() => createInvoiceMutation.mutate()}
              disabled={!invoiceData.amount || createInvoiceMutation.isPending}
            >
              إنشاء الفاتورة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Freelancer Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تعيين فريلانسر للبراند</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {freelancersByCategory.map((group: any) => (
              <div key={group.category.id} className="border rounded-lg p-4">
                <h4 className="font-semibold mb-3">{group.category.name_ar}</h4>
                <div className="grid gap-2">
                  {group.freelancers.map((f: any) => (
                    <div 
                      key={f.user_id}
                      className={`p-3 rounded border cursor-pointer transition-colors ${
                        assignData.freelancerId === f.user_id ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                      }`}
                      onClick={() => setAssignData({ ...assignData, freelancerId: f.user_id })}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{f.profile?.full_name}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Star className="w-3 h-3 text-yellow-500" />
                            {f.stars || 0} نجوم
                            <span>•</span>
                            {f.completed_tasks || 0} مهمة
                          </div>
                        </div>
                        {assignData.freelancerId === f.user_id && (
                          <CheckCircle2 className="w-5 h-5 text-primary" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div className="space-y-2">
              <Label>الدور</Label>
              <Input
                value={assignData.role}
                onChange={(e) => setAssignData({ ...assignData, role: e.target.value })}
                placeholder="مثال: مصمم، مطور..."
              />
            </div>
            <div className="space-y-2">
              <Label>المبلغ (ج.م)</Label>
              <Input
                type="number"
                value={assignData.paymentAmount}
                onChange={(e) => setAssignData({ ...assignData, paymentAmount: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>إلغاء</Button>
            <Button 
              onClick={() => assignFreelancerMutation.mutate()}
              disabled={!assignData.freelancerId || assignFreelancerMutation.isPending}
            >
              تعيين
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Task Dialog */}
      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة مهمة جديدة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>عنوان المهمة *</Label>
              <Input
                value={taskData.title}
                onChange={(e) => setTaskData({ ...taskData, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>الوصف</Label>
              <Textarea
                value={taskData.description}
                onChange={(e) => setTaskData({ ...taskData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>تعيين لفريلانسر</Label>
              <Select 
                value={taskData.freelancerId} 
                onValueChange={(v) => setTaskData({ ...taskData, freelancerId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر فريلانسر" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون تعيين</SelectItem>
                  {assignments.map((a: any) => (
                    <SelectItem key={a.freelancer_id} value={a.freelancer_id}>
                      {a.profile?.full_name}
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
                  value={taskData.deadline}
                  onChange={(e) => setTaskData({ ...taskData, deadline: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>المبلغ (ج.م)</Label>
                <Input
                  type="number"
                  value={taskData.paymentAmount}
                  onChange={(e) => setTaskData({ ...taskData, paymentAmount: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTaskDialog(false)}>إلغاء</Button>
            <Button 
              onClick={() => createTaskMutation.mutate()}
              disabled={!taskData.title || createTaskMutation.isPending}
            >
              إنشاء المهمة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend Dialog */}
      <Dialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعليق البراند</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">هل أنت متأكد من تعليق هذا البراند؟ لن يتمكن العميل من الوصول إليه.</p>
            <div className="space-y-2">
              <Label>سبب التعليق (اختياري)</Label>
              <Textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="اكتب سبب التعليق..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSuspendDialog(false)}>إلغاء</Button>
            <Button 
              variant="destructive"
              onClick={() => toggleSuspendMutation.mutate(true)}
              disabled={toggleSuspendMutation.isPending}
            >
              <Ban className="w-4 h-4 ml-2" />
              تعليق البراند
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
