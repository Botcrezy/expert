import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { FreelancerSidebar } from "@/components/layout/FreelancerSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useTableSubscription } from "@/hooks/useRealtimeSubscription";
import { z } from "zod";
import { 
  User, 
  Mail, 
  Phone, 
  Briefcase,
  Star,
  Loader2,
  Save,
  CheckCircle2,
  FileText,
  Globe,
  Clock,
  GraduationCap,
  Github,
  Linkedin,
  TrendingUp
} from "lucide-react";

export default function FreelancerProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const USERNAME_REGEX = /^[a-z0-9_]+$/;
  const usernameSchema = z
    .string()
    .trim()
    .min(3, "اسم المستخدم لازم يكون 3 حروف على الأقل")
    .max(30, "اسم المستخدم طويل جداً (حد أقصى 30)")
    .regex(USERNAME_REGEX, "مسموح فقط: حروف/أرقام إنجليزية و underscore (_) بدون مسافات أو رموز");

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["freelancer-full-profile", user?.id],
    queryFn: async () => {
      const [{ data: userProfile }, { data: freelancerProfile }] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user?.id).maybeSingle(),
        supabase.from("freelancer_profiles").select("*").eq("user_id", user?.id).maybeSingle(),
      ]);
      return { userProfile, freelancerProfile };
    },
    enabled: !!user,
  });

  // Fetch assignments count
  const { data: assignmentsCount } = useQuery({
    queryKey: ["freelancer-assignments-count", user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("assignments")
        .select("*", { count: "exact", head: true })
        .eq("freelancer_id", user?.id);
      return count || 0;
    },
    enabled: !!user,
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      return data || [];
    },
  });

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    bio: "",
    portfolioUrl: "",
    hourlyRate: "",
    isAvailable: true,
    experience: "",
    selectedCategory: "",
    linkedinUrl: "",
    githubUrl: "",
    username: "",
  });

  const [usernameError, setUsernameError] = useState<string | null>(null);

  // Realtime: reflect username/link changes immediately
  const realtimeUserFilter = user?.id ? `user_id=eq.${user.id}` : "user_id=eq.__none__";
  useTableSubscription(
    "freelancer_profiles",
    [["freelancer-full-profile", user?.id], ["freelancer-profile", user?.id]],
    { filter: realtimeUserFilter }
  );
  useTableSubscription(
    "freelancer_portfolios",
    [["freelancer-portfolio", user?.id]],
    { filter: realtimeUserFilter }
  );

  useEffect(() => {
    if (profile) {
      setFormData({
        fullName: profile.userProfile?.full_name || "",
        email: profile.userProfile?.email || user?.email || "",
        phone: profile.userProfile?.phone || "",
        bio: profile.freelancerProfile?.bio || "",
        portfolioUrl: profile.freelancerProfile?.portfolio_url || "",
        hourlyRate: profile.freelancerProfile?.hourly_rate?.toString() || "",
        isAvailable: profile.freelancerProfile?.is_available ?? true,
        experience: profile.freelancerProfile?.experience || "",
        selectedCategory: profile.freelancerProfile?.categories?.[0] || "",
        linkedinUrl: (profile.freelancerProfile as any)?.linkedin_url || "",
        githubUrl: (profile.freelancerProfile as any)?.github_url || "",
        username: (profile.freelancerProfile as any)?.username || "",
      });
    }
  }, [profile, user]);

  const saveMutation = useMutation({
    mutationFn: async ({ previousUsername }: { previousUsername: string | null }) => {
      if (!user) throw new Error("غير مسجل الدخول");

      const nextUsername = String(formData.username || "").trim().toLowerCase();
      const parsed = usernameSchema.safeParse(nextUsername);
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message || "اسم المستخدم غير صالح");
      }

      await supabase
        .from("profiles")
        .update({
          full_name: formData.fullName,
          phone: formData.phone,
        })
        .eq("user_id", user.id);

      await supabase
        .from("freelancer_profiles")
        .update({
          bio: formData.bio,
          portfolio_url: formData.portfolioUrl,
          hourly_rate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : null,
          is_available: formData.isAvailable,
          experience: formData.experience,
          categories: formData.selectedCategory ? [formData.selectedCategory] : [],
          linkedin_url: formData.linkedinUrl,
          github_url: formData.githubUrl,
          username: nextUsername,
        })
        .eq("user_id", user.id);

      // Keep portfolio link synced with username
      if (previousUsername && previousUsername !== nextUsername) {
        const { data: existingPortfolio, error: portErr } = await supabase
          .from("freelancer_portfolios")
          .select("id, slug")
          .eq("user_id", user.id)
          .maybeSingle();
        if (portErr) throw portErr;

        if (existingPortfolio?.id && existingPortfolio.slug && existingPortfolio.slug !== nextUsername) {
          const oldSlug = existingPortfolio.slug;

          const { error: updErr } = await supabase
            .from("freelancer_portfolios")
            .update({ slug: nextUsername })
            .eq("id", existingPortfolio.id);
          if (updErr) throw updErr;

          // Record history so old links can redirect (if your backend uses it)
          await supabase.from("freelancer_portfolio_slug_history").insert({
            portfolio_id: existingPortfolio.id,
            old_slug: oldSlug,
            new_slug: nextUsername,
            user_id: user.id,
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["freelancer-full-profile"] });
      queryClient.invalidateQueries({ queryKey: ["freelancer-portfolio"] });
      setUsernameError(null);
      toast({ title: "تم حفظ التغييرات بنجاح! ✅" });
    },
    onError: (error: any) => {
      toast({ title: "حدث خطأ", description: error.message, variant: "destructive" });
    },
  });

  const handleSave = () => {
    const nextUsername = String(formData.username || "").trim().toLowerCase();
    const parsed = usernameSchema.safeParse(nextUsername);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || "اسم المستخدم غير صالح";
      setUsernameError(msg);
      toast({ title: "تحقق من اسم المستخدم", description: msg, variant: "destructive" });
      return;
    }

    saveMutation.mutate({ previousUsername: profile?.freelancerProfile?.username || null });
  };

  const freelancerProfile = profile?.freelancerProfile;
  const totalStars = freelancerProfile?.stars || 0;
  const maxStars = 100;
  const starsProgress = Math.min((totalStars / maxStars) * 100, 100);

  if (profileLoading) {
    return (
      <DashboardLayout sidebar={<FreelancerSidebar />} title="الملف الشخصي">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      sidebar={<FreelancerSidebar />}
      title="الملف الشخصي"
      subtitle="إدارة بياناتك ومهاراتك"
    >
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <div className="h-24 bg-gradient-to-br from-primary via-primary/80 to-primary/60" />
            <CardContent className="-mt-12 text-center">
              <div className="w-24 h-24 rounded-full bg-primary/10 border-4 border-background text-primary flex items-center justify-center text-3xl font-bold mx-auto mb-4 shadow-lg">
                {formData.fullName?.charAt(0) || "F"}
              </div>
              <h3 className="text-xl font-semibold text-foreground">{formData.fullName}</h3>
              <p className="text-muted-foreground text-sm">{formData.email}</p>
              
              {freelancerProfile?.is_verified ? (
                <div className="inline-flex items-center gap-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1 rounded-full text-sm mt-4">
                  <CheckCircle2 className="w-4 h-4" />
                  حساب موثق
                </div>
              ) : (
                <div className="inline-flex items-center gap-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-3 py-1 rounded-full text-sm mt-4">
                  <Clock className="w-4 h-4" />
                  {freelancerProfile?.verification_status === "rejected" ? "تم الرفض" : "قيد المراجعة"}
                </div>
              )}

              {/* Stars Progress */}
              <div className="mt-6 pt-4 border-t border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    النجوم
                  </span>
                  <span className="text-sm font-bold">{totalStars}/{maxStars}</span>
                </div>
                <Progress value={starsProgress} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  أكمل المهام لزيادة نجومك
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-border">
                <div>
                  <p className="text-2xl font-bold text-foreground">{freelancerProfile?.completed_tasks || 0}</p>
                  <p className="text-xs text-muted-foreground">مهمة مكتملة</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{assignmentsCount || 0}</p>
                  <p className="text-xs text-muted-foreground">تعيين</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{Number(freelancerProfile?.total_earnings || 0).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">ج.م</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Availability Toggle */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="text-right">
                  <p className="font-medium text-foreground">متاح للعمل</p>
                  <p className="text-sm text-muted-foreground">السماح بتلقي مهام جديدة</p>
                </div>
                <Switch
                  checked={formData.isAvailable}
                  onCheckedChange={(checked) => setFormData({ ...formData, isAvailable: checked })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                إحصائيات سريعة
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">التقييم</span>
                <span className="font-medium">{freelancerProfile?.rating || "0.0"}/5</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">المهام التدريبية</span>
                <span className="font-medium">{freelancerProfile?.training_completed || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">تاريخ الانضمام</span>
                <span className="font-medium text-sm">
                  {freelancerProfile?.created_at 
                    ? new Date(freelancerProfile.created_at).toLocaleDateString("ar-EG")
                    : "-"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Edit Form */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="personal" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="personal" className="gap-2">
                <User className="w-4 h-4" />
                البيانات الشخصية
              </TabsTrigger>
              <TabsTrigger value="professional" className="gap-2">
                <Briefcase className="w-4 h-4" />
                التخصص
              </TabsTrigger>
              <TabsTrigger value="portfolio" className="gap-2">
                <FileText className="w-4 h-4" />
                الروابط
              </TabsTrigger>
            </TabsList>

            <TabsContent value="personal">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    البيانات الشخصية
                  </CardTitle>
                  <CardDescription>معلوماتك الأساسية التي تظهر للمنصة</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">الاسم الكامل</Label>
                      <div className="relative">
                        <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                          id="fullName"
                          className="pr-10"
                          value={formData.fullName}
                          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">البريد الإلكتروني</Label>
                      <div className="relative">
                        <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          className="pr-10"
                          value={formData.email}
                          disabled
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">رقم الهاتف</Label>
                      <div className="relative">
                        <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                          id="phone"
                          type="tel"
                          className="pr-10"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="hourlyRate">السعر بالساعة (ج.م)</Label>
                      <div className="relative">
                        <Briefcase className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                          id="hourlyRate"
                          type="number"
                          className="pr-10"
                          value={formData.hourlyRate}
                          onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">نبذة عنك</Label>
                    <Textarea
                      id="bio"
                      rows={4}
                      placeholder="اكتب نبذة مختصرة عن خبراتك ومهاراتك..."
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">{formData.bio.length}/500 حرف</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="experience">سنوات الخبرة</Label>
                    <Select 
                      value={formData.experience} 
                      onValueChange={(v) => setFormData({ ...formData, experience: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر مستوى الخبرة" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="less_than_1">أقل من سنة</SelectItem>
                        <SelectItem value="1-3">1-3 سنوات</SelectItem>
                        <SelectItem value="3-5">3-5 سنوات</SelectItem>
                        <SelectItem value="5+">أكثر من 5 سنوات</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="professional">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="w-5 h-5" />
                    التخصص الرئيسي
                  </CardTitle>
                  <CardDescription>اختر تخصصك الأساسي في المنصة</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <Label>اختر تخصصك الرئيسي</Label>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {categories?.map((cat: any) => (
                        <div 
                          key={cat.id}
                          className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            formData.selectedCategory === cat.id
                              ? "border-primary bg-primary/5 shadow-md"
                              : "border-border hover:border-primary/50"
                          }`}
                          onClick={() => setFormData({ ...formData, selectedCategory: cat.id })}
                        >
                          <div className="flex-1">
                            <p className="font-medium">{cat.name_ar}</p>
                            {cat.description && (
                              <p className="text-xs text-muted-foreground mt-1">{cat.description}</p>
                            )}
                          </div>
                          {formData.selectedCategory === cat.id && (
                            <CheckCircle2 className="w-5 h-5 text-primary" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {formData.selectedCategory && (
                    <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                        <span className="font-medium">تخصصك الحالي:</span>
                        <Badge variant="secondary">
                          {categories?.find((c: any) => c.id === formData.selectedCategory)?.name_ar}
                        </Badge>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="portfolio">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    معلومات البورتفوليو والروابط
                  </CardTitle>
                  <CardDescription>أضف روابطك الخارجية واسم المستخدم</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="username">اسم المستخدم</Label>
                      <div className="relative">
                        <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                          id="username"
                          className="pr-10"
                          placeholder="مثال: ahmed_design"
                          value={formData.username}
                          onChange={(e) => {
                            const raw = e.target.value.toLowerCase();
                            const cleaned = raw.replace(/[^a-z0-9_]/g, "");
                            setFormData({ ...formData, username: cleaned });
                            if (usernameError) setUsernameError(null);
                          }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        مطلوب — مسموح فقط: حروف/أرقام إنجليزية و underscore (_) بدون مسافات أو رموز.
                      </p>
                      {usernameError && (
                        <p className="text-xs text-destructive">{usernameError}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="portfolioUrl">رابط Portfolio خارجي</Label>
                      <div className="relative">
                        <Globe className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                          id="portfolioUrl"
                          type="url"
                          className="pr-10"
                          placeholder="https://..."
                          value={formData.portfolioUrl}
                          onChange={(e) => setFormData({ ...formData, portfolioUrl: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="linkedinUrl">LinkedIn</Label>
                      <div className="relative">
                        <Linkedin className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                          id="linkedinUrl"
                          type="url"
                          className="pr-10"
                          placeholder="https://linkedin.com/in/..."
                          value={formData.linkedinUrl}
                          onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="githubUrl">GitHub</Label>
                      <div className="relative">
                        <Github className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                          id="githubUrl"
                          type="url"
                          className="pr-10"
                          placeholder="https://github.com/..."
                          value={formData.githubUrl}
                          onChange={(e) => setFormData({ ...formData, githubUrl: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>


          </Tabs>

          {/* Save Button */}
          <div className="mt-6 flex justify-end">
            <Button 
              size="lg"
              onClick={handleSave}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin ml-2" />
              ) : (
                <Save className="w-4 h-4 ml-2" />
              )}
              حفظ التغييرات
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
