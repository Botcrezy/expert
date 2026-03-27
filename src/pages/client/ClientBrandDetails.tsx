import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ClientSidebar } from "@/components/layout/ClientSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
  Edit,
  Save,
  Eye,
  Download,
  CreditCard,
  AlertCircle,
  Sparkles,
  Check,
  ArrowLeft,
  Trash2
} from "lucide-react";

export default function ClientBrandDetails() {
  const { brandId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [showGoalDialog, setShowGoalDialog] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: "", description: "" });
  const [editData, setEditData] = useState<any>({});

  // Fetch brand details
  const { data: brand, isLoading } = useQuery({
    queryKey: ["brand-details", brandId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brands")
        .select("*")
        .eq("id", brandId)
        .eq("user_id", user?.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!brandId && !!user,
  });

  // Fetch brand goals
  const { data: goals = [] } = useQuery({
    queryKey: ["brand-goals", brandId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brand_goals")
        .select("*")
        .eq("brand_id", brandId)
        .order("sort_order");
      if (error) throw error;
      return data || [];
    },
    enabled: !!brandId,
  });

  // Fetch brand notes from admin
  const { data: notes = [] } = useQuery({
    queryKey: ["brand-notes", brandId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brand_notes")
        .select("*")
        .eq("brand_id", brandId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!brandId,
  });

  // Fetch brand invoices
  const { data: invoices = [] } = useQuery({
    queryKey: ["brand-invoices", brandId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brand_invoices")
        .select("*")
        .eq("brand_id", brandId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!brandId,
  });

  // Fetch approved deliveries visible to client
  const { data: deliveries = [] } = useQuery({
    queryKey: ["brand-deliveries-client", brandId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brand_deliveries")
        .select("*, brand_tasks(title)")
        .eq("brand_id", brandId)
        .eq("is_visible_to_client", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!brandId,
  });

  // Update brand mutation
  const updateBrandMutation = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase
        .from("brands")
        .update(updates)
        .eq("id", brandId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brand-details", brandId] });
      toast({ title: "تم تحديث البراند بنجاح! ✅" });
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast({ title: "حدث خطأ", description: error.message, variant: "destructive" });
    }
  });

  // Add goal mutation
  const addGoalMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("brand_goals").insert({
        brand_id: brandId,
        title: newGoal.title,
        description: newGoal.description,
        sort_order: goals.length
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brand-goals", brandId] });
      toast({ title: "تم إضافة الهدف بنجاح! ✅" });
      setShowGoalDialog(false);
      setNewGoal({ title: "", description: "" });
    },
    onError: (error: any) => {
      toast({ title: "حدث خطأ", description: error.message, variant: "destructive" });
    }
  });

  // Toggle goal completion
  const toggleGoalMutation = useMutation({
    mutationFn: async ({ goalId, isCompleted }: { goalId: string; isCompleted: boolean }) => {
      const { error } = await supabase
        .from("brand_goals")
        .update({ 
          is_completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null
        })
        .eq("id", goalId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brand-goals", brandId] });
    }
  });

  // Delete goal mutation
  const deleteGoalMutation = useMutation({
    mutationFn: async (goalId: string) => {
      const { error } = await supabase
        .from("brand_goals")
        .delete()
        .eq("id", goalId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brand-goals", brandId] });
      toast({ title: "تم حذف الهدف" });
    }
  });

  // Mark notes as read
  const markNotesAsRead = async () => {
    const unreadNotes = notes.filter((n: any) => !n.is_read);
    if (unreadNotes.length > 0) {
      await supabase
        .from("brand_notes")
        .update({ is_read: true })
        .in("id", unreadNotes.map((n: any) => n.id));
      queryClient.invalidateQueries({ queryKey: ["brand-notes", brandId] });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-700"><Clock className="w-3 h-3 mr-1" />قيد المراجعة</Badge>;
      case "approved":
        return <Badge className="bg-green-100 text-green-700"><CheckCircle2 className="w-3 h-3 mr-1" />معتمد</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-700"><XCircle className="w-3 h-3 mr-1" />مرفوض</Badge>;
      case "active":
        return <Badge className="bg-blue-100 text-blue-700"><Sparkles className="w-3 h-3 mr-1" />نشط</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getInvoiceStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-700">غير مدفوعة</Badge>;
      case "paid":
        return <Badge className="bg-green-100 text-green-700">مدفوعة</Badge>;
      case "cancelled":
        return <Badge className="bg-red-100 text-red-700">ملغاة</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout sidebar={<ClientSidebar />} title="تفاصيل البراند">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!brand) {
    return (
      <DashboardLayout sidebar={<ClientSidebar />} title="تفاصيل البراند">
        <div className="text-center py-20">
          <AlertCircle className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">البراند غير موجود</h3>
          <Button asChild>
            <Link to="/client/brand">العودة للبراندات</Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const unreadNotesCount = notes.filter((n: any) => !n.is_read).length;
  const pendingInvoicesCount = invoices.filter((i: any) => i.status === "pending").length;
  const completedGoalsCount = goals.filter((g: any) => g.is_completed).length;

  return (
    <DashboardLayout
      sidebar={<ClientSidebar />}
      title={brand.name}
      subtitle="إدارة تفاصيل البراند والأهداف"
      actions={
        <Button variant="outline" asChild>
          <Link to="/client/brand">
            <ArrowLeft className="w-4 h-4 ml-2" />
            العودة
          </Link>
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Brand suspended warning */}
        {brand.is_suspended && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <p className="font-medium text-red-800">هذا البراند معلق</p>
              {brand.suspension_reason && (
                <p className="text-sm text-red-600 mt-1">{brand.suspension_reason}</p>
              )}
            </div>
          </div>
        )}

        {/* Brand Header Card */}
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
                    {getStatusBadge(brand.status)}
                  </CardTitle>
                  {brand.industry && (
                    <p className="text-muted-foreground">{brand.industry}</p>
                  )}
                  {brand.website && (
                    <a 
                      href={brand.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline flex items-center gap-1 mt-1"
                    >
                      <Globe className="w-3 h-3" />
                      {brand.website}
                    </a>
                  )}
                </div>
              </div>
              <Button 
                variant="outline" 
                onClick={() => {
                  setEditData({
                    name: brand.name,
                    description: brand.description,
                    industry: brand.industry,
                    website: brand.website,
                    colors: brand.colors || { primary: "#3b82f6", secondary: "#10b981" }
                  });
                  setIsEditing(true);
                }}
              >
                <Edit className="w-4 h-4 ml-2" />
                تعديل
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {brand.description && (
              <p className="text-muted-foreground">{brand.description}</p>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedGoalsCount}/{goals.length}</p>
                <p className="text-xs text-muted-foreground">أهداف مكتملة</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{deliveries.length}</p>
                <p className="text-xs text-muted-foreground">تسليمات</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                <Receipt className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingInvoicesCount}</p>
                <p className="text-xs text-muted-foreground">فواتير معلقة</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{unreadNotesCount}</p>
                <p className="text-xs text-muted-foreground">ملاحظات جديدة</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="goals" className="space-y-4">
          <TabsList className="grid grid-cols-4 w-full max-w-lg">
            <TabsTrigger value="goals" className="gap-1">
              <Target className="w-4 h-4" />
              الأهداف
            </TabsTrigger>
            <TabsTrigger value="notes" className="gap-1 relative">
              <MessageSquare className="w-4 h-4" />
              الملاحظات
              {unreadNotesCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadNotesCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="invoices" className="gap-1">
              <Receipt className="w-4 h-4" />
              الفواتير
            </TabsTrigger>
            <TabsTrigger value="deliveries" className="gap-1">
              <FileText className="w-4 h-4" />
              التسليمات
            </TabsTrigger>
          </TabsList>

          {/* Goals Tab */}
          <TabsContent value="goals">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">أهداف المشروع</CardTitle>
                  <CardDescription>حدد أهدافك ليعرف الفريق ما تحتاجه</CardDescription>
                </div>
                <Button onClick={() => setShowGoalDialog(true)}>
                  <Plus className="w-4 h-4 ml-2" />
                  هدف جديد
                </Button>
              </CardHeader>
              <CardContent>
                {goals.length > 0 ? (
                  <div className="space-y-3">
                    {goals.map((goal: any) => (
                      <div 
                        key={goal.id}
                        className={`p-4 rounded-lg border flex items-start justify-between gap-4 ${
                          goal.is_completed ? "bg-green-50 border-green-200" : "bg-card"
                        }`}
                      >
                        <div className="flex items-start gap-3 flex-1">
                          <button
                            onClick={() => toggleGoalMutation.mutate({ 
                              goalId: goal.id, 
                              isCompleted: !goal.is_completed 
                            })}
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mt-0.5 transition-colors ${
                              goal.is_completed 
                                ? "bg-green-500 border-green-500 text-white" 
                                : "border-muted-foreground/30 hover:border-primary"
                            }`}
                          >
                            {goal.is_completed && <Check className="w-4 h-4" />}
                          </button>
                          <div>
                            <p className={`font-medium ${goal.is_completed ? "line-through text-muted-foreground" : ""}`}>
                              {goal.title}
                            </p>
                            {goal.description && (
                              <p className="text-sm text-muted-foreground mt-1">{goal.description}</p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteGoalMutation.mutate(goal.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Target className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">لم تضف أي أهداف بعد</p>
                    <Button className="mt-4" onClick={() => setShowGoalDialog(true)}>
                      <Plus className="w-4 h-4 ml-2" />
                      إضافة هدف
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notes Tab */}
          <TabsContent value="notes" onFocus={markNotesAsRead}>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">ملاحظات الإدارة</CardTitle>
                <CardDescription>ملاحظات من فريق العمل بخصوص مشروعك</CardDescription>
              </CardHeader>
              <CardContent>
                {notes.length > 0 ? (
                  <div className="space-y-4">
                    {notes.map((note: any) => (
                      <div 
                        key={note.id}
                        className={`p-4 rounded-lg border ${!note.is_read ? "bg-blue-50 border-blue-200" : "bg-muted/50"}`}
                      >
                        <p className="text-foreground">{note.note}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(note.created_at).toLocaleDateString("ar-EG", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <MessageSquare className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">لا توجد ملاحظات حتى الآن</p>
                  </div>
                )}
                <div className="mt-4 pt-4 border-t">
                  <Button variant="outline" asChild className="w-full">
                    <Link to="/client/support">
                      <MessageSquare className="w-4 h-4 ml-2" />
                      فتح تذكرة دعم
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invoices Tab */}
          <TabsContent value="invoices">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">الفواتير</CardTitle>
                <CardDescription>فواتير المشروع وحالة الدفع</CardDescription>
              </CardHeader>
              <CardContent>
                {invoices.length > 0 ? (
                  <div className="space-y-4">
                    {invoices.map((invoice: any) => (
                      <div 
                        key={invoice.id}
                        className="p-4 rounded-lg border flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium">{invoice.invoice_number}</p>
                          <p className="text-sm text-muted-foreground">{invoice.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(invoice.created_at).toLocaleDateString("ar-EG")}
                          </p>
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-lg">{invoice.amount} ج.م</p>
                          {getInvoiceStatusBadge(invoice.status)}
                          {invoice.status === "pending" && (
                            <Button size="sm" className="mt-2" asChild>
                              <Link to={`/client/checkout?invoice=${invoice.id}`}>
                                <CreditCard className="w-4 h-4 ml-1" />
                                دفع
                              </Link>
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Receipt className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">لا توجد فواتير حتى الآن</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Deliveries Tab */}
          <TabsContent value="deliveries">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">التسليمات</CardTitle>
                <CardDescription>تسليمات الفريق المعتمدة</CardDescription>
              </CardHeader>
              <CardContent>
                {deliveries.length > 0 ? (
                  <div className="space-y-4">
                    {deliveries.map((delivery: any) => (
                      <div 
                        key={delivery.id}
                        className="p-4 rounded-lg border"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-medium">{delivery.brand_tasks?.title || "تسليم"}</p>
                            {delivery.notes && (
                              <p className="text-sm text-muted-foreground mt-1">{delivery.notes}</p>
                            )}
                          </div>
                          <Badge className="bg-green-100 text-green-700">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            معتمد
                          </Badge>
                        </div>
                        {(delivery.files as any[])?.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {(delivery.files as any[]).map((file: any, idx: number) => (
                              <Button
                                key={idx}
                                variant="outline"
                                size="sm"
                                asChild
                              >
                                <a href={file.url} target="_blank" rel="noopener noreferrer">
                                  <Download className="w-3 h-3 ml-1" />
                                  {file.name || `ملف ${idx + 1}`}
                                </a>
                              </Button>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-3">
                          {new Date(delivery.created_at).toLocaleDateString("ar-EG")}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">لا توجد تسليمات معتمدة بعد</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Brand Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>تعديل بيانات البراند</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>اسم البراند</Label>
              <Input
                value={editData.name || ""}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>المجال</Label>
              <Input
                value={editData.industry || ""}
                onChange={(e) => setEditData({ ...editData, industry: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>الوصف</Label>
              <Textarea
                value={editData.description || ""}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>الموقع الإلكتروني</Label>
              <Input
                value={editData.website || ""}
                onChange={(e) => setEditData({ ...editData, website: e.target.value })}
                dir="ltr"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>اللون الرئيسي</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={editData.colors?.primary || "#3b82f6"}
                    onChange={(e) => setEditData({ 
                      ...editData, 
                      colors: { ...editData.colors, primary: e.target.value } 
                    })}
                    className="w-10 h-10 rounded border cursor-pointer"
                  />
                  <Input
                    value={editData.colors?.primary || "#3b82f6"}
                    onChange={(e) => setEditData({ 
                      ...editData, 
                      colors: { ...editData.colors, primary: e.target.value } 
                    })}
                    className="flex-1"
                    dir="ltr"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>اللون الثانوي</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={editData.colors?.secondary || "#10b981"}
                    onChange={(e) => setEditData({ 
                      ...editData, 
                      colors: { ...editData.colors, secondary: e.target.value } 
                    })}
                    className="w-10 h-10 rounded border cursor-pointer"
                  />
                  <Input
                    value={editData.colors?.secondary || "#10b981"}
                    onChange={(e) => setEditData({ 
                      ...editData, 
                      colors: { ...editData.colors, secondary: e.target.value } 
                    })}
                    className="flex-1"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              إلغاء
            </Button>
            <Button 
              onClick={() => updateBrandMutation.mutate(editData)}
              disabled={updateBrandMutation.isPending}
            >
              {updateBrandMutation.isPending && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
              <Save className="w-4 h-4 ml-2" />
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Goal Dialog */}
      <Dialog open={showGoalDialog} onOpenChange={setShowGoalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة هدف جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>عنوان الهدف *</Label>
              <Input
                value={newGoal.title}
                onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                placeholder="مثال: تصميم شعار جديد"
              />
            </div>
            <div className="space-y-2">
              <Label>الوصف (اختياري)</Label>
              <Textarea
                value={newGoal.description}
                onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                placeholder="تفاصيل إضافية عن الهدف..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGoalDialog(false)}>
              إلغاء
            </Button>
            <Button 
              onClick={() => addGoalMutation.mutate()}
              disabled={!newGoal.title || addGoalMutation.isPending}
            >
              {addGoalMutation.isPending && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
              إضافة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
