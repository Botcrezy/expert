import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { EnhancedVideoPlayer } from "@/components/studio/EnhancedVideoPlayer";
import { LessonComments } from "@/components/studio/LessonComments";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  ArrowRight,
  BookOpen,
  Video,
  CheckCircle2,
  Lock,
  Play,
  Download,
  FileText,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Star,
  Loader2,
  Users,
} from "lucide-react";

interface CourseViewerProps {
  userType: "client" | "freelancer";
  sidebarComponent: React.ReactNode;
  basePath: string;
}

export default function CourseViewer({ userType, sidebarComponent, basePath }: CourseViewerProps) {
  const { trackId, lessonId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [showIntro, setShowIntro] = useState(!lessonId);

  // Fetch track details
  const { data: track, isLoading: trackLoading } = useQuery({
    queryKey: ["course-track", trackId],
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

  // Fetch modules with lessons
  const { data: modules = [] } = useQuery({
    queryKey: ["course-modules", trackId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("learning_modules")
        .select(`
          *,
          learning_lessons(*)
        `)
        .eq("track_id", trackId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      
      // Sort lessons within each module
      return data?.map(m => ({
        ...m,
        learning_lessons: (m.learning_lessons || []).sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
      })) || [];
    },
    enabled: !!trackId,
  });

  // Fetch current lesson
  const { data: currentLesson } = useQuery({
    queryKey: ["current-lesson", lessonId],
    queryFn: async () => {
      if (!lessonId) return null;
      const { data, error } = await supabase
        .from("learning_lessons")
        .select("*")
        .eq("id", lessonId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!lessonId,
  });

  // Check/Create enrollment for free courses
  const { data: enrollment, isLoading: enrollmentLoading } = useQuery({
    queryKey: ["course-enrollment", user?.id, trackId],
    queryFn: async () => {
      if (!user || !trackId) return null;
      
      // Check existing enrollment
      const { data: existing, error } = await supabase
        .from("course_enrollments")
        .select("*")
        .eq("user_id", user.id)
        .eq("track_id", trackId)
        .eq("is_active", true)
        .maybeSingle();
      
      if (error) throw error;
      
      if (existing) return existing;
      
      // Auto-enroll for free courses
      if (track?.is_free) {
        const { data: newEnrollment, error: enrollError } = await supabase
          .from("course_enrollments")
          .insert({
            user_id: user.id,
            track_id: trackId,
            is_active: true,
          })
          .select()
          .single();
        
        if (enrollError) {
          console.error("Enrollment error:", enrollError);
          return null;
        }
        
        // Update enrollment count
        await supabase
          .from("learning_tracks")
          .update({ enrollment_count: (track.enrollment_count || 0) + 1 })
          .eq("id", trackId);
        
        return newEnrollment;
      }
      
      return null;
    },
    enabled: !!user && !!trackId && !!track,
  });

  // Fetch user progress
  const { data: lessonProgress = [] } = useQuery({
    queryKey: ["user-lesson-progress", user?.id, trackId],
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

  // Fetch training tasks (for freelancers only)
  const { data: tasks = [] } = useQuery({
    queryKey: ["course-tasks", trackId],
    queryFn: async () => {
      if (userType !== "freelancer") return [];
      const { data, error } = await supabase
        .from("training_tasks")
        .select("*")
        .eq("track_id", trackId)
        .eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!trackId && userType === "freelancer",
  });

  // Update lesson progress
  const updateProgressMutation = useMutation({
    mutationFn: async ({ lessonId, watchedSeconds, totalSeconds }: { lessonId: string; watchedSeconds: number; totalSeconds: number }) => {
      const percentage = totalSeconds > 0 ? (watchedSeconds / totalSeconds) * 100 : 0;
      const isCompleted = percentage >= 90;

      const { error } = await supabase
        .from("user_lesson_progress")
        .upsert({
          user_id: user?.id,
          lesson_id: lessonId,
          watched_seconds: watchedSeconds,
          total_seconds: totalSeconds,
          watch_percentage: percentage,
          is_completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null,
          last_watched_at: new Date().toISOString(),
        }, { onConflict: "user_id,lesson_id" });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-lesson-progress"] });
    },
  });

  // Mark lesson as complete
  const markCompleteMutation = useMutation({
    mutationFn: async (lessonId: string) => {
      if (!user) throw new Error("User not authenticated");
      
      // Get current progress if exists
      const { data: existingProgress } = await supabase
        .from("user_lesson_progress")
        .select("*")
        .eq("user_id", user.id)
        .eq("lesson_id", lessonId)
        .maybeSingle();
      
      const { error } = await supabase
        .from("user_lesson_progress")
        .upsert({
          user_id: user.id,
          lesson_id: lessonId,
          is_completed: true,
          completed_at: new Date().toISOString(),
          watch_percentage: 100,
          watched_seconds: existingProgress?.watched_seconds || 0,
          total_seconds: existingProgress?.total_seconds || 0,
          last_watched_at: new Date().toISOString(),
        }, { onConflict: "user_id,lesson_id" });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-lesson-progress"] });
      toast({ title: "تم إكمال الدرس! ✅" });
    },
    onError: (error: any) => {
      console.error("Mark complete error:", error);
      toast({ 
        title: "حدث خطأ",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  // Get all lessons flat
  const allLessons = modules.flatMap((m: any) => m.learning_lessons || []);
  const currentLessonIndex = allLessons.findIndex((l: any) => l.id === lessonId);
  const prevLesson = currentLessonIndex > 0 ? allLessons[currentLessonIndex - 1] : null;
  const nextLesson = currentLessonIndex < allLessons.length - 1 ? allLessons[currentLessonIndex + 1] : null;

  // Calculate progress
  const totalLessons = allLessons.length;
  const completedLessons = lessonProgress.filter(p => p.is_completed).length;
  const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  const isLessonCompleted = (id: string) => lessonProgress.some(p => p.lesson_id === id && p.is_completed);
  
  // Check if lesson is accessible (previous must be completed)
  const isLessonAccessible = (lessonIndex: number) => {
    if (lessonIndex === 0) return true;
    const prevLessonId = allLessons[lessonIndex - 1]?.id;
    return isLessonCompleted(prevLessonId);
  };

  const handleLessonClick = (lesson: any) => {
    const lessonIndex = allLessons.findIndex((l: any) => l.id === lesson.id);
    if (!isLessonAccessible(lessonIndex)) {
      toast({
        title: "الدرس مقفل",
        description: "يجب إكمال الدرس السابق أولاً",
        variant: "destructive",
      });
      return;
    }
    setShowIntro(false);
    navigate(`${basePath}/course/${trackId}/lesson/${lesson.id}`);
  };

  const handleVideoProgress = (seconds: number, total: number) => {
    if (currentLesson && total > 0) {
      updateProgressMutation.mutate({
        lessonId: currentLesson.id,
        watchedSeconds: Math.floor(seconds),
        totalSeconds: Math.floor(total),
      });
    }
  };

  const handleVideoComplete = () => {
    if (currentLesson && !isLessonCompleted(currentLesson.id)) {
      markCompleteMutation.mutate(currentLesson.id);
    }
  };

  // Set active module when lesson changes
  useEffect(() => {
    if (currentLesson) {
      setActiveModuleId(currentLesson.module_id);
    }
  }, [currentLesson]);

  if (trackLoading || enrollmentLoading) {
    return (
      <DashboardLayout sidebar={sidebarComponent}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!track) {
    return (
      <DashboardLayout sidebar={sidebarComponent}>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Lock className="w-16 h-16 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">الكورس غير متاح</p>
          <Button asChild className="mt-4">
            <Link to={`${basePath}/studio`}>العودة للاستوديو</Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  // If course is paid and user not enrolled yet, show full course preview but lock content
  if (!track.is_free && !enrollment) {
    const trackAny = track as any;
    const introVideoUrl = (trackAny.intro_video_url as string | null) || null;
    const introVideoType = (trackAny.intro_video_type as "youtube" | "upload" | null) || "youtube";
    const introVideoFileUrl = (trackAny.intro_video_file_url as string | null) || null;

    return (
      <DashboardLayout sidebar={sidebarComponent}>
        <div className="max-w-5xl mx-auto py-12 space-y-8">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <GraduationCap className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">{track.name_ar}</h1>
                {track.description_ar && (
                  <p className="text-muted-foreground mt-1 whitespace-pre-line">
                    {track.description_ar}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <Badge variant="outline">{track.level}</Badge>
              {typeof track.price === "number" && track.price > 0 && (
                <span className="font-semibold text-primary">{track.price} ج.م</span>
              )}
              {typeof track.enrollment_count === "number" && (
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {track.enrollment_count} مسجل
                </span>
              )}
            </div>
          </div>

          {/* Intro video preview */}
          {(introVideoUrl || introVideoFileUrl) && (
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle className="text-base">فيديو تعريفي عن الكورس</CardTitle>
              </CardHeader>
              <CardContent>
                <EnhancedVideoPlayer
                  videoUrl={introVideoUrl || undefined}
                  videoFileUrl={introVideoFileUrl || undefined}
                  videoType={introVideoType}
                  title={track.name_ar}
                  className="w-full aspect-video rounded-lg overflow-hidden"
                  autoPlay={false}
                />
              </CardContent>
            </Card>
          )}

          {/* Locked curriculum preview */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              محتوى الكورس (مقفل حتى الشراء)
            </h2>
            <div className="space-y-3">
              {modules.map((module: any) => (
                <Card key={module.id} className="border-dashed">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-muted-foreground" />
                      {module.name_ar || module.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    {(module.learning_lessons || []).map((lesson: any) => (
                      <div
                        key={lesson.id}
                        className="flex items-center justify-between text-sm text-muted-foreground px-2 py-1 rounded-md bg-muted/50"
                      >
                        <span className="flex items-center gap-2">
                          <Lock className="w-4 h-4 text-yellow-500" />
                          {lesson.title_ar || lesson.title}
                        </span>
                        <span className="text-xs">
                          درس مقفل - قم بشراء الكورس للوصول
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border p-10 bg-muted/40 text-center space-y-4">
            <Lock className="w-12 h-12 text-yellow-500 mx-auto" />
            <h2 className="text-xl font-bold">هذا الكورس مدفوع</h2>
            <p className="text-muted-foreground max-w-md">
              يمكنك معاينة تفاصيل الكورس، لكن لا يمكنك فتح الدروس أو المهام قبل شراء الكورس.
            </p>
            <div className="flex gap-3 mt-2">
              <Button asChild variant="outline">
                <Link to={`${basePath}/studio`}>العودة للاستوديو</Link>
              </Button>
              <Button asChild>
                <Link to={`${basePath}/checkout?track=${trackId}`}>
                  شراء الكورس {typeof track.price === "number" && track.price > 0 && `- ${track.price} ج.م`}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar - Course Content */}
      <aside className="w-80 border-l bg-card hidden lg:flex flex-col h-screen sticky top-0">
        {/* Course Header */}
        <div className="p-4 border-b">
          <Link to={`${basePath}/studio`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-3">
            <ArrowRight className="w-4 h-4" />
            العودة للاستوديو
          </Link>
          <h2 className="font-bold text-lg line-clamp-2">{track.name_ar}</h2>
          <div className="flex items-center gap-2 mt-2">
            <Progress value={progressPercent} className="flex-1 h-2" />
            <span className="text-xs text-muted-foreground">{progressPercent}%</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {completedLessons}/{totalLessons} درس
          </p>
        </div>

        {/* Modules & Lessons */}
        <ScrollArea className="flex-1">
          <Accordion
            type="multiple"
            value={activeModuleId ? [activeModuleId] : []}
            onValueChange={(value) => setActiveModuleId(value[0] || null)}
            className="px-2 py-2"
          >
            {modules.map((module: any, moduleIndex: number) => {
              const moduleLessons = module.learning_lessons || [];
              const moduleTasks = tasks.filter((t: any) => t.module_id === module.id);
              const moduleCompleted = moduleLessons.every((l: any) => isLessonCompleted(l.id));

              return (
                <AccordionItem key={module.id} value={module.id} className="border-none">
                  <AccordionTrigger className="py-3 px-3 hover:bg-muted/50 rounded-lg [&[data-state=open]]:bg-muted/50">
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium ${
                        moduleCompleted ? "bg-green-500 text-white" : "bg-primary/10 text-primary"
                      }`}>
                        {moduleCompleted ? <CheckCircle2 className="w-4 h-4" /> : moduleIndex + 1}
                      </div>
                      <div className="text-right flex-1">
                        <p className="font-medium text-sm">{module.name_ar}</p>
                        <p className="text-xs text-muted-foreground">
                          {moduleLessons.length} درس
                          {userType === "freelancer" && moduleTasks.length > 0 && ` • ${moduleTasks.length} مهمة`}
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-2">
                    <div className="space-y-1 pr-11">
                      {moduleLessons.map((lesson: any, lessonIndex: number) => {
                        const globalIndex = allLessons.findIndex((l: any) => l.id === lesson.id);
                        const completed = isLessonCompleted(lesson.id);
                        const accessible = isLessonAccessible(globalIndex);
                        const isCurrent = lesson.id === lessonId;

                        return (
                          <button
                            key={lesson.id}
                            onClick={() => handleLessonClick(lesson)}
                            disabled={!accessible}
                            className={`w-full flex items-center gap-3 p-2 rounded-lg text-right transition-colors ${
                              isCurrent
                                ? "bg-primary text-primary-foreground"
                                : completed
                                ? "bg-green-500/10 hover:bg-green-500/20"
                                : accessible
                                ? "hover:bg-muted"
                                : "opacity-50 cursor-not-allowed"
                            }`}
                          >
                            <div className={`w-6 h-6 rounded flex items-center justify-center text-xs ${
                              completed ? "bg-green-500 text-white" : isCurrent ? "bg-white/20" : "bg-muted"
                            }`}>
                              {completed ? <CheckCircle2 className="w-3 h-3" /> : !accessible ? <Lock className="w-3 h-3" /> : lessonIndex + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm truncate">{lesson.title_ar}</p>
                              {lesson.duration_minutes > 0 && (
                                <p className="text-xs opacity-70">{lesson.duration_minutes} دقيقة</p>
                              )}
                            </div>
                            {(lesson.video_url || lesson.video_file_url) && <Video className="w-4 h-4 opacity-50" />}
                          </button>
                        );
                      })}

                      {/* Module Tasks (freelancers only) */}
                      {userType === "freelancer" && moduleTasks.length > 0 && (
                        <div className="pt-2 mt-2 border-t">
                          {moduleTasks.map((task: any) => (
                            <div key={task.id} className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                              <GraduationCap className="w-4 h-4 text-yellow-600" />
                              <span className="text-xs font-medium flex-1">{task.title}</span>
                              <Badge variant="outline" className="text-xs">
                                <Star className="w-3 h-3 ml-1 text-yellow-500" />
                                {task.stars_reward}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </ScrollArea>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-h-screen">
        {showIntro || !currentLesson ? (
          // Course Intro
          <div className="p-6 max-w-4xl mx-auto">
            <div className="mb-6">
              <Badge variant="outline" className="mb-2">{track.level === "beginner" ? "مبتدئ" : track.level === "intermediate" ? "متوسط" : "متقدم"}</Badge>
              <h1 className="text-3xl font-bold mb-2">{track.name_ar}</h1>
              <p className="text-muted-foreground">{track.description_ar}</p>
            </div>

            {/* Intro Video */}
            {track.video_intro_url && (
              <div className="mb-8">
                <EnhancedVideoPlayer
                  videoUrl={track.video_intro_url}
                  videoType={track.video_intro_type as "youtube" | "upload" | null}
                  title="فيديو تعريفي"
                />
              </div>
            )}

            {/* Start Button */}
            {allLessons.length > 0 && (
              <Button size="lg" className="mb-8" onClick={() => handleLessonClick(allLessons[0])}>
                <Play className="w-5 h-5 ml-2" />
                ابدأ الكورس الآن
              </Button>
            )}

            {/* Course Content Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  محتوى الكورس
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {modules.map((module: any, index: number) => (
                    <div key={module.id} className="flex items-start gap-4 p-4 bg-muted/50 rounded-xl">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold">{module.name_ar}</h4>
                        <p className="text-sm text-muted-foreground">{module.description_ar}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Video className="w-3 h-3" />
                            {module.learning_lessons?.length || 0} درس
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          // Lesson View
          <div className="p-6">
            {/* Video Player */}
            <div className="max-w-5xl mx-auto">
              <EnhancedVideoPlayer
                videoUrl={currentLesson.video_url}
                videoType={currentLesson.video_type as "youtube" | "upload" | null}
                videoFileUrl={currentLesson.video_file_url}
                title={currentLesson.title_ar}
                onProgress={handleVideoProgress}
                onComplete={handleVideoComplete}
                className="mb-6"
              />

              {/* Lesson Info */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold">{currentLesson.title_ar}</h1>
                  <p className="text-muted-foreground">{currentLesson.title}</p>
                </div>
                {!isLessonCompleted(currentLesson.id) && (
                  <Button 
                    onClick={() => markCompleteMutation.mutate(currentLesson.id)}
                    disabled={markCompleteMutation.isPending}
                  >
                    {markCompleteMutation.isPending ? (
                      <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 ml-2" />
                    )}
                    وضع علامة مكتمل
                  </Button>
                )}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between mb-8">
                <Button
                  variant="outline"
                  disabled={!prevLesson}
                  onClick={() => prevLesson && handleLessonClick(prevLesson)}
                >
                  <ChevronRight className="w-4 h-4 ml-2" />
                  الدرس السابق
                </Button>
                <Button
                  disabled={!nextLesson}
                  onClick={() => nextLesson && handleLessonClick(nextLesson)}
                >
                  الدرس التالي
                  <ChevronLeft className="w-4 h-4 mr-2" />
                </Button>
              </div>

              {/* Lesson Content */}
              {currentLesson.content_ar && (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      محتوى الدرس
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      {currentLesson.content_ar}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Resources */}
              {currentLesson.resources && Array.isArray(currentLesson.resources) && currentLesson.resources.length > 0 && (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Download className="w-5 h-5" />
                      ملفات الدرس
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {currentLesson.resources.map((resource: any, index: number) => (
                        <a
                          key={index}
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                        >
                          <FileText className="w-5 h-5 text-primary" />
                          <span className="flex-1">{resource.name || `ملف ${index + 1}`}</span>
                          <Download className="w-4 h-4 text-muted-foreground" />
                        </a>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Comments & Likes */}
              <Card>
                <CardContent className="pt-6">
                  <LessonComments lessonId={currentLesson.id} userType={userType} />
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}