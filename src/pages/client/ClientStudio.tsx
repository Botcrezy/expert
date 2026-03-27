import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ClientSidebar } from "@/components/layout/ClientSidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { 
  GraduationCap, 
  Play, 
  Clock, 
  BookOpen, 
  Award, 
  CheckCircle2, 
  Lock,
  Search,
  Star,
  Users
} from "lucide-react";

interface LearningTrack {
  id: string;
  name: string;
  name_ar: string;
  description: string | null;
  description_ar: string | null;
  level: string;
  cover_image: string | null;
  is_free: boolean;
  price: number | null;
  audience: string | null;
  enrollment_count: number | null;
}

interface Enrollment {
  id: string;
  track_id: string;
  progress_percentage: number | null;
  completed_at: string | null;
  learning_tracks: LearningTrack;
}

export default function ClientStudio() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("available");

  // Realtime: update enrollments when new course_enrollments rows are created
  useRealtimeSubscription(
    user
      ? [
          {
            table: "course_enrollments",
            filter: `user_id=eq.${user.id}`,
            queryKeys: [["client-enrollments", user.id]],
          },
        ]
      : []
  );

  // Fetch available tracks for clients
  const { data: tracks, isLoading: tracksLoading } = useQuery({
    queryKey: ["client-available-tracks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("learning_tracks")
        .select("*")
        .eq("is_active", true)
        .or("audience.is.null,audience.in.(clients,client,both,all)")
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as LearningTrack[];
    },
  });

  // Fetch user enrollments
  const { data: enrollments, isLoading: enrollmentsLoading } = useQuery({
    queryKey: ["client-enrollments", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("course_enrollments")
        .select(`
          *,
          learning_tracks (*)
        `)
        .eq("user_id", user.id)
        .eq("is_active", true);
      
      if (error) throw error;
      return data as Enrollment[];
    },
    enabled: !!user,
  });

  // Fetch user progress
  const { data: progress } = useQuery({
    queryKey: ["client-track-progress", user?.id],
    queryFn: async () => {
      if (!user) return {};
      
      const { data, error } = await supabase
        .from("user_track_progress")
        .select("*")
        .eq("user_id", user.id);
      
      if (error) throw error;
      
      return data.reduce((acc: Record<string, any>, p) => {
        acc[p.track_id] = p;
        return acc;
      }, {});
    },
    enabled: !!user,
  });

  const enrolledTrackIds = new Set(enrollments?.map(e => e.track_id) || []);
  
  const filteredTracks = tracks?.filter(track => {
    const matchesSearch = !searchQuery || 
      track.name_ar.toLowerCase().includes(searchQuery.toLowerCase()) ||
      track.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      track.description_ar?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  }) || [];

  const availableTracks = filteredTracks.filter(t => !enrolledTrackIds.has(t.id));
  const myEnrolledTracks = enrollments?.filter(e => {
    if (!searchQuery) return true;
    return e.learning_tracks.name_ar.toLowerCase().includes(searchQuery.toLowerCase()) ||
           e.learning_tracks.name.toLowerCase().includes(searchQuery.toLowerCase());
  }) || [];

  const completedTracks = myEnrolledTracks.filter(e => e.completed_at);
  const inProgressTracks = myEnrolledTracks.filter(e => !e.completed_at);

  const getLevelBadge = (level: string) => {
    const variants: Record<string, string> = {
      beginner: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
      intermediate: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
      advanced: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
    };
    const labels: Record<string, string> = {
      beginner: "مبتدئ",
      intermediate: "متوسط",
      advanced: "متقدم",
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${variants[level] || variants.beginner}`}>
        {labels[level] || level}
      </span>
    );
  };

  const isLoading = tracksLoading || enrollmentsLoading;

  return (
    <DashboardLayout sidebar={<ClientSidebar />}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <GraduationCap className="h-7 w-7 text-primary" />
              Expert Studio
            </h1>
            <p className="text-muted-foreground mt-1">
              تعلم مهارات جديدة من خلال الدورات التعليمية
            </p>
          </div>
          
          <div className="relative max-w-sm">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ابحث عن دورة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-full">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{myEnrolledTracks.length}</p>
                <p className="text-sm text-muted-foreground">دورات مسجلة</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-3 bg-yellow-500/10 rounded-full">
                <Clock className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{inProgressTracks.length}</p>
                <p className="text-sm text-muted-foreground">قيد التقدم</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-3 bg-green-500/10 rounded-full">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedTracks.length}</p>
                <p className="text-sm text-muted-foreground">مكتملة</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-3 bg-purple-500/10 rounded-full">
                <Award className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{tracks?.length || 0}</p>
                <p className="text-sm text-muted-foreground">دورة متاحة</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="available">الدورات المتاحة</TabsTrigger>
            <TabsTrigger value="enrolled">دوراتي</TabsTrigger>
            <TabsTrigger value="completed">المكتملة</TabsTrigger>
          </TabsList>

          {/* Available Tracks */}
          <TabsContent value="available" className="mt-6">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <div className="h-40 bg-muted rounded-t-lg" />
                    <CardContent className="p-4 space-y-3">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-full" />
                      <div className="h-3 bg-muted rounded w-2/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : availableTracks.length === 0 ? (
              <Card className="p-12 text-center">
                <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">لا توجد دورات متاحة</h3>
                <p className="text-muted-foreground">
                  {searchQuery ? "لم يتم العثور على نتائج للبحث" : "سيتم إضافة دورات جديدة قريباً"}
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableTracks.map((track) => (
                  <Card key={track.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="relative h-40 bg-gradient-to-br from-primary/20 to-primary/5">
                      {track.cover_image ? (
                        <img
                          src={track.cover_image}
                          alt={track.name_ar}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <GraduationCap className="h-16 w-16 text-primary/30" />
                        </div>
                      )}
                      <div className="absolute top-3 right-3 flex gap-2">
                        {getLevelBadge(track.level)}
                        {track.is_free && (
                          <Badge className="bg-green-500">مجاني</Badge>
                        )}
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-lg mb-2">{track.name_ar}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                        {track.description_ar || track.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="h-4 w-4" />
                          <span>{track.enrollment_count || 0} مشترك</span>
                          {!track.is_free && typeof track.price === "number" && track.price > 0 && (
                            <span className="font-semibold text-primary">{track.price} ج.م</span>
                          )}
                        </div>
                        <Link to={`/client/course/${track.id}`}>
                          <Button size="sm">
                            <Play className="h-4 w-4 ml-1" />
                            الدخول للكورس
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Enrolled Tracks */}
          <TabsContent value="enrolled" className="mt-6">
            {inProgressTracks.length === 0 ? (
              <Card className="p-12 text-center">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">لا توجد دورات قيد التقدم</h3>
                <p className="text-muted-foreground mb-4">ابدأ بالتسجيل في دورة جديدة</p>
                <Button onClick={() => setActiveTab("available")}>استعرض الدورات</Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {inProgressTracks.map((enrollment) => {
                  const track = enrollment.learning_tracks;
                  const trackProgress = progress?.[track.id];
                  const progressPercent = trackProgress?.progress_percentage || 0;
                  
                  return (
                    <Card key={enrollment.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                      <div className="relative h-40 bg-gradient-to-br from-primary/20 to-primary/5">
                        {track.cover_image ? (
                          <img
                            src={track.cover_image}
                            alt={track.name_ar}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <GraduationCap className="h-16 w-16 text-primary/30" />
                          </div>
                        )}
                        <div className="absolute top-3 right-3">
                          {getLevelBadge(track.level)}
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-lg mb-2">{track.name_ar}</h3>
                        <div className="mb-4">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-muted-foreground">التقدم</span>
                            <span className="font-medium">{progressPercent.toFixed(0)}%</span>
                          </div>
                          <Progress value={progressPercent} className="h-2" />
                        </div>
                        <Link to={`/client/course/${track.id}`}>
                          <Button className="w-full">
                            <Play className="h-4 w-4 ml-1" />
                            استمر في التعلم
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Completed Tracks */}
          <TabsContent value="completed" className="mt-6">
            {completedTracks.length === 0 ? (
              <Card className="p-12 text-center">
                <Award className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">لم تكمل أي دورة بعد</h3>
                <p className="text-muted-foreground">أكمل الدورات للحصول على شهادات</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {completedTracks.map((enrollment) => {
                  const track = enrollment.learning_tracks;
                  
                  return (
                    <Card key={enrollment.id} className="overflow-hidden border-green-200 dark:border-green-800">
                      <div className="relative h-40 bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900/20 dark:to-green-900/5">
                        {track.cover_image ? (
                          <img
                            src={track.cover_image}
                            alt={track.name_ar}
                            className="w-full h-full object-cover opacity-80"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Award className="h-16 w-16 text-green-500" />
                          </div>
                        )}
                        <div className="absolute top-3 right-3">
                          <Badge className="bg-green-500">
                            <CheckCircle2 className="h-3 w-3 ml-1" />
                            مكتمل
                          </Badge>
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-lg mb-2">{track.name_ar}</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          تم الإكمال في {new Date(enrollment.completed_at!).toLocaleDateString("ar-EG")}
                        </p>
                        <Link to={`/client/course/${track.id}`}>
                          <Button variant="outline" className="w-full">
                            <Play className="h-4 w-4 ml-1" />
                            مراجعة الدورة
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
