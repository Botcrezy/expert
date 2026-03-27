import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { usePlatformSettings, useUpdatePlatformSettings } from "@/hooks/usePlatformSettings";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Plus, 
  Pencil, 
  Trash2,
  FileEdit,
  FolderTree,
  Globe,
  LayoutTemplate,
  Loader2,
  Eye,
  EyeOff,
  Settings,
  Upload,
  Image as ImageIcon,
  Save
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AdminCMS() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("settings");
  const { data: platformSettings, isLoading: settingsLoading } = usePlatformSettings();
  const updateSettings = useUpdatePlatformSettings();
  const [uploading, setUploading] = useState(false);
  
  // Platform settings form
  const [settingsForm, setSettingsForm] = useState({
    siteName: "Sity Experts",
    siteDescription: "منصة خدمات مُدارة باحترافية",
    supportEmail: "support@sityexperts.com",
    logoUrl: "",
    taxRate: "14",
    minWithdrawal: "100",
    autoAssignment: true,
    emailNotifications: true,
    maintenanceMode: false,
    bankTransferDetails: "",
    mobileWalletDetails: "",
  });

  useEffect(() => {
    if (platformSettings) {
      setSettingsForm({
        siteName: platformSettings.siteName || "Sity Experts",
        siteDescription: platformSettings.siteDescription || "",
        supportEmail: platformSettings.supportEmail || "",
        logoUrl: platformSettings.logoUrl || "",
        taxRate: String(platformSettings.taxRate || 14),
        minWithdrawal: String(platformSettings.minWithdrawal || 100),
        autoAssignment: platformSettings.autoAssignment ?? true,
        emailNotifications: platformSettings.emailNotifications ?? true,
        maintenanceMode: platformSettings.maintenanceMode ?? false,
        bankTransferDetails: platformSettings.bankTransferDetails || "",
        mobileWalletDetails: platformSettings.mobileWalletDetails || "",
      });
    }
  }, [platformSettings]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const filePath = `platform/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setSettingsForm(prev => ({ ...prev, logoUrl: publicUrl }));
      toast({ title: "تم رفع الشعار بنجاح ✅" });
    } catch (error: any) {
      toast({
        title: "خطأ في رفع الشعار",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const saveSettings = () => {
    updateSettings.mutate({
      siteName: settingsForm.siteName,
      siteDescription: settingsForm.siteDescription,
      supportEmail: settingsForm.supportEmail,
      logoUrl: settingsForm.logoUrl,
      taxRate: parseInt(settingsForm.taxRate) || 14,
      minWithdrawal: parseInt(settingsForm.minWithdrawal) || 100,
      autoAssignment: settingsForm.autoAssignment,
      emailNotifications: settingsForm.emailNotifications,
      maintenanceMode: settingsForm.maintenanceMode,
      bankTransferDetails: settingsForm.bankTransferDetails,
      mobileWalletDetails: settingsForm.mobileWalletDetails,
    });
  };
  
  // Category state
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    name_ar: "",
    description: "",
    icon: "",
    is_active: true,
    sort_order: 0,
  });

  // Page state
  const [pageDialogOpen, setPageDialogOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<any>(null);
  const [pageForm, setPageForm] = useState({
    slug: "",
    title: "",
    title_ar: "",
    meta_title: "",
    meta_description: "",
    is_published: false,
    sort_order: 0,
  });

  // Section state
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<any>(null);
  const [sectionForm, setSectionForm] = useState({
    key: "",
    title: "",
    title_ar: "",
    content: "",
    content_ar: "",
    is_active: true,
    sort_order: 0,
  });

  // Fetch categories
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("*")
        .order("sort_order");
      return data || [];
    },
  });

  // Fetch CMS pages
  const { data: pages, isLoading: pagesLoading } = useQuery({
    queryKey: ["admin-cms-pages"],
    queryFn: async () => {
      const { data } = await supabase
        .from("cms_pages")
        .select("*")
        .order("sort_order");
      return data || [];
    },
  });

  // Fetch CMS sections
  const { data: sections, isLoading: sectionsLoading } = useQuery({
    queryKey: ["admin-cms-sections"],
    queryFn: async () => {
      const { data } = await supabase
        .from("cms_sections")
        .select("*")
        .order("sort_order");
      return data || [];
    },
  });

  // Category mutations
  const categoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: any }) => {
      if (id) {
        const { error } = await supabase.from("categories").update(data).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("categories").insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      toast({ title: "تم حفظ التصنيف بنجاح ✅" });
      setCategoryDialogOpen(false);
      setEditingCategory(null);
      resetCategoryForm();
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      toast({ title: "تم حذف التصنيف ✅" });
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    },
  });

  // Page mutations
  const pageMutation = useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: any }) => {
      if (id) {
        const { error } = await supabase.from("cms_pages").update(data).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("cms_pages").insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-cms-pages"] });
      toast({ title: "تم حفظ الصفحة بنجاح ✅" });
      setPageDialogOpen(false);
      setEditingPage(null);
      resetPageForm();
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    },
  });

  const deletePageMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cms_pages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-cms-pages"] });
      toast({ title: "تم حذف الصفحة ✅" });
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    },
  });

  const sectionMutation = useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: any }) => {
      if (id) {
        const { error } = await supabase.from("cms_sections").update(data).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("cms_sections").insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-cms-sections"] });
      toast({ title: "تم حفظ القسم بنجاح ✅" });
      setSectionDialogOpen(false);
      setEditingSection(null);
      resetSectionForm();
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    },
  });

  const deleteSectionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cms_sections").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-cms-sections"] });
      toast({ title: "تم حذف القسم ✅" });
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    },
  });

  const resetCategoryForm = () => {
    setCategoryForm({ name: "", name_ar: "", description: "", icon: "", is_active: true, sort_order: 0 });
  };

  const resetPageForm = () => {
    setPageForm({ slug: "", title: "", title_ar: "", meta_title: "", meta_description: "", is_published: false, sort_order: 0 });
  };

  const resetSectionForm = () => {
    setSectionForm({ key: "", title: "", title_ar: "", content: "", content_ar: "", is_active: true, sort_order: 0 });
  };

  const handleEditCategory = (category: any) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      name_ar: category.name_ar,
      description: category.description || "",
      icon: category.icon || "",
      is_active: category.is_active,
      sort_order: category.sort_order,
    });
    setCategoryDialogOpen(true);
  };

  const handleEditPage = (page: any) => {
    setEditingPage(page);
    setPageForm({
      slug: page.slug,
      title: page.title,
      title_ar: page.title_ar,
      meta_title: page.meta_title || "",
      meta_description: page.meta_description || "",
      is_published: page.is_published,
      sort_order: page.sort_order,
    });
    setPageDialogOpen(true);
  };

  const handleEditSection = (section: any) => {
    setEditingSection(section);
    setSectionForm({
      key: section.key,
      title: section.title || "",
      title_ar: section.title_ar || "",
      content: section.content || "",
      content_ar: section.content_ar || "",
      is_active: section.is_active,
      sort_order: section.sort_order,
    });
    setSectionDialogOpen(true);
  };

  return (
    <DashboardLayout
      sidebar={<AdminSidebar />}
      title="إدارة المحتوى (CMS)"
      subtitle="إدارة الصفحات والأقسام والتصنيفات"
    >
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 flex-wrap">
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="w-4 h-4" />
            الإعدادات العامة
          </TabsTrigger>
          <TabsTrigger value="pages" className="gap-2">
            <Globe className="w-4 h-4" />
            الصفحات
          </TabsTrigger>
          <TabsTrigger value="sections" className="gap-2">
            <LayoutTemplate className="w-4 h-4" />
            الأقسام
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-2">
            <FolderTree className="w-4 h-4" />
            التصنيفات
          </TabsTrigger>
        </TabsList>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <div className="space-y-6">
            {/* Site Identity */}
            <div className="card-elevated p-6">
              <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                هوية الموقع
              </h3>
              
              {/* Logo Upload */}
              <div className="space-y-3 mb-6">
                <Label>شعار المنصة</Label>
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-muted/50 overflow-hidden">
                    {settingsForm.logoUrl ? (
                      <img src={settingsForm.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <ImageIcon className="w-10 h-10 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                        disabled={uploading}
                      />
                      <Button type="button" variant="outline" size="sm" disabled={uploading} asChild>
                        <span>
                          {uploading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Upload className="w-4 h-4" />
                          )}
                          {uploading ? "جاري الرفع..." : "رفع شعار جديد"}
                        </span>
                      </Button>
                    </label>
                    <p className="text-xs text-muted-foreground mt-2">PNG, JPG, SVG (حد أقصى 2MB)</p>
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>اسم الموقع</Label>
                  <Input
                    value={settingsForm.siteName}
                    onChange={(e) => setSettingsForm({ ...settingsForm, siteName: e.target.value })}
                    placeholder="اسم المنصة"
                  />
                </div>
                <div className="space-y-2">
                  <Label>بريد الدعم</Label>
                  <Input
                    type="email"
                    value={settingsForm.supportEmail}
                    onChange={(e) => setSettingsForm({ ...settingsForm, supportEmail: e.target.value })}
                    placeholder="support@example.com"
                  />
                </div>
              </div>

              <div className="space-y-2 mt-4">
                <Label>وصف الموقع</Label>
                <Textarea
                  value={settingsForm.siteDescription}
                  onChange={(e) => setSettingsForm({ ...settingsForm, siteDescription: e.target.value })}
                  rows={3}
                  placeholder="وصف مختصر للمنصة يظهر في الصفحة الرئيسية"
                />
              </div>
            </div>

            {/* Payment Settings */}
            <div className="card-elevated p-6">
              <h3 className="text-lg font-semibold mb-6">إعدادات الدفع</h3>
              
              <div className="grid sm:grid-cols-2 gap-6 mb-6">
                <div className="space-y-2">
                  <Label>نسبة الضريبة (%)</Label>
                  <Input
                    type="number"
                    value={settingsForm.taxRate}
                    onChange={(e) => setSettingsForm({ ...settingsForm, taxRate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>الحد الأدنى للسحب (ج.م)</Label>
                  <Input
                    type="number"
                    value={settingsForm.minWithdrawal}
                    onChange={(e) => setSettingsForm({ ...settingsForm, minWithdrawal: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>بيانات التحويل البنكي</Label>
                  <Textarea
                    value={settingsForm.bankTransferDetails}
                    onChange={(e) => setSettingsForm({ ...settingsForm, bankTransferDetails: e.target.value })}
                    rows={3}
                    placeholder="اسم البنك، رقم الحساب، اسم صاحب الحساب"
                  />
                </div>
                <div className="space-y-2">
                  <Label>بيانات المحافظ الإلكترونية</Label>
                  <Textarea
                    value={settingsForm.mobileWalletDetails}
                    onChange={(e) => setSettingsForm({ ...settingsForm, mobileWalletDetails: e.target.value })}
                    rows={3}
                    placeholder="فودافون كاش: 01xxxxxxxxx"
                  />
                </div>
              </div>
            </div>

            {/* System Settings */}
            <div className="card-elevated p-6">
              <h3 className="text-lg font-semibold mb-6">إعدادات النظام</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">التعيين التلقائي</p>
                    <p className="text-sm text-muted-foreground">تعيين المهام تلقائياً للفريلانسرز المتاحين</p>
                  </div>
                  <Switch
                    checked={settingsForm.autoAssignment}
                    onCheckedChange={(checked) => setSettingsForm({ ...settingsForm, autoAssignment: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">إشعارات البريد الإلكتروني</p>
                    <p className="text-sm text-muted-foreground">إرسال إشعارات للمستخدمين عبر البريد</p>
                  </div>
                  <Switch
                    checked={settingsForm.emailNotifications}
                    onCheckedChange={(checked) => setSettingsForm({ ...settingsForm, emailNotifications: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-warning/10 rounded-lg border border-warning/20">
                  <div>
                    <p className="font-medium">وضع الصيانة</p>
                    <p className="text-sm text-muted-foreground">إيقاف الموقع مؤقتاً للصيانة</p>
                  </div>
                  <Switch
                    checked={settingsForm.maintenanceMode}
                    onCheckedChange={(checked) => setSettingsForm({ ...settingsForm, maintenanceMode: checked })}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={saveSettings} disabled={updateSettings.isPending} size="lg">
                {updateSettings.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                حفظ الإعدادات
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Pages Tab */}
        <TabsContent value="pages">
          <div className="card-elevated">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-semibold">صفحات الموقع</h3>
              <Dialog open={pageDialogOpen} onOpenChange={(open) => {
                setPageDialogOpen(open);
                if (!open) { setEditingPage(null); resetPageForm(); }
              }}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4 ml-2" />
                    إضافة صفحة
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>{editingPage ? "تعديل الصفحة" : "إضافة صفحة جديدة"}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>الرابط (Slug)</Label>
                      <Input
                        placeholder="مثال: about-us"
                        value={pageForm.slug}
                        onChange={(e) => setPageForm({ ...pageForm, slug: e.target.value })}
                        dir="ltr"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>العنوان (إنجليزي)</Label>
                        <Input
                          value={pageForm.title}
                          onChange={(e) => setPageForm({ ...pageForm, title: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>العنوان (عربي)</Label>
                        <Input
                          value={pageForm.title_ar}
                          onChange={(e) => setPageForm({ ...pageForm, title_ar: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <Label>عنوان SEO</Label>
                      <Input
                        value={pageForm.meta_title}
                        onChange={(e) => setPageForm({ ...pageForm, meta_title: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>وصف SEO</Label>
                      <Textarea
                        value={pageForm.meta_description}
                        onChange={(e) => setPageForm({ ...pageForm, meta_description: e.target.value })}
                        rows={2}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>منشور</Label>
                      <Switch
                        checked={pageForm.is_published}
                        onCheckedChange={(checked) => setPageForm({ ...pageForm, is_published: checked })}
                      />
                    </div>
                    <Button 
                      onClick={() => pageMutation.mutate({ 
                        id: editingPage?.id, 
                        data: pageForm 
                      })} 
                      className="w-full"
                      disabled={pageMutation.isPending}
                    >
                      {pageMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الصفحة</TableHead>
                  <TableHead>الرابط</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagesLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : pages?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      لا توجد صفحات
                    </TableCell>
                  </TableRow>
                ) : (
                  pages?.map((page) => (
                    <TableRow key={page.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{page.title_ar}</p>
                          <p className="text-sm text-muted-foreground">{page.title}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="text-sm bg-muted px-2 py-1 rounded">/{page.slug}</code>
                          {page.is_published && (
                            <a
                              href={`/${page.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              <Eye className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={page.is_published ? "default" : "secondary"}>
                          {page.is_published ? <><Eye className="w-3 h-3 ml-1" /> منشور</> : <><EyeOff className="w-3 h-3 ml-1" /> مسودة</>}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEditPage(page)} title="تعديل الإعدادات">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => window.location.href = `/admin/cms/page/${page.id}`} title="Page Builder">
                            <LayoutTemplate className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => pageMutation.mutate({ id: page.id, data: { is_published: !page.is_published } })}
                            title={page.is_published ? "إلغاء النشر" : "نشر"}
                          >
                            {page.is_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm("هل أنت متأكد من حذف هذه الصفحة؟")) {
                                deletePageMutation.mutate(page.id);
                              }
                            }}
                            title="حذف"
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
          </div>
        </TabsContent>

        {/* Sections Tab */}
        <TabsContent value="sections">
          <div className="card-elevated">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-semibold">الأقسام القابلة للتعديل</h3>
              <Dialog open={sectionDialogOpen} onOpenChange={(open) => {
                setSectionDialogOpen(open);
                if (!open) { setEditingSection(null); resetSectionForm(); }
              }}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4 ml-2" />
                    إضافة قسم
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>{editingSection ? "تعديل القسم" : "إضافة قسم جديد"}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>المفتاح (Key)</Label>
                      <Input
                        placeholder="مثال: hero_title"
                        value={sectionForm.key}
                        onChange={(e) => setSectionForm({ ...sectionForm, key: e.target.value })}
                        dir="ltr"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>العنوان (إنجليزي)</Label>
                        <Input
                          value={sectionForm.title}
                          onChange={(e) => setSectionForm({ ...sectionForm, title: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>العنوان (عربي)</Label>
                        <Input
                          value={sectionForm.title_ar}
                          onChange={(e) => setSectionForm({ ...sectionForm, title_ar: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <Label>المحتوى (إنجليزي)</Label>
                      <Textarea
                        value={sectionForm.content}
                        onChange={(e) => setSectionForm({ ...sectionForm, content: e.target.value })}
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label>المحتوى (عربي)</Label>
                      <Textarea
                        value={sectionForm.content_ar}
                        onChange={(e) => setSectionForm({ ...sectionForm, content_ar: e.target.value })}
                        rows={3}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>مفعل</Label>
                      <Switch
                        checked={sectionForm.is_active}
                        onCheckedChange={(checked) => setSectionForm({ ...sectionForm, is_active: checked })}
                      />
                    </div>
                    <Button 
                      onClick={() => sectionMutation.mutate({ 
                        id: editingSection?.id, 
                        data: sectionForm 
                      })} 
                      className="w-full"
                      disabled={sectionMutation.isPending}
                    >
                      {sectionMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المفتاح</TableHead>
                  <TableHead>المحتوى</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sectionsLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : sections?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      لا توجد أقسام
                    </TableCell>
                  </TableRow>
                ) : (
                  sections?.map((section) => (
                    <TableRow key={section.id}>
                      <TableCell>
                        <code className="text-sm bg-muted px-2 py-1 rounded">{section.key}</code>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <p className="truncate">{section.content_ar || section.content || "-"}</p>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={section.is_active}
                          onCheckedChange={(checked) => sectionMutation.mutate({ id: section.id, data: { is_active: checked } })}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEditSection(section)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => deleteSectionMutation.mutate(section.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories">
          <div className="card-elevated">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-semibold">تصنيفات الخدمات</h3>
              <Dialog open={categoryDialogOpen} onOpenChange={(open) => {
                setCategoryDialogOpen(open);
                if (!open) { setEditingCategory(null); resetCategoryForm(); }
              }}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4 ml-2" />
                    إضافة تصنيف
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>{editingCategory ? "تعديل التصنيف" : "إضافة تصنيف جديد"}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>الاسم (إنجليزي)</Label>
                        <Input
                          value={categoryForm.name}
                          onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>الاسم (عربي)</Label>
                        <Input
                          value={categoryForm.name_ar}
                          onChange={(e) => setCategoryForm({ ...categoryForm, name_ar: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <Label>الوصف</Label>
                      <Textarea
                        value={categoryForm.description}
                        onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>الأيقونة</Label>
                        <Input
                          placeholder="مثال: Palette"
                          value={categoryForm.icon}
                          onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>الترتيب</Label>
                        <Input
                          type="number"
                          value={categoryForm.sort_order}
                          onChange={(e) => setCategoryForm({ ...categoryForm, sort_order: Number(e.target.value) })}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>مفعل</Label>
                      <Switch
                        checked={categoryForm.is_active}
                        onCheckedChange={(checked) => setCategoryForm({ ...categoryForm, is_active: checked })}
                      />
                    </div>
                    <Button 
                      onClick={() => categoryMutation.mutate({ 
                        id: editingCategory?.id, 
                        data: categoryForm 
                      })} 
                      className="w-full"
                      disabled={categoryMutation.isPending}
                    >
                      {categoryMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>التصنيف</TableHead>
                  <TableHead>الوصف</TableHead>
                  <TableHead>الترتيب</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoriesLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : categories?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      لا توجد تصنيفات
                    </TableCell>
                  </TableRow>
                ) : (
                  categories?.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{category.name_ar}</p>
                          <p className="text-sm text-muted-foreground">{category.name}</p>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {category.description || "-"}
                      </TableCell>
                      <TableCell>{category.sort_order}</TableCell>
                      <TableCell>
                        <Switch
                          checked={category.is_active}
                          onCheckedChange={(checked) => categoryMutation.mutate({ id: category.id, data: { is_active: checked } })}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEditCategory(category)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => deleteCategoryMutation.mutate(category.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
