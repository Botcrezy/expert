import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  GraduationCap, 
  Plus, 
  Edit, 
  Trash2, 
  Loader2,
  BookOpen,
  Star,
  Users,
  Settings,
  DollarSign,
  Video,
  Briefcase
} from "lucide-react";
import { Link } from "react-router-dom";

const defaultFormData = {
  name: "",
  name_ar: "",
  description: "",
  description_ar: "",
  level: "beginner",
  icon: "book",
  required_stars: 0,
  is_active: true,
  is_free: true,
  price: 0,
  audience: "all",
  target_categories: [] as string[],
  video_intro_type: "none",
  video_intro_url: "",
};

export default function AdminLearningTracks() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingTrack, setEditingTrack] = useState<any>(null);
  const [formData, setFormData] = useState(defaultFormData);

  const { data: tracks, isLoading } = useQuery({
    queryKey: ["admin-learning-tracks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("learning_tracks")
        .select("*, learning_modules(count)")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

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

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const trackData = {
        ...data,
        target_categories: data.target_categories?.length > 0 ? data.target_categories : null,
      };
      if (editingTrack) {
        const { error } = await supabase
          .from("learning_tracks")
          .update(trackData)
          .eq("id", editingTrack.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("learning_tracks")
          .insert(trackData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-learning-tracks"] });
      toast({ title: editingTrack ? "تم تحديث المسار ✅" : "تم إضافة المسار ✅" });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({ title: "حدث خطأ", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("learning_tracks")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-learning-tracks"] });
      toast({ title: "تم حذف المسار ✅" });
    },
    onError: (error: any) => {
      toast({ title: "حدث خطأ", description: error.message, variant: "destructive" });
    },
  });

  const handleOpenDialog = (track?: any) => {
    if (track) {
      setEditingTrack(track);
      setFormData({
        name: track.name,
        name_ar: track.name_ar,
        description: track.description || "",
        description_ar: track.description_ar || "",
        level: track.level,
        icon: track.icon || "book",
        required_stars: track.required_stars || 0,
        is_active: track.is_active ?? true,
        is_free: track.is_free ?? true,
        price: track.price || 0,
        audience: track.audience || "all",
        target_categories: track.target_categories || [],
        video_intro_type: track.video_intro_type || "none",
        video_intro_url: track.video_intro_url || "",
      });
    } else {
      setEditingTrack(null);
      setFormData(defaultFormData);
    }
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingTrack(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleCategoryToggle = (categoryId: string) => {
    setFormData(prev => ({
      ...prev,
      target_categories: prev.target_categories.includes(categoryId)
        ? prev.target_categories.filter(id => id !== categoryId)
        : [...prev.target_categories, categoryId]
    }));
  };

  const getLevelBadge = (level: string) => {
    switch (level) {
      case "beginner":
        return <Badge className="bg-green-100 text-green-700">مبتدئ</Badge>;
      case "intermediate":
        return <Badge className="bg-yellow-100 text-yellow-700">متوسط</Badge>;
      case "advanced":
        return <Badge className="bg-red-100 text-red-700">متقدم</Badge>;
      default:
        return <Badge variant="outline">{level}</Badge>;
    }
  };

  const getAudienceLabel = (audience: string) => {
    switch (audience) {
      case "freelancers": return "فريلانسرز فقط";
      case "clients": return "عملاء فقط";
      case "both": return "الجميع";
      default: return "الكل";
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout sidebar={<AdminSidebar />} title="المسارات التعليمية">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      sidebar={<AdminSidebar />}
      title="Sity Expert Studio"
      subtitle="إدارة المسارات التعليمية والتدريبية"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-semibold">المسارات التعليمية</h2>
          <Badge variant="secondary">{tracks?.length || 0}</Badge>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4" />
          مسار جديد
        </Button>
      </div>

      {tracks && tracks.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {tracks.map((track: any) => (
            <Card key={track.id} className={`hover:shadow-lg transition-shadow ${!track.is_active && 'opacity-60'}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <GraduationCap className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{track.name_ar}</CardTitle>
                      <p className="text-sm text-muted-foreground">{track.name}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    {getLevelBadge(track.level)}
                    {track.is_free ? (
                      <Badge variant="outline" className="text-green-600">مجاني</Badge>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-700">{track.price} ج.م</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {track.description_ar || track.description || "لا يوجد وصف"}
                </p>
                
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-4 h-4" />
                    {(track as any).learning_modules?.[0]?.count || 0} موديول
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500" />
                    {track.required_stars} نجمة
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {getAudienceLabel(track.audience)}
                  </span>
                  {track.video_intro_url && (
                    <span className="flex items-center gap-1">
                      <Video className="w-4 h-4 text-blue-500" />
                      فيديو
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t">
                  <Button variant="outline" size="sm" asChild className="flex-1">
                    <Link to={`/admin/studio/tracks/${track.id}`}>
                      <Settings className="w-4 h-4" />
                      إدارة
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(track)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-destructive"
                    onClick={() => {
                      if (confirm("هل أنت متأكد من حذف هذا المسار؟")) {
                        deleteMutation.mutate(track.id);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <GraduationCap className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">لا توجد مسارات تعليمية</h3>
          <p className="text-muted-foreground mb-4">ابدأ بإضافة مسار تعليمي جديد</p>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="w-4 h-4" />
            إضافة مسار
          </Button>
        </div>
      )}

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTrack ? "تعديل المسار" : "إضافة مسار جديد"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Names */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>الاسم (English)</Label>
                <Input 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>الاسم (عربي)</Label>
                <Input 
                  value={formData.name_ar}
                  onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                  required
                />
              </div>
            </div>
            
            <div>
              <Label>الوصف (عربي)</Label>
              <Textarea 
                value={formData.description_ar}
                onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
                rows={2}
              />
            </div>
            
            {/* Level and Stars */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>المستوى</Label>
                <Select value={formData.level} onValueChange={(v) => setFormData({ ...formData, level: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">مبتدئ</SelectItem>
                    <SelectItem value="intermediate">متوسط</SelectItem>
                    <SelectItem value="advanced">متقدم</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>النجوم المطلوبة للفتح</Label>
                <Input 
                  type="number"
                  value={formData.required_stars}
                  onChange={(e) => setFormData({ ...formData, required_stars: parseInt(e.target.value) || 0 })}
                  min={0}
                />
              </div>
            </div>

            {/* Pricing */}
            <div className="p-4 border rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-muted-foreground" />
                  <Label className="text-base font-semibold">التسعير</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Label>مجاني</Label>
                  <Switch 
                    checked={formData.is_free}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_free: checked, price: checked ? 0 : formData.price })}
                  />
                </div>
              </div>
              {!formData.is_free && (
                <div>
                  <Label>السعر (ج.م)</Label>
                  <Input 
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    min={0}
                    placeholder="0"
                  />
                  <p className="text-xs text-muted-foreground mt-1">سيتم إنشاء منتج مرتبط بالكورس تلقائياً</p>
                </div>
              )}
            </div>

            {/* Audience */}
            <div className="p-4 border rounded-lg space-y-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-muted-foreground" />
                <Label className="text-base font-semibold">الجمهور المستهدف</Label>
              </div>
              <Select value={formData.audience} onValueChange={(v) => setFormData({ ...formData, audience: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل (عملاء + فريلانسرز)</SelectItem>
                  <SelectItem value="freelancers">فريلانسرز فقط</SelectItem>
                  <SelectItem value="clients">عملاء فقط</SelectItem>
                  <SelectItem value="both">مخصص للاتنين</SelectItem>
                </SelectContent>
              </Select>
              
              {(formData.audience === "freelancers" || formData.audience === "both") && categories && categories.length > 0 && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    تخصصات محددة (اختياري)
                  </Label>
                  <div className="grid grid-cols-2 gap-2 p-3 bg-muted rounded-lg max-h-32 overflow-y-auto">
                    {categories.map((cat: any) => (
                      <div key={cat.id} className="flex items-center gap-2">
                        <Checkbox 
                          id={cat.id}
                          checked={formData.target_categories.includes(cat.id)}
                          onCheckedChange={() => handleCategoryToggle(cat.id)}
                        />
                        <Label htmlFor={cat.id} className="text-sm cursor-pointer">{cat.name_ar}</Label>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">اتركها فارغة لإظهار الكورس لكل التخصصات</p>
                </div>
              )}
            </div>

            {/* Video Intro */}
            <div className="p-4 border rounded-lg space-y-4">
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5 text-muted-foreground" />
                <Label className="text-base font-semibold">فيديو تعريفي</Label>
              </div>
              <Select value={formData.video_intro_type} onValueChange={(v) => setFormData({ ...formData, video_intro_type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون فيديو</SelectItem>
                  <SelectItem value="youtube">رابط يوتيوب</SelectItem>
                  <SelectItem value="mp4">رابط MP4</SelectItem>
                </SelectContent>
              </Select>
              {formData.video_intro_type !== "none" && (
                <Input 
                  value={formData.video_intro_url}
                  onChange={(e) => setFormData({ ...formData, video_intro_url: e.target.value })}
                  placeholder={formData.video_intro_type === "youtube" ? "https://youtube.com/watch?v=..." : "https://...mp4"}
                />
              )}
            </div>

            {/* Active */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <Label>تفعيل المسار</Label>
              <Switch 
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>إلغاء</Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingTrack ? "حفظ التعديلات" : "إضافة المسار"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}