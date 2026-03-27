import { useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { FreelancerSidebar } from "@/components/layout/FreelancerSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { 
  GraduationCap, 
  Loader2, 
  Star,
  Trophy,
  BookOpen,
  Play,
  Lock,
  CheckCircle2,
  ArrowLeft,
  GraduationCap as CourseCap,
} from "lucide-react";
import { CourseCard } from "@/components/studio/CourseCard";

export default function FreelancerStudio() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("tracks");

  // Realtime subscription for progress and course enrollments
  useRealtimeSubscription([
    {
      table: "user_track_progress",
      filter: `user_id=eq.${user?.id}`,
      queryKeys: [["freelancer-track-progress"]],
    },
    {
      table: "course_enrollments",
      filter: `user_id=eq.${user?.id}`,
      queryKeys: [["freelancer-course-enrollments", user?.id]],
    },
  ]);

  // Fetch freelancer profile for stars
  const { data: profile } = useQuery({
    queryKey: ["freelancer-studio-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("freelancer_profiles")
        .select("stars, training_completed, categories")
        .eq("user_id", user?.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch learning tracks
  const { data: tracks, isLoading: tracksLoading } = useQuery({
    queryKey: ["freelancer-learning-tracks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("learning_tracks")
        .select("*, learning_modules(id, name_ar)")
        .eq("is_active", true)
        .or("audience.is.null,audience.in.(freelancers,freelancer,both,all)")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch user progress
  const { data: userProgress } = useQuery({
    queryKey: ["freelancer-track-progress", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_track_progress")
        .select("*")
        .eq("user_id", user?.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch course enrollments for freelancer
  const { data: courseEnrollments } = useQuery({
    queryKey: ["freelancer-course-enrollments", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("course_enrollments")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const totalStars = profile?.stars || 0;
  const completedTracks = userProgress?.filter((p) => p.completed_at)?.length || 0;

  const freelancerCategories = (profile?.categories as string[] | null) || null;
  const visibleTracks = (tracks || []).filter((track: any) => {
    const target = (track.target_categories as string[] | null) || [];
    if (!target.length || !freelancerCategories || !freelancerCategories.length) return true;
    return target.some((cat) => freelancerCategories.includes(cat));
  });

  const isTrackUnlocked = (track: any) => {
    return totalStars >= (track.required_stars || 0);
  };

  const getTrackProgress = (trackId: string) => {
    return userProgress?.find((p) => p.track_id === trackId);
  };

  const getLevelBadge = (level: string) => {
    switch (level) {
      case "beginner":
        return (
          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            مبتدئ
          </Badge>
        );
      case "intermediate":
        return (
          <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
            متوسط
          </Badge>
        );
      case "advanced":
        return (
          <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
            متقدم
          </Badge>
        );
      default:
        return <Badge variant="outline">{level}</Badge>;
    }
  };
  if (tracksLoading) {
    return (
      <DashboardLayout sidebar={<FreelancerSidebar />} title="Sity Expert Studio">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }


  return (
    <DashboardLayout
      sidebar={<FreelancerSidebar />}
      title="Sity Expert Studio"
      subtitle="تعلم، تدرب، واحصل على شغل حقيقي"
    >
      {/* Stats Header */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100/50 dark:from-yellow-900/20 dark:to-yellow-800/10 border-yellow-200 dark:border-yellow-800/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-yellow-500/20 flex items-center justify-center">
              <Star className="w-7 h-7 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="flex-1">
              <p className="text-3xl font-bold">{totalStars}</p>
              <p className="text-sm text-muted-foreground">نجومك</p>
              <Progress value={(totalStars / 100) * 100} className="h-1.5 mt-2" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/10 border-green-200 dark:border-green-800/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-green-500/20 flex items-center justify-center">
              <Trophy className="w-7 h-7 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-3xl font-bold">{profile?.training_completed || 0}</p>
              <p className="text-sm text-muted-foreground">مهام تدريبية مكتملة</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/10 border-purple-200 dark:border-purple-800/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <GraduationCap className="w-7 h-7 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-3xl font-bold">{completedTracks}</p>
              <p className="text-sm text-muted-foreground">مسارات مكتملة</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="tracks" className="gap-2">
            <BookOpen className="w-4 h-4" />
            المسارات التعليمية
          </TabsTrigger>
          <TabsTrigger value="courses" className="gap-2">
            <CourseCap className="w-4 h-4" />
            الدورات التعليمية
          </TabsTrigger>
          <TabsTrigger value="training" className="gap-2">
            <Play className="w-4 h-4" />
            المهام التدريبية
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tracks">
          {visibleTracks && visibleTracks.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleTracks.map((track: any) => {
                const unlocked = isTrackUnlocked(track);
                const progress = getTrackProgress(track.id);
                const isCompleted = !!progress?.completed_at;
                const isStarted = !!progress && !isCompleted;

                return (
                  <Card 
                    key={track.id} 
                    className={`relative overflow-hidden transition-all ${
                      unlocked ? 'hover:shadow-lg cursor-pointer' : 'opacity-70'
                    }`}
                  >
                    {!unlocked && (
                      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center">
                        <div className="text-center">
                          <Lock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">
                            يتطلب {track.required_stars} نجمة
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {isCompleted && (
                      <div className="absolute top-3 left-3 z-20">
                        <CheckCircle2 className="w-6 h-6 text-success" />
                      </div>
                    )}

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
                        {getLevelBadge(track.level)}
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {track.description_ar || track.description || "ابدأ رحلتك التعليمية مع هذا المسار"}
                      </p>
                      
                      <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-4 h-4" />
                          {track.learning_modules?.length || 0} موديول
                        </span>
                        {track.required_stars > 0 && (
                          <span className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-500" />
                            {track.required_stars} نجمة
                          </span>
                        )}
                      </div>

                      {isStarted && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>التقدم</span>
                            <span>{progress.progress_percentage}%</span>
                          </div>
                          <Progress value={progress.progress_percentage} className="h-2" />
                        </div>
                      )}

                      {unlocked && (
                        <Button className="w-full" asChild>
                          <Link to={`/freelancer/studio/track/${track.id}`}>
                            {isStarted ? "استكمال" : isCompleted ? "مراجعة" : "ابدأ الآن"}
                            <ArrowLeft className="w-4 h-4 mr-2" />
                          </Link>
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16">
              <GraduationCap className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">لا توجد مسارات متاحة حالياً</h3>
              <p className="text-muted-foreground">تحقق لاحقاً للمسارات الجديدة</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="training">
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">للوصول للمهام التدريبية المستقلة</p>
            <Button asChild>
              <Link to="/freelancer/training">
                <Play className="w-4 h-4" />
                المهام التدريبية
              </Link>
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="courses">
          {visibleTracks && visibleTracks.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleTracks.map((track: any) => {
                const enrollment = (courseEnrollments || []).find((e: any) => e.track_id === track.id);
                return (
                  <CourseCard
                    key={track.id}
                    track={track}
                    enrollment={enrollment}
                    userStars={totalStars}
                    userType="freelancer"
                    mode="course"
                  />
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16">
              <CourseCap className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">لا توجد دورات متاحة حالياً</h3>
              <p className="text-muted-foreground">تحقق لاحقاً للدورات الجديدة</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}

