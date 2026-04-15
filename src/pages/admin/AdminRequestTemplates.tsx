import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Pencil, Trash2, LayoutTemplate } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TemplateForm {
  id?: string;
  name: string;
  name_ar: string;
  category_id: string;
  description_template: string;
  size: string;
  is_active: boolean;
  sort_order: number;
}

const emptyForm: TemplateForm = {
  name: "",
  name_ar: "",
  category_id: "",
  description_template: "",
  size: "small",
  is_active: true,
  sort_order: 0,
};

export default function AdminRequestTemplates() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<TemplateForm>(emptyForm);
  const [editing, setEditing] = useState(false);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["admin-request-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("request_templates")
        .select("*, categories(name_ar)")
        .order("sort_order");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["admin-categories-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("id, name_ar")
        .eq("is_active", true)
        .order("sort_order");
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: TemplateForm) => {
      const payload = {
        name: data.name,
        name_ar: data.name_ar,
        category_id: data.category_id || null,
        description_template: data.description_template || null,
        size: data.size,
        is_active: data.is_active,
        sort_order: data.sort_order,
      };

      if (data.id) {
        const { error } = await supabase
          .from("request_templates")
          .update(payload)
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("request_templates")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-request-templates"] });
      setDialogOpen(false);
      setForm(emptyForm);
      toast({ title: editing ? "تم تحديث القالب" : "تم إنشاء القالب بنجاح" });
    },
    onError: (err: any) => {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("request_templates")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-request-templates"] });
      toast({ title: "تم حذف القالب" });
    },
  });

  const openCreate = () => {
    setForm(emptyForm);
    setEditing(false);
    setDialogOpen(true);
  };

  const openEdit = (t: any) => {
    setForm({
      id: t.id,
      name: t.name,
      name_ar: t.name_ar,
      category_id: t.category_id || "",
      description_template: t.description_template || "",
      size: t.size || "small",
      is_active: t.is_active,
      sort_order: t.sort_order || 0,
    });
    setEditing(true);
    setDialogOpen(true);
  };

  const sizeLabels: Record<string, string> = {
    micro: "صغيرة جداً",
    small: "صغيرة",
    medium: "متوسطة",
    large: "كبيرة",
  };

  return (
    <DashboardLayout
      sidebar={<AdminSidebar />}
      title="قوالب الطلبات"
      subtitle="إدارة القوالب الجاهزة لأنواع الطلبات الشائعة"
    >
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <LayoutTemplate className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">القوالب ({templates.length})</h2>
          </div>
          <Button onClick={openCreate} size="sm">
            <Plus className="w-4 h-4 ml-2" />
            قالب جديد
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : templates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              لا توجد قوالب بعد. أنشئ أول قالب لتسهيل إنشاء الطلبات على العملاء.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>التصنيف</TableHead>
                  <TableHead>الحجم</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الترتيب</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{t.name_ar}</div>
                        <div className="text-xs text-muted-foreground">{t.name}</div>
                      </div>
                    </TableCell>
                    <TableCell>{t.categories?.name_ar || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{sizeLabels[t.size] || t.size}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={t.is_active ? "default" : "secondary"}>
                        {t.is_active ? "نشط" : "معطل"}
                      </Badge>
                    </TableCell>
                    <TableCell>{t.sort_order}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(t)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => {
                            if (confirm("حذف هذا القالب؟")) deleteMutation.mutate(t.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "تعديل القالب" : "قالب جديد"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>الاسم (EN)</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Logo Design"
                />
              </div>
              <div>
                <Label>الاسم (AR)</Label>
                <Input
                  value={form.name_ar}
                  onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
                  placeholder="تصميم شعار"
                />
              </div>
            </div>

            <div>
              <Label>التصنيف</Label>
              <Select
                value={form.category_id}
                onValueChange={(v) => setForm({ ...form, category_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر التصنيف" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name_ar}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>وصف القالب</Label>
              <Textarea
                value={form.description_template}
                onChange={(e) => setForm({ ...form, description_template: e.target.value })}
                placeholder="وصف تفصيلي يُملأ تلقائياً عند اختيار القالب..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>الحجم الافتراضي</Label>
                <Select
                  value={form.size}
                  onValueChange={(v) => setForm({ ...form, size: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="micro">صغيرة جداً</SelectItem>
                    <SelectItem value="small">صغيرة</SelectItem>
                    <SelectItem value="medium">متوسطة</SelectItem>
                    <SelectItem value="large">كبيرة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>الترتيب</Label>
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
              <Label>نشط</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              إلغاء
            </Button>
            <Button
              onClick={() => saveMutation.mutate(form)}
              disabled={!form.name || !form.name_ar || saveMutation.isPending}
            >
              {saveMutation.isPending && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
              {editing ? "تحديث" : "إنشاء"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
