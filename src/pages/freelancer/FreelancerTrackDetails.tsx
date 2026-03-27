import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { FreelancerSidebar } from "@/components/layout/FreelancerSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { 
  ArrowRight,
  BookOpen, 
  Loader2,
  Video,
  FileText,
  GraduationCap,
  Star,
  Clock,
  CheckCircle2,
  Lock,
  Play,
  Send,
  Eye
} from "lucide-react";

export default function FreelancerTrackDetails() {
  const { trackId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [deliveryFiles, setDeliveryFiles] = useState<any[]>([]);

  useRealtimeSubscription([
    { table: "user_lesson_progress", filter: `user_id=eq.${user?.id}`, queryKeys: [["freelancer-lesson-progress", user?.id]] },
    { table: "training_assignments", filter: `freelancer_id=eq.${user?.id}`, queryKeys: [["freelancer-training-assignments", user?.id]] },
  ]);

  const { data: track, isLoading: trackLoading } = useQuery({
    queryKey: ["freelancer-track", trackId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("learning_tracks")
        .select("*")
        .eq("id", trackId)
        .eq("is_active", true)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!trackId,
  });

  const { data: modules } = useQuery({
    queryKey: ["freelancer-track-modules", trackId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("learning_modules")
        .select("*, learning_lessons(*)")
        .eq("track_id", trackId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data?.map(m => ({
        ...m,
        learning_lessons: (m.learning_lessons || []).sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
      })) || [];
    },
    enabled: !!trackId,
  });

  const { data: lessonProgress } = useQuery({
    queryKey: ["freelancer-lesson-progress", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_lesson_progress")
        .select("*")
        .eq("user_id", user?.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: tasks } = useQuery({
    queryKey: ["freelancer-track-tasks", trackId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_tasks")
        .select("*")
        .eq("track_id", trackId)
        .eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!trackId,
  });

  const { data: myAssignments } = useQuery({
    queryKey: ["freelancer-training-assignments", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_assignments")
        .select("*")
        .eq("freelancer_id", user?.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: profile } = useQuery({
    queryKey: ["freelancer-profile-stars", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("freelancer_profiles")
        .select("stars")
        .eq("user_id", user?.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const totalStars = profile?.stars || 0;

  const startTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from("training_assignments").insert({
        freelancer_id: user?.id,
        task_id: taskId,
        status: "in_progress",
        started_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["freelancer-training-assignments", user?.id] });
      toast({ title: "تم بدء المهمة ✅" });
    },
  });

  const submitTaskMutation = useMutation({
    mutationFn: async ({ assignmentId, notes, files }: { assignmentId: string; notes: string; files: any[] }) => {
      const { error } = await supabase
        .from("training_assignments")
        .update({
          status: "submitted",
          delivery_notes: notes,
          delivery_files: files,
          submitted_at: new Date().toISOString(),
        })
        .eq("id", assignmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["freelancer-training-assignments", user?.id] });
      toast({ title: "تم تسليم المهمة بنجاح! 🎉" });
      setShowTaskDialog(false);
      setSelectedTask(null);
      setDeliveryNotes("");
      setDeliveryFiles([]);
    },
    onError: (error: any) => {
      toast({ title: "حدث خطأ", description: error.message, variant: "destructive" });
    },
  });

  const isLessonCompleted = (lessonId: string) => {
    return lessonProgress?.some(p => p.lesson_id === lessonId && p.is_completed);
  };

  const isModuleUnlocked = (module: any) => {
    return totalStars >= (module.required_stars || 0);
  };

  const getTaskAssignment = (taskId: string) => {
    return myAssignments?.find(a => a.task_id === taskId);
  };

  const getTaskStatusBadge = (assignment: any) => {
    if (!assignment) return null;
    switch (assignment.status) {
      case "in_progress": return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">قيد التنفيذ</Badge>;
      case "submitted": return <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">تم التسليم</Badge>;
      case "approved": return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"><CheckCircle2 className="w-3 h-3 mr-1" />مقبول</Badge>;
      case "rejected": return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">مرفوض</Badge>;
      default: return null;
    }
  };

  const handleOpenTask = (task: any) => {
    const assignment = getTaskAssignment(task.id);
    setSelectedTask({ ...task, assignment });
    setDeliveryNotes("");
    setDeliveryFiles([]);
    setShowTaskDialog(true);
  };

  const handleWatchLesson = (lesson: any) => {
    navigate(`/freelancer/course/${trackId}/lesson/${lesson.id}`);
  };

  const handleWatchIntro = () => {
    navigate(`/freelancer/course/${trackId}`);
  };

  // Calculate progress
  const allLessons = modules?.flatMap((m: any) => m.learning_lessons || []) || [];
  const totalLessons = allLessons.length;
  const completedLessons = lessonProgress?.filter(p => p.is_completed && allLessons.some((l: any) => l.id === p.lesson_id)).length || 0;
  const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  // Check if lesson is accessible (previous must be completed)
  const isLessonAccessible = (lessonIndex: number) => {
    if (lessonIndex === 0) return true;
    const prevLessonId = allLessons[lessonIndex - 1]?.id;
    return isLessonCompleted(prevLessonId);
  };

  if (trackLoading) {
    return (
      <DashboardLayout sidebar={<FreelancerSidebar />} title="تفاصيل المسار">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!track) {
    return (
      <DashboardLayout sidebar={<FreelancerSidebar />} title="المسار غير متاح">
        <div className="text-center py-20">
          <Lock className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">هذا المسار غير متاح حالياً</p>
          <Button asChild className="mt-4">
            <Link to="/freelancer/studio">العودة للاستوديو</Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      sidebar={<FreelancerSidebar />}
      title={track.name_ar}
      subtitle={track.description_ar}
    >
      {/* Breadcrumb & Progress */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/freelancer/studio" className="hover:text-primary transition-colors">الاستوديو</Link>
          <ArrowRight className="w-4 h-4" />
          <span className="text-foreground font-medium">{track.name_ar}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-muted-foreground">
            {completedLessons}/{totalLessons} درس
          </div>
          <div className="w-32">
            <Progress value={progressPercent} className="h-2" />
          </div>
          <Badge variant="outline">{progressPercent}%</Badge>
        </div>
      </div>

      {/* Intro Video Button */}
      {track.video_intro_url && (
        <Card className="mb-6 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <Video className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold">فيديو تعريفي للكورس</h4>
                <p className="text-sm text-muted-foreground">شاهد مقدمة الكورس قبل البدء</p>
              </div>
            </div>
            <Button onClick={handleWatchIntro}>
              <Eye className="w-4 h-4 ml-2" />
              مشاهدة
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{modules?.length || 0}</p>
              <p className="text-sm text-muted-foreground">موديول</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
              <Star className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalStars}</p>
              <p className="text-sm text-muted-foreground">نجومك</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{tasks?.length || 0}</p>
              <p className="text-sm text-muted-foreground">مهمة تدريبية</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modules & Lessons */}
      {modules && modules.length > 0 ? (
        <Accordion type="multiple" className="space-y-4">
          {modules.map((module: any, moduleIndex: number) => {
            const unlocked = isModuleUnlocked(module);
            const moduleTasks = tasks?.filter(t => t.module_id === module.id) || [];

            return (
              <AccordionItem key={module.id} value={module.id} className="border rounded-xl px-4 relative overflow-hidden">
                {!unlocked && (
                  <div className="absolute inset-0 bg-background/90 backdrop-blur-sm z-10 flex items-center justify-center">
                    <div className="text-center">
                      <Lock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">يتطلب {module.required_stars} نجمة</p>
                    </div>
                  </div>
                )}
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center justify-between w-full pl-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {moduleIndex + 1}
                      </div>
                      <div className="text-right">
                        <h4 className="font-semibold">{module.name_ar}</h4>
                        <p className="text-sm text-muted-foreground">
                          {module.learning_lessons?.length || 0} درس • {moduleTasks.length} مهمة
                        </p>
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-4">
                  <div className="space-y-3 pr-13">
                    {/* Lessons */}
                    {module.learning_lessons?.map((lesson: any, lessonIndex: number) => {
                      const globalIndex = allLessons.findIndex((l: any) => l.id === lesson.id);
                      const completed = isLessonCompleted(lesson.id);
                      const accessible = isLessonAccessible(globalIndex);
                      const lessonTask = tasks?.find(t => t.lesson_id === lesson.id);

                      return (
                        <div key={lesson.id} className="space-y-2">
                          <div className={`flex items-center justify-between p-4 rounded-lg transition-colors ${completed ? 'bg-green-500/10' : accessible ? 'bg-muted/50 hover:bg-muted' : 'bg-muted/30 opacity-60'}`}>
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium ${completed ? 'bg-green-500 text-white' : accessible ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                {completed ? <CheckCircle2 className="w-4 h-4" /> : !accessible ? <Lock className="w-4 h-4" /> : lessonIndex + 1}
                              </div>
                              <div>
                                <p className="font-medium">{lesson.title_ar}</p>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                  {(lesson.video_url || lesson.video_file_url) && <span className="flex items-center gap-1"><Video className="w-3 h-3" /> فيديو</span>}
                                  {lesson.duration_minutes > 0 && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {lesson.duration_minutes} دقيقة</span>}
                                </div>
                              </div>
                            </div>
                            {accessible && (lesson.video_url || lesson.video_file_url) && (
                              <Button size="sm" variant={completed ? "outline" : "default"} onClick={() => handleWatchLesson(lesson)}>
                                <Eye className="w-4 h-4 ml-1" />
                                {completed ? "إعادة المشاهدة" : "مشاهدة"}
                              </Button>
                            )}
                            {!accessible && (
                              <Badge variant="outline" className="text-muted-foreground">
                                <Lock className="w-3 h-3 ml-1" />
                                مقفل
                              </Badge>
                            )}
                          </div>
                          
                          {/* Lesson Task */}
                          {lessonTask && (
                            <div className="mr-11 p-3 border border-dashed rounded-lg bg-yellow-50/50 dark:bg-yellow-900/10">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <GraduationCap className="w-4 h-4 text-yellow-600" />
                                  <span className="text-sm font-medium">{lessonTask.title}</span>
                                  <Badge variant="outline" className="text-xs">
                                    <Star className="w-3 h-3 mr-1 text-yellow-500" />
                                    {lessonTask.stars_reward}
                                  </Badge>
                                </div>
                                {getTaskStatusBadge(getTaskAssignment(lessonTask.id)) || (
                                  <Button size="sm" variant="outline" onClick={() => handleOpenTask(lessonTask)}>
                                    ابدأ المهمة
                                  </Button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Module Tasks */}
                    {moduleTasks.filter(t => !t.lesson_id).length > 0 && (
                      <div className="pt-4 border-t mt-4">
                        <p className="text-sm font-medium text-muted-foreground mb-3">مهام الموديول</p>
                        <div className="space-y-2">
                          {moduleTasks.filter(t => !t.lesson_id).map((task: any) => {
                            const assignment = getTaskAssignment(task.id);
                            return (
                              <div key={task.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                                <div className="flex items-center gap-2">
                                  <GraduationCap className="w-4 h-4 text-primary" />
                                  <span className="text-sm font-medium">{task.title}</span>
                                  <Badge variant="outline" className="text-xs">
                                    <Star className="w-3 h-3 mr-1 text-yellow-500" />
                                    {task.stars_reward}
                                  </Badge>
                                </div>
                                {getTaskStatusBadge(assignment) || (
                                  <Button size="sm" variant="outline" onClick={() => handleOpenTask(task)}>
                                    ابدأ
                                  </Button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      ) : (
        <div className="text-center py-16">
          <BookOpen className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">لا توجد دروس في هذا المسار بعد</p>
        </div>
      )}

      {/* Task Dialog */}
      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedTask?.title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-muted-foreground">{selectedTask?.description}</p>

            {selectedTask?.requirements && (
              <div>
                <Label className="text-sm font-medium">المتطلبات:</Label>
                <p className="text-sm mt-1 p-3 bg-muted rounded-lg">{selectedTask.requirements}</p>
              </div>
            )}

            <div className="flex items-center gap-4">
              <Badge variant="outline">
                <Star className="w-3 h-3 mr-1 text-yellow-500" />
                {selectedTask?.stars_reward} نجمة
              </Badge>
              <Badge variant="outline">
                <Clock className="w-3 h-3 mr-1" />
                {selectedTask?.deadline_hours || 24} ساعة
              </Badge>
            </div>

            {selectedTask?.assignment ? (
              selectedTask.assignment.status === "in_progress" ? (
                <div className="space-y-4 pt-4 border-t">
                  <Label>ملاحظات التسليم</Label>
                  <Textarea
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                    placeholder="اكتب ملاحظاتك هنا..."
                    rows={4}
                  />
                </div>
              ) : (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm">{getTaskStatusBadge(selectedTask.assignment)}</p>
                  {selectedTask.assignment.admin_feedback && (
                    <div className="mt-2">
                      <Label className="text-xs">ملاحظات المراجع:</Label>
                      <p className="text-sm">{selectedTask.assignment.admin_feedback}</p>
                    </div>
                  )}
                </div>
              )
            ) : null}
          </div>

          <DialogFooter>
            {!selectedTask?.assignment ? (
              <Button
                onClick={() => {
                  startTaskMutation.mutate(selectedTask.id);
                  setShowTaskDialog(false);
                }}
                disabled={startTaskMutation.isPending}
              >
                {startTaskMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                بدء المهمة
              </Button>
            ) : selectedTask.assignment.status === "in_progress" ? (
              <Button
                onClick={() => submitTaskMutation.mutate({
                  assignmentId: selectedTask.assignment.id,
                  notes: deliveryNotes,
                  files: deliveryFiles,
                })}
                disabled={submitTaskMutation.isPending || !deliveryNotes.trim()}
              >
                {submitTaskMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                تسليم المهمة
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
