import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, 
  Pencil, 
  Trash2,
  Menu,
  GripVertical,
  ExternalLink,
  Loader2,
  LayoutGrid,
  Link as LinkIcon,
  Eye,
  EyeOff,
  Users,
  UserX,
  Globe
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AdminNavigation() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("header");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [form, setForm] = useState({
    label: "",
    label_ar: "",
    url: "",
    location: "header",
    target: "_self",
    is_active: true,
    sort_order: 0,
    visibility: "all" as "all" | "guest" | "authenticated",
  });

  // Fetch navigation items
  const { data: navItems, isLoading } = useQuery({
    queryKey: ["admin-navigation"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("navigation_items")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data || [];
    },
  });

  // Mutation
  const mutation = useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: any }) => {
      if (id) {
        const { error } = await supabase.from("navigation_items").update(data).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("navigation_items").insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-navigation"] });
      queryClient.invalidateQueries({ queryKey: ["navigation-items"] });
      toast({ title: "تم حفظ الرابط بنجاح ✅" });
      setDialogOpen(false);
      setEditingItem(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("navigation_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-navigation"] });
      queryClient.invalidateQueries({ queryKey: ["navigation-items"] });
      toast({ title: "تم حذف الرابط ✅" });
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setForm({
      label: "",
      label_ar: "",
      url: "",
      location: activeTab,
      target: "_self",
      is_active: true,
      sort_order: 0,
      visibility: "all",
    });
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setForm({
      label: item.label,
      label_ar: item.label_ar,
      url: item.url,
      location: item.location,
      target: item.target || "_self",
      is_active: item.is_active,
      sort_order: item.sort_order,
      visibility: item.visibility || "all",
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    mutation.mutate({
      id: editingItem?.id,
      data: form,
    });
  };

  const headerItems = navItems?.filter((i) => i.location === "header") || [];
  const footerItems = navItems?.filter((i) => i.location === "footer") || [];

  const getVisibilityBadge = (visibility: string) => {
    switch (visibility) {
      case "guest":
        return (
          <Badge variant="outline" className="gap-1 text-orange-600 border-orange-600">
            <UserX className="w-3 h-3" />
            زوار فقط
          </Badge>
        );
      case "authenticated":
        return (
          <Badge variant="outline" className="gap-1 text-blue-600 border-blue-600">
            <Users className="w-3 h-3" />
            مسجلين فقط
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1 text-green-600 border-green-600">
            <Globe className="w-3 h-3" />
            الجميع
          </Badge>
        );
    }
  };

  const renderTable = (items: any[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">الترتيب</TableHead>
          <TableHead>العنوان</TableHead>
          <TableHead>الرابط</TableHead>
          <TableHead>الظهور</TableHead>
          <TableHead>الهدف</TableHead>
          <TableHead>الحالة</TableHead>
          <TableHead className="text-left">الإجراءات</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
              لا توجد روابط بعد
            </TableCell>
          </TableRow>
        ) : (
          items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                  {item.sort_order}
                </div>
              </TableCell>
              <TableCell>
                <div>
                  <div className="font-medium">{item.label_ar}</div>
                  <div className="text-xs text-muted-foreground">{item.label}</div>
                </div>
              </TableCell>
              <TableCell>
                <code className="text-xs bg-muted px-2 py-1 rounded">{item.url}</code>
              </TableCell>
              <TableCell>
                {getVisibilityBadge(item.visibility || "all")}
              </TableCell>
              <TableCell>
                {item.target === "_blank" ? (
                  <Badge variant="outline" className="gap-1">
                    <ExternalLink className="w-3 h-3" /> جديدة
                  </Badge>
                ) : (
                  <Badge variant="secondary">نفسها</Badge>
                )}
              </TableCell>
              <TableCell>
                <Badge variant={item.is_active ? "default" : "secondary"}>
                  {item.is_active ? "مفعل" : "معطل"}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" onClick={() => handleEdit(item)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      if (confirm("هل أنت متأكد من حذف هذا الرابط؟")) {
                        deleteMutation.mutate(item.id);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <DashboardLayout
      sidebar={<AdminSidebar />}
      title="إدارة القوائم"
      subtitle="التحكم في روابط Header و Footer"
    >
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between mb-6">
          <TabsList>
            <TabsTrigger value="header" className="gap-2">
              <Menu className="w-4 h-4" />
              قائمة Header
            </TabsTrigger>
            <TabsTrigger value="footer" className="gap-2">
              <LayoutGrid className="w-4 h-4" />
              قائمة Footer
            </TabsTrigger>
          </TabsList>

          <Button
            onClick={() => {
              resetForm();
              setForm((f) => ({ ...f, location: activeTab }));
              setDialogOpen(true);
            }}
          >
            <Plus className="w-4 h-4 ml-2" />
            إضافة رابط
          </Button>
        </div>

        {/* Preview Section */}
        <div className="mb-6 p-4 bg-muted/50 rounded-xl">
          <h4 className="text-sm font-medium mb-3">معاينة القائمة:</h4>
          <div className="flex flex-wrap gap-3">
            {activeTab === "header" ? (
              headerItems.length > 0 ? (
                headerItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <Badge variant={item.is_active ? "default" : "secondary"}>
                      {item.label_ar}
                    </Badge>
                    {item.visibility === "guest" && <EyeOff className="w-3 h-3 text-orange-500" />}
                    {item.visibility === "authenticated" && <Eye className="w-3 h-3 text-blue-500" />}
                  </div>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">لا توجد روابط - سيتم استخدام الروابط الافتراضية</span>
              )
            ) : (
              footerItems.length > 0 ? (
                footerItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <Badge variant={item.is_active ? "default" : "secondary"}>
                      {item.label_ar}
                    </Badge>
                    {item.visibility === "guest" && <EyeOff className="w-3 h-3 text-orange-500" />}
                    {item.visibility === "authenticated" && <Eye className="w-3 h-3 text-blue-500" />}
                  </div>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">لا توجد روابط - سيتم استخدام الروابط الافتراضية</span>
              )
            )}
          </div>
        </div>

        <div className="card-elevated">
          <TabsContent value="header" className="m-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : (
              renderTable(headerItems)
            )}
          </TabsContent>

          <TabsContent value="footer" className="m-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : (
              renderTable(footerItems)
            )}
          </TabsContent>
        </div>
      </Tabs>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? "تعديل الرابط" : "إضافة رابط جديد"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>العنوان بالعربية *</Label>
                <Input
                  value={form.label_ar}
                  onChange={(e) => setForm({ ...form, label_ar: e.target.value })}
                  placeholder="الرئيسية"
                />
              </div>
              <div className="space-y-2">
                <Label>العنوان بالإنجليزية</Label>
                <Input
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  placeholder="Home"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>الرابط *</Label>
              <div className="flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-muted-foreground" />
                <Input
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  placeholder="/services أو https://example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>ظهور الرابط</Label>
              <Select value={form.visibility} onValueChange={(v: "all" | "guest" | "authenticated") => setForm({ ...form, visibility: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-green-600" />
                      للجميع
                    </div>
                  </SelectItem>
                  <SelectItem value="guest">
                    <div className="flex items-center gap-2">
                      <UserX className="w-4 h-4 text-orange-600" />
                      الزوار فقط (غير مسجلين)
                    </div>
                  </SelectItem>
                  <SelectItem value="authenticated">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-600" />
                      المسجلين فقط
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                مثال: رابط "تسجيل الدخول" يظهر للزوار فقط، ورابط "لوحة التحكم" يظهر للمسجلين فقط
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>الموقع</Label>
                <Select value={form.location} onValueChange={(v) => setForm({ ...form, location: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="header">Header</SelectItem>
                    <SelectItem value="footer">Footer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>فتح في</Label>
                <Select value={form.target} onValueChange={(v) => setForm({ ...form, target: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_self">نفس النافذة</SelectItem>
                    <SelectItem value="_blank">نافذة جديدة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>ترتيب العرض</Label>
              <Input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>مفعل</Label>
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
            </div>

            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={mutation.isPending || !form.label_ar || !form.url}
            >
              {mutation.isPending ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : null}
              {editingItem ? "تحديث" : "إضافة"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}