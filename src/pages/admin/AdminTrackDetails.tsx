import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { 
  ArrowRight,
  BookOpen, 
  Plus, 
  Edit, 
  Trash2, 
  Loader2,
  Video,
  FileText,
  GraduationCap,
  Star,
  Clock,
  Layers,
  Upload,
  Youtube,
  Briefcase
} from "lucide-react";

export default function AdminTrackDetails() {
  const { trackId } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [showModuleDialog, setShowModuleDialog] = useState(false);
  const [showLessonDialog, setShowLessonDialog] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [editingModule, setEditingModule] = useState<any>(null);
  const [editingLesson, setEditingLesson] = useState<any>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);

  const [moduleForm, setModuleForm] = useState({
    name: "",
    name_ar: "",
    description: "",
    description_ar: "",
    required_stars: 0,
    is_active: true,
  });

  const [lessonForm, setLessonForm] = useState({
    title: "",
    title_ar: "",
    content: "",
    content_ar: "",
    video_type: "none" as "none" | "youtube" | "mp4",
    video_url: "",
    video_file_url: "",
    duration_minutes: 0,
    is_active: true,
  });

  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    requirements: "",
    stars_reward: 1,
    deadline_hours: 24,
    is_mandatory: true,
    difficulty: "easy",
    is_category_specific: false,
    target_categories: [] as string[],
  });

  // Realtime subscriptions
  useRealtimeSubscription([
    { table: "learning_modules", filter: `track_id=eq.${trackId}`, queryKeys: [["admin-track-modules", trackId]] },
    { table: "learning_lessons", queryKeys: [["admin-track-lessons", trackId]] },
    { table: "training_tasks", queryKeys: [["admin-track-tasks", trackId]] },
  ]);

  // Fetch track
  const { data: track, isLoading: trackLoading } = useQuery({
    queryKey: ["admin-track", trackId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("learning_tracks")
        .select("*")
        .eq("id", trackId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!trackId,
  });

  // Fetch modules with lessons
  const { data: modules, isLoading: modulesLoading } = useQuery({
    queryKey: ["admin-track-modules", trackId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("learning_modules")
        .select("*, learning_lessons(*)")
        .eq("track_id", trackId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!trackId,
  });

  // Fetch training tasks linked to this track
  const { data: tasks } = useQuery({
    queryKey: ["admin-track-tasks", trackId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_tasks")
        .select("*")
        .eq("track_id", trackId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!trackId,
  });

  // Fetch categories
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

  // Module mutations
  const saveModuleMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingModule) {
        const { error } = await supabase.from("learning_modules").update(data).eq("id", editingModule.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("learning_modules").insert({ ...data, track_id: trackId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-track-modules", trackId] });
      toast({ title: editingModule ? "تم تحديث الموديول ✅" : "تم إضافة الموديول ✅" });
      handleCloseModuleDialog();
    },
    onError: (error: any) => {
      toast({ title: "حدث خطأ", description: error.message, variant: "destructive" });
    },
  });

  const deleteModuleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("learning_modules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-track-modules", trackId] });
      toast({ title: "تم حذف الموديول ✅" });
    },
  });

  // Lesson mutations
  const saveLessonMutation = useMutation({
    mutationFn: async (data: any) => {
      const lessonData = {
        title: data.title,
        title_ar: data.title_ar,
        content: data.content,
        content_ar: data.content_ar,
        video_type: data.video_type,
        video_url: data.video_type === "youtube" ? data.video_url : null,
        video_file_url: data.video_type === "mp4" ? data.video_file_url : null,
        duration_minutes: data.duration_minutes,
        is_active: data.is_active,
      };
      
      if (editingLesson) {
        const { error } = await supabase.from("learning_lessons").update(lessonData).eq("id", editingLesson.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("learning_lessons").insert({ ...lessonData, module_id: selectedModuleId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-track-modules", trackId] });
      toast({ title: editingLesson ? "تم تحديث الدرس ✅" : "تم إضافة الدرس ✅" });
      handleCloseLessonDialog();
    },
    onError: (error: any) => {
      toast({ title: "حدث خطأ", description: error.message, variant: "destructive" });
    },
  });

  const deleteLessonMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("learning_lessons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-track-modules", trackId] });
      toast({ title: "تم حذف الدرس ✅" });
    },
  });

  // Task mutation
  const saveTaskMutation = useMutation({
    mutationFn: async (data: any) => {
      const taskData = {
        title: data.title,
        description: data.description,
        requirements: data.requirements,
        stars_reward: data.stars_reward,
        deadline_hours: data.deadline_hours,
        is_mandatory: data.is_mandatory,
        difficulty: data.difficulty,
        is_category_specific: data.is_category_specific,
        target_categories: data.is_category_specific && data.target_categories.length > 0 ? data.target_categories : null,
        track_id: trackId,
        module_id: selectedModuleId,
        lesson_id: selectedLessonId,
      };
      const { error } = await supabase.from("training_tasks").insert(taskData);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-track-tasks", trackId] });
      toast({ title: "تم إضافة المهمة التدريبية ✅" });
      handleCloseTaskDialog();
    },
    onError: (error: any) => {
      toast({ title: "حدث خطأ", description: error.message, variant: "destructive" });
    },
  });

  const handleOpenModuleDialog = (module?: any) => {
    if (module) {
      setEditingModule(module);
      setModuleForm({
        name: module.name,
        name_ar: module.name_ar,
        description: module.description || "",
        description_ar: module.description_ar || "",
        required_stars: module.required_stars || 0,
        is_active: module.is_active,
      });
    } else {
      setEditingModule(null);
      setModuleForm({ name: "", name_ar: "", description: "", description_ar: "", required_stars: 0, is_active: true });
    }
    setShowModuleDialog(true);
  };

  const handleCloseModuleDialog = () => {
    setShowModuleDialog(false);
    setEditingModule(null);
  };

  const handleOpenLessonDialog = (moduleId: string, lesson?: any) => {
    setSelectedModuleId(moduleId);
    if (lesson) {
      setEditingLesson(lesson);
      setLessonForm({
        title: lesson.title,
        title_ar: lesson.title_ar,
        content: lesson.content || "",
        content_ar: lesson.content_ar || "",
        video_type: lesson.video_type || "none",
        video_url: lesson.video_url || "",
        video_file_url: lesson.video_file_url || "",
        duration_minutes: lesson.duration_minutes || 0,
        is_active: lesson.is_active,
      });
    } else {
      setEditingLesson(null);
      setLessonForm({ title: "", title_ar: "", content: "", content_ar: "", video_type: "none", video_url: "", video_file_url: "", duration_minutes: 0, is_active: true });
    }
    setShowLessonDialog(true);
  };

  const handleCloseLessonDialog = () => {
    setShowLessonDialog(false);
    setEditingLesson(null);
    setSelectedModuleId(null);
  };

  const handleOpenTaskDialog = (moduleId?: string, lessonId?: string) => {
    setSelectedModuleId(moduleId || null);
    setSelectedLessonId(lessonId || null);
    setTaskForm({ 
      title: "", 
      description: "", 
      requirements: "", 
      stars_reward: 1, 
      deadline_hours: 24, 
      is_mandatory: true, 
      difficulty: "easy",
      is_category_specific: false,
      target_categories: [],
    });
    setShowTaskDialog(true);
  };

  const handleCloseTaskDialog = () => {
    setShowTaskDialog(false);
    setSelectedModuleId(null);
    setSelectedLessonId(null);
  };

  const handleCategoryToggle = (categoryId: string) => {
    setTaskForm(prev => ({
      ...prev,
      target_categories: prev.target_categories.includes(categoryId)
        ? prev.target_categories.filter(id => id !== categoryId)
        : [...prev.target_categories, categoryId]
    }));
  };

  if (trackLoading || modulesLoading) {
    return (
      <DashboardLayout sidebar={<AdminSidebar />} title="تفاصيل المسار">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!track) {
    return (
      <DashboardLayout sidebar={<AdminSidebar />} title="المسار غير موجود">
        <div className="text-center py-20">
          <p className="text-muted-foreground">المسار المطلوب غير موجود</p>
          <Button asChild className="mt-4">
            <Link to="/admin/studio">العودة للمسارات</Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      sidebar={<AdminSidebar />}
      title={track.name_ar}
      subtitle={track.name}
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link to="/admin/studio" className="hover:text-primary transition-colors">Sity Expert Studio</Link>
        <ArrowRight className="w-4 h-4" />
        <span className="text-foreground font-medium">{track.name_ar}</span>
      </div>

      {/* Track Info */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <Badge variant={track.is_free ? "outline" : "default"}>
              {track.is_free ? "مجاني" : `${track.price} ج.م`}
            </Badge>
            <Badge variant="secondary">{track.level === "beginner" ? "مبتدئ" : track.level === "intermediate" ? "متوسط" : "متقدم"}</Badge>
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-500" />
              {track.required_stars} نجمة مطلوبة
            </span>
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <BookOpen className="w-4 h-4" />
              {track.enrollment_count || 0} مشترك
            </span>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="modules" className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="modules" className="gap-2">
              <Layers className="w-4 h-4" />
              الموديولات ({modules?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="tasks" className="gap-2">
              <GraduationCap className="w-4 h-4" />
              المهام التدريبية ({tasks?.length || 0})
            </TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleOpenTaskDialog()}>
              <Plus className="w-4 h-4" />
              مهمة تدريبية
            </Button>
            <Button onClick={() => handleOpenModuleDialog()}>
              <Plus className="w-4 h-4" />
              موديول جديد
            </Button>
          </div>
        </div>

        <TabsContent value="modules" className="space-y-4">
          {modules && modules.length > 0 ? (
            <Accordion type="multiple" className="space-y-4">
              {modules.map((module: any, index: number) => (
                <AccordionItem key={module.id} value={module.id} className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center justify-between w-full pl-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {index + 1}
                        </div>
                        <div className="text-right">
                          <h4 className="font-medium">{module.name_ar}</h4>
                          <p className="text-sm text-muted-foreground">
                            {module.learning_lessons?.length || 0} درس
                            {module.required_stars > 0 && (
                              <span className="mr-2">• يتطلب {module.required_stars} نجمة</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={module.is_active ? "default" : "secondary"}>
                          {module.is_active ? "نشط" : "متوقف"}
                        </Badge>
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleOpenModuleDialog(module); }}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-destructive"
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            if (confirm("هل أنت متأكد؟")) deleteModuleMutation.mutate(module.id); 
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4 pb-2">
                    <div className="space-y-3 pr-11">
                      {module.learning_lessons?.map((lesson: any, lessonIndex: number) => (
                        <div key={lesson.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-xs text-primary font-medium">
                              {lessonIndex + 1}
                            </div>
                            <div>
                              <p className="font-medium">{lesson.title_ar}</p>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                {lesson.video_type === "youtube" && <span className="flex items-center gap-1"><Youtube className="w-3 h-3 text-red-500" /> يوتيوب</span>}
                                {lesson.video_type === "mp4" && <span className="flex items-center gap-1"><Upload className="w-3 h-3 text-blue-500" /> MP4</span>}
                                {lesson.duration_minutes > 0 && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {lesson.duration_minutes} دقيقة</span>}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenTaskDialog(module.id, lesson.id)}>
                              <GraduationCap className="w-4 h-4 text-primary" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenLessonDialog(module.id, lesson)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-destructive"
                              onClick={() => { if (confirm("هل أنت متأكد؟")) deleteLessonMutation.mutate(lesson.id); }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <Button variant="outline" size="sm" className="w-full" onClick={() => handleOpenLessonDialog(module.id)}>
                        <Plus className="w-4 h-4" />
                        إضافة درس
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <div className="text-center py-16 border rounded-lg">
              <Layers className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">لا توجد موديولات</h3>
              <p className="text-muted-foreground mb-4">ابدأ بإضافة موديول جديد</p>
              <Button onClick={() => handleOpenModuleDialog()}>
                <Plus className="w-4 h-4" />
                إضافة موديول
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="tasks">
          {tasks && tasks.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {tasks.map((task: any) => (
                <Card key={task.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{task.title}</CardTitle>
                      <div className="flex flex-col gap-1 items-end">
                        <Badge variant={task.is_mandatory ? "default" : "outline"}>
                          {task.is_mandatory ? "إلزامي" : "اختياري"}
                        </Badge>
                        {task.is_category_specific && (
                          <Badge variant="secondary" className="text-xs">
                            <Briefcase className="w-3 h-3 mr-1" />
                            تخصص محدد
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500" />
                        {task.stars_reward}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        {task.deadline_hours}س
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 border rounded-lg">
              <GraduationCap className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">لا توجد مهام تدريبية</h3>
              <p className="text-muted-foreground mb-4">أضف مهام تدريبية للمسار</p>
              <Button onClick={() => handleOpenTaskDialog()}>
                <Plus className="w-4 h-4" />
                إضافة مهمة
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Module Dialog */}
      <Dialog open={showModuleDialog} onOpenChange={setShowModuleDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingModule ? "تعديل الموديول" : "إضافة موديول"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveModuleMutation.mutate(moduleForm); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>الاسم (English)</Label><Input value={moduleForm.name} onChange={(e) => setModuleForm({ ...moduleForm, name: e.target.value })} required /></div>
              <div><Label>الاسم (عربي)</Label><Input value={moduleForm.name_ar} onChange={(e) => setModuleForm({ ...moduleForm, name_ar: e.target.value })} required /></div>
            </div>
            <div><Label>الوصف (عربي)</Label><Textarea value={moduleForm.description_ar} onChange={(e) => setModuleForm({ ...moduleForm, description_ar: e.target.value })} rows={2} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>النجوم المطلوبة</Label><Input type="number" value={moduleForm.required_stars} onChange={(e) => setModuleForm({ ...moduleForm, required_stars: parseInt(e.target.value) || 0 })} min={0} /></div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg"><Label>تفعيل</Label><Switch checked={moduleForm.is_active} onCheckedChange={(checked) => setModuleForm({ ...moduleForm, is_active: checked })} /></div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseModuleDialog}>إلغاء</Button>
              <Button type="submit" disabled={saveModuleMutation.isPending}>{saveModuleMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}حفظ</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Lesson Dialog */}
      <Dialog open={showLessonDialog} onOpenChange={setShowLessonDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingLesson ? "تعديل الدرس" : "إضافة درس"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveLessonMutation.mutate(lessonForm); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>العنوان (English)</Label><Input value={lessonForm.title} onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })} required /></div>
              <div><Label>العنوان (عربي)</Label><Input value={lessonForm.title_ar} onChange={(e) => setLessonForm({ ...lessonForm, title_ar: e.target.value })} required /></div>
            </div>
            
            {/* Video Section */}
            <div className="p-4 border rounded-lg space-y-4">
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5 text-muted-foreground" />
                <Label className="text-base font-semibold">الفيديو التعليمي</Label>
              </div>
              <Select value={lessonForm.video_type} onValueChange={(v: "none" | "youtube" | "mp4") => setLessonForm({ ...lessonForm, video_type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون فيديو</SelectItem>
                  <SelectItem value="youtube">
                    <span className="flex items-center gap-2"><Youtube className="w-4 h-4 text-red-500" /> رابط يوتيوب</span>
                  </SelectItem>
                  <SelectItem value="mp4">
                    <span className="flex items-center gap-2"><Upload className="w-4 h-4 text-blue-500" /> رابط MP4</span>
                  </SelectItem>
                </SelectContent>
              </Select>
              
              {lessonForm.video_type === "youtube" && (
                <div>
                  <Label>رابط الفيديو (YouTube)</Label>
                  <Input 
                    value={lessonForm.video_url} 
                    onChange={(e) => setLessonForm({ ...lessonForm, video_url: e.target.value })} 
                    placeholder="https://youtube.com/watch?v=... أو https://youtu.be/..."
                  />
                  <p className="text-xs text-muted-foreground mt-1">سيتم عرضه في iframe محمي</p>
                </div>
              )}
              
              {lessonForm.video_type === "mp4" && (
                <div>
                  <Label>رابط ملف MP4</Label>
                  <Input 
                    value={lessonForm.video_file_url} 
                    onChange={(e) => setLessonForm({ ...lessonForm, video_file_url: e.target.value })} 
                    placeholder="https://...mp4"
                  />
                </div>
              )}
            </div>

            <div><Label>المحتوى (عربي)</Label><Textarea value={lessonForm.content_ar} onChange={(e) => setLessonForm({ ...lessonForm, content_ar: e.target.value })} rows={3} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>المدة (دقيقة)</Label><Input type="number" value={lessonForm.duration_minutes} onChange={(e) => setLessonForm({ ...lessonForm, duration_minutes: parseInt(e.target.value) || 0 })} min={0} /></div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg"><Label>تفعيل</Label><Switch checked={lessonForm.is_active} onCheckedChange={(checked) => setLessonForm({ ...lessonForm, is_active: checked })} /></div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseLessonDialog}>إلغاء</Button>
              <Button type="submit" disabled={saveLessonMutation.isPending}>{saveLessonMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}حفظ</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Task Dialog */}
      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>إضافة مهمة تدريبية</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveTaskMutation.mutate(taskForm); }} className="space-y-4">
            <div><Label>عنوان المهمة *</Label><Input value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} required /></div>
            <div><Label>الوصف</Label><Textarea value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} rows={2} /></div>
            <div><Label>المتطلبات</Label><Textarea value={taskForm.requirements} onChange={(e) => setTaskForm({ ...taskForm, requirements: e.target.value })} rows={2} /></div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>الصعوبة</Label>
                <Select value={taskForm.difficulty} onValueChange={(v) => setTaskForm({ ...taskForm, difficulty: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">سهلة</SelectItem>
                    <SelectItem value="medium">متوسطة</SelectItem>
                    <SelectItem value="hard">صعبة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>النجوم</Label><Input type="number" value={taskForm.stars_reward} onChange={(e) => setTaskForm({ ...taskForm, stars_reward: parseInt(e.target.value) || 1 })} min={1} /></div>
              <div><Label>الوقت (ساعة)</Label><Input type="number" value={taskForm.deadline_hours} onChange={(e) => setTaskForm({ ...taskForm, deadline_hours: parseInt(e.target.value) || 24 })} min={1} /></div>
            </div>
            
            {/* Category targeting */}
            <div className="p-4 border rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-muted-foreground" />
                  <Label className="text-base font-semibold">استهداف تخصص محدد</Label>
                </div>
                <Switch 
                  checked={taskForm.is_category_specific}
                  onCheckedChange={(checked) => setTaskForm({ ...taskForm, is_category_specific: checked })}
                />
              </div>
              
              {taskForm.is_category_specific && categories && categories.length > 0 && (
                <div className="grid grid-cols-2 gap-2 p-3 bg-muted rounded-lg max-h-32 overflow-y-auto">
                  {categories.map((cat: any) => (
                    <div key={cat.id} className="flex items-center gap-2">
                      <Checkbox 
                        id={`task-cat-${cat.id}`}
                        checked={taskForm.target_categories.includes(cat.id)}
                        onCheckedChange={() => handleCategoryToggle(cat.id)}
                      />
                      <Label htmlFor={`task-cat-${cat.id}`} className="text-sm cursor-pointer">{cat.name_ar}</Label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between p-3 bg-muted rounded-lg"><Label>مهمة إلزامية</Label><Switch checked={taskForm.is_mandatory} onCheckedChange={(checked) => setTaskForm({ ...taskForm, is_mandatory: checked })} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseTaskDialog}>إلغاء</Button>
              <Button type="submit" disabled={saveTaskMutation.isPending}>{saveTaskMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}حفظ</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}