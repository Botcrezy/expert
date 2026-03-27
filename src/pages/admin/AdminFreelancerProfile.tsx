import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import {
  ArrowRight,
  Loader2,
  Star,
  CheckCircle2,
  XCircle,
  User,
  Mail,
  Phone,
  Globe,
  Briefcase,
  FileText,
  Download,
  Calendar,
  Award,
  Shield,
  ShieldCheck,
  ExternalLink,
  Linkedin,
  Github,
  Clock,
  Target,
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

export default function AdminFreelancerProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["admin-freelancer-profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const { data: freelancerProfile, isLoading: freelancerLoading } = useQuery({
    queryKey: ["admin-freelancer-details", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("freelancer_profiles")
        .select("*")
        .eq("user_id", userId)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!userId,
  });

  const { data: categories } = useQuery({
    queryKey: ["all-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*");
      return data || [];
    },
  });

  const { data: assignments } = useQuery({
    queryKey: ["freelancer-assignments", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("assignments")
        .select("*, requests(title, request_number)")
        .eq("freelancer_id", userId)
        .order("assigned_at", { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!userId,
  });

  const { data: trainingAssignments } = useQuery({
    queryKey: ["freelancer-training", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("training_assignments")
        .select("*, training_tasks(title, stars_reward)")
        .eq("freelancer_id", userId)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!userId,
  });

  const toggleVerificationMutation = useMutation({
    mutationFn: async ({ verified }: { verified: boolean }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ is_verified: verified })
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: (_, { verified }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-freelancer-profile", userId] });
      toast({ title: verified ? "تم توثيق الحساب ✅" : "تم إلغاء التوثيق" });
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    },
  });

  const updateCategoriesMutation = useMutation({
    mutationFn: async (categories: string[]) => {
      const { error } = await supabase
        .from("freelancer_profiles")
        .update({ categories })
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-freelancer-details", userId] });
      toast({ title: "تم تحديث التخصصات للفريلانسر ✅" });
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    },
  });

  const getCategoryName = (categoryId: string) => {
    const category = categories?.find((c: any) => c.id === categoryId);
    return category?.name_ar || categoryId;
  };

  const getVerificationStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-100 text-green-700">معتمد</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-700">قيد المراجعة</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-700">مرفوض</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (profileLoading || freelancerLoading) {
    return (
      <DashboardLayout sidebar={<AdminSidebar />}>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!profile) {
    return (
      <DashboardLayout sidebar={<AdminSidebar />}>
        <div className="text-center py-20">
          <User className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">لم يتم العثور على المستخدم</h2>
          <Button variant="outline" onClick={() => navigate("/admin/users")}>
            العودة للمستخدمين
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout sidebar={<AdminSidebar />}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowRight className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">بروفايل الفريلانسر</h1>
          </div>
        </div>

        {/* Profile Header Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start gap-6">
              <Avatar className="w-24 h-24">
                <AvatarImage src={profile.avatar_url || ""} />
                <AvatarFallback className="text-3xl bg-primary/10 text-primary">
                  {profile.full_name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-2xl font-bold">{profile.full_name}</h2>
                  {profile.is_verified && (
                    <Badge className="bg-blue-100 text-blue-700 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      موثق
                    </Badge>
                  )}
                  {freelancerProfile && getVerificationStatusBadge(freelancerProfile.verification_status || "pending")}
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Mail className="w-4 h-4" />
                    {profile.email}
                  </span>
                  {profile.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      {profile.phone}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    انضم في {format(new Date(profile.created_at), "dd MMMM yyyy", { locale: ar })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant={profile.is_verified ? "outline" : "default"}
                    size="sm"
                    onClick={() => toggleVerificationMutation.mutate({ verified: !profile.is_verified })}
                    disabled={toggleVerificationMutation.isPending}
                  >
                    {profile.is_verified ? (
                      <>
                        <XCircle className="w-4 h-4 ml-1" />
                        إلغاء التوثيق
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4 ml-1" />
                        توثيق الحساب
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        {freelancerProfile && (
          <div className="grid sm:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <Star className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                <p className="text-2xl font-bold">{freelancerProfile.stars || 0}</p>
                <p className="text-sm text-muted-foreground">نجوم</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Target className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="text-2xl font-bold">{freelancerProfile.completed_tasks || 0}</p>
                <p className="text-sm text-muted-foreground">مهام مكتملة</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Award className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                <p className="text-2xl font-bold">{freelancerProfile.training_completed || 0}</p>
                <p className="text-sm text-muted-foreground">تدريب مكتمل</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Briefcase className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                <p className="text-2xl font-bold">{freelancerProfile.total_earnings || 0} ج.م</p>
                <p className="text-sm text-muted-foreground">إجمالي الأرباح</p>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="info" className="space-y-6">
          <TabsList>
            <TabsTrigger value="info">المعلومات الشخصية</TabsTrigger>
            <TabsTrigger value="assignments">التعيينات</TabsTrigger>
            <TabsTrigger value="training">المهام التدريبية</TabsTrigger>
          </TabsList>

          <TabsContent value="info">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  المعلومات المهنية
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {freelancerProfile ? (
                  <>
                    {/* Bio */}
                    {freelancerProfile.bio && (
                      <div>
                        <h4 className="font-medium mb-2">نبذة شخصية</h4>
                        <p className="p-3 bg-muted rounded-lg text-sm">{freelancerProfile.bio}</p>
                      </div>
                    )}

                    {/* Experience */}
                    {freelancerProfile.experience && (
                      <div>
                        <h4 className="font-medium mb-2">الخبرة</h4>
                        <p className="p-3 bg-muted rounded-lg text-sm">{freelancerProfile.experience}</p>
                      </div>
                    )}

                    {/* Categories */}
                    <div>
                      <h4 className="font-medium mb-2">التخصصات</h4>
                      {freelancerProfile.categories && freelancerProfile.categories.length > 0 ? (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {freelancerProfile.categories.map((catId: string) => (
                            <Badge key={catId} variant="secondary">
                              {getCategoryName(catId)}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground mb-3">لم يتم تحديد تخصصات بعد</p>
                      )}

                      <div className="flex flex-wrap gap-2">
                        {categories?.map((cat: any) => {
                          const isSelected = (freelancerProfile.categories || []).includes(cat.id);
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                                isSelected
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-background text-foreground border-border hover:border-primary/60"
                              }`}
                              onClick={() => {
                                const current = new Set(freelancerProfile.categories || []);
                                if (current.has(cat.id)) {
                                  current.delete(cat.id);
                                } else {
                                  current.add(cat.id);
                                }
                                updateCategoriesMutation.mutate(Array.from(current));
                              }}
                            >
                              {cat.name_ar}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Skills */}
                    {freelancerProfile.skills && (freelancerProfile.skills as any)?.skills?.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">المهارات</h4>
                        <div className="flex flex-wrap gap-2">
                          {((freelancerProfile.skills as any).skills || []).map((skill: string) => (
                            <Badge key={skill} variant="outline">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <Separator />

                    {/* Links */}
                    <div className="grid sm:grid-cols-2 gap-4">
                      {freelancerProfile.portfolio_url && (
                        <div className="p-3 bg-muted rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <Globe className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium">معرض الأعمال</span>
                          </div>
                          <a
                            href={freelancerProfile.portfolio_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline text-sm flex items-center gap-1"
                          >
                            {freelancerProfile.portfolio_url}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                      {freelancerProfile.linkedin_url && (
                        <div className="p-3 bg-muted rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <Linkedin className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium">LinkedIn</span>
                          </div>
                          <a
                            href={freelancerProfile.linkedin_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline text-sm flex items-center gap-1"
                          >
                            {freelancerProfile.linkedin_url}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                      {freelancerProfile.github_url && (
                        <div className="p-3 bg-muted rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <Github className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium">GitHub</span>
                          </div>
                          <a
                            href={freelancerProfile.github_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline text-sm flex items-center gap-1"
                          >
                            {freelancerProfile.github_url}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* Rate & Availability */}
                    <div className="grid sm:grid-cols-2 gap-4">
                      {freelancerProfile.hourly_rate && (
                        <div className="p-3 bg-muted rounded-lg">
                          <span className="text-sm text-muted-foreground">السعر بالساعة</span>
                          <p className="font-semibold text-lg">{freelancerProfile.hourly_rate} ج.م</p>
                        </div>
                      )}
                      <div className="p-3 bg-muted rounded-lg">
                        <span className="text-sm text-muted-foreground">الحالة</span>
                        <p className="font-semibold">
                          {freelancerProfile.is_available ? (
                            <span className="text-green-600 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" />
                              متاح للعمل
                            </span>
                          ) : (
                            <span className="text-red-600 flex items-center gap-1">
                              <XCircle className="w-4 h-4" />
                              غير متاح
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>لا توجد بيانات فريلانسر لهذا المستخدم</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assignments">
            <Card>
              <CardHeader>
                <CardTitle>تاريخ التعيينات</CardTitle>
                <CardDescription>آخر 10 تعيينات للفريلانسر</CardDescription>
              </CardHeader>
              <CardContent>
                {assignments && assignments.length > 0 ? (
                  <div className="space-y-3">
                    {assignments.map((assignment: any) => (
                      <div key={assignment.id} className="p-3 border rounded-lg flex items-center justify-between">
                        <div>
                          <p className="font-medium">{(assignment.requests as any)?.title || "طلب محذوف"}</p>
                          <p className="text-sm text-muted-foreground">
                            {(assignment.requests as any)?.request_number}
                          </p>
                        </div>
                        <div className="text-left">
                          <Badge variant={assignment.is_active ? "secondary" : "outline"}>
                            {assignment.is_active ? "نشط" : "مكتمل"}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(assignment.assigned_at), "dd/MM/yyyy")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>لا توجد تعيينات</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="training">
            <Card>
              <CardHeader>
                <CardTitle>المهام التدريبية</CardTitle>
              </CardHeader>
              <CardContent>
                {trainingAssignments && trainingAssignments.length > 0 ? (
                  <div className="space-y-3">
                    {trainingAssignments.map((ta: any) => (
                      <div key={ta.id} className="p-3 border rounded-lg flex items-center justify-between">
                        <div>
                          <p className="font-medium">{(ta.training_tasks as any)?.title || "مهمة محذوفة"}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge
                              variant={
                                ta.status === "approved"
                                  ? "default"
                                  : ta.status === "rejected"
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {ta.status === "approved"
                                ? "معتمد"
                                : ta.status === "rejected"
                                ? "مرفوض"
                                : ta.status === "submitted"
                                ? "قيد المراجعة"
                                : "جاري العمل"}
                            </Badge>
                            {ta.status === "approved" && (
                              <span className="text-green-600 text-sm flex items-center gap-1">
                                <Star className="w-3 h-3" />
                                +{ta.stars_earned}
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(ta.created_at), "dd/MM/yyyy")}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Award className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>لا توجد مهام تدريبية</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
