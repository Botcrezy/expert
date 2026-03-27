import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { FreelancerSidebar } from "@/components/layout/FreelancerSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { TelegramLinkCard } from "@/components/telegram/TelegramLinkCard";
import { 
  User, 
  Mail, 
  Phone, 
  LinkIcon,
  Briefcase,
  Star,
  Loader2,
  Save,
  Camera,
  Upload,
  Lock,
  Bell,
  CheckCircle2,
  Wallet
} from "lucide-react";

export default function FreelancerSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const { data: profile, isLoading } = useQuery({
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

  // Fetch wallet balance
  const { data: walletBalance } = useQuery({
    queryKey: ["wallet-balance", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { data } = await supabase
        .from("wallet_ledger")
        .select("balance_after")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data?.balance_after || 0;
    },
    enabled: !!user,
  });

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    bio: "",
    portfolioUrl: "",
    hourlyRate: "",
    isAvailable: true,
    avatarUrl: "",
  });

  const [notifications, setNotifications] = useState({
    email: true,
    assignments: true,
  });

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
        avatarUrl: profile.userProfile?.avatar_url || "",
      });
    } else if (user) {
      setFormData(prev => ({
        ...prev,
        email: user.email || "",
      }));
    }
  }, [profile, user]);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار صورة فقط",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "خطأ",
        description: "حجم الصورة يجب أن يكون أقل من 5MB",
        variant: "destructive",
      });
      return;
    }

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      // Use upsert to handle both insert and update cases
      const { error: updateError } = await supabase
        .from("profiles")
        .upsert({
          user_id: user.id,
          avatar_url: avatarUrl,
          full_name: formData.fullName || user.email?.split("@")[0] || "فريلانسر",
          email: user.email,
        }, { onConflict: "user_id" });

      if (updateError) throw updateError;

      setFormData(prev => ({ ...prev, avatarUrl }));
      queryClient.invalidateQueries({ queryKey: ["freelancer-full-profile", user.id] });
      toast({
        title: "تم رفع الصورة بنجاح! ✅",
      });
    } catch (error: any) {
      console.error("Avatar upload error:", error);
      toast({
        title: "حدث خطأ",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("غير مسجل الدخول");

      // Use upsert for profiles
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          user_id: user.id,
          full_name: formData.fullName,
          phone: formData.phone,
          email: user.email,
        }, { onConflict: "user_id" });

      if (profileError) throw profileError;

      // Use upsert for freelancer_profiles
      const { error: freelancerError } = await supabase
        .from("freelancer_profiles")
        .upsert({
          user_id: user.id,
          bio: formData.bio,
          portfolio_url: formData.portfolioUrl || null,
          hourly_rate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : null,
          is_available: formData.isAvailable,
        }, { onConflict: "user_id" });

      if (freelancerError) throw freelancerError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["freelancer-full-profile", user?.id] });
      toast({
        title: "تم حفظ التغييرات بنجاح! ✅",
      });
    },
    onError: (error: any) => {
      console.error("Save error:", error);
      toast({
        title: "حدث خطأ",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleChangePassword = async () => {
    if (!user?.email) return;
    
    try {
      await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      toast({
        title: "إعادة تعيين كلمة المرور",
        description: "تم إرسال رابط إعادة التعيين إلى بريدك الإلكتروني",
      });
    } catch (error: any) {
      toast({
        title: "حدث خطأ",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "F";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const freelancerProfile = profile?.freelancerProfile;

  if (isLoading) {
    return (
      <DashboardLayout sidebar={<FreelancerSidebar />} title="الإعدادات" subtitle="إدارة حسابك">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      sidebar={<FreelancerSidebar />}
      title="الإعدادات"
      subtitle="إدارة حسابك ومعلوماتك الشخصية"
    >
      <div className="max-w-3xl space-y-8">
        {/* Stats Overview */}
        <div className="grid sm:grid-cols-3 gap-6">
          <div className="card-elevated p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
              <Briefcase className="w-6 h-6" />
            </div>
            <p className="text-2xl font-bold text-foreground">{freelancerProfile?.completed_tasks || 0}</p>
            <p className="text-sm text-muted-foreground">مهام مكتملة</p>
          </div>
          <div className="card-elevated p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-yellow-100 text-yellow-600 flex items-center justify-center mx-auto mb-3">
              <Star className="w-6 h-6" />
            </div>
            <p className="text-2xl font-bold text-foreground flex items-center justify-center gap-1">
              {freelancerProfile?.rating || "0.0"}
            </p>
            <p className="text-sm text-muted-foreground">التقييم</p>
          </div>
          <div className="card-elevated p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-3">
              <Wallet className="w-6 h-6" />
            </div>
            <p className="text-2xl font-bold text-foreground">{Number(walletBalance || 0).toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">ج.م في المحفظة</p>
          </div>
        </div>

        {/* Avatar Section */}
        <div className="card-elevated p-6">
          <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
            <Camera className="w-5 h-5" />
            الصورة الشخصية
          </h3>

          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="w-24 h-24">
                <AvatarImage src={formData.avatarUrl} alt={formData.fullName} />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {getInitials(formData.fullName || "F")}
                </AvatarFallback>
              </Avatar>
              
              {uploadingAvatar && (
                <div className="absolute inset-0 bg-background/80 rounded-full flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              )}

              {freelancerProfile?.is_verified && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              <Button 
                variant="outline" 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
              >
                <Upload className="w-4 h-4 ml-2" />
                رفع صورة جديدة
              </Button>
              <p className="text-xs text-muted-foreground">
                JPG, PNG أو GIF. الحد الأقصى 5MB.
              </p>
            </div>
          </div>
        </div>

        {/* Profile Settings */}
        <div className="card-elevated p-6">
          <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
            <User className="w-5 h-5" />
            البيانات الشخصية
          </h3>

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

          <div className="space-y-2 mt-4">
            <Label htmlFor="portfolioUrl">رابط Portfolio</Label>
            <div className="relative">
              <LinkIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
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

          <div className="space-y-2 mt-4">
            <Label htmlFor="bio">نبذة عنك</Label>
            <Textarea
              id="bio"
              rows={4}
              placeholder="اكتب نبذة مختصرة عن خبراتك ومهاراتك..."
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            />
          </div>

          {/* Availability Toggle */}
          <div className="mt-6 pt-6 border-t border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">متاح للعمل</p>
                <p className="text-sm text-muted-foreground">السماح بتلقي مهام جديدة</p>
              </div>
              <Switch
                checked={formData.isAvailable}
                onCheckedChange={(checked) => setFormData({ ...formData, isAvailable: checked })}
              />
            </div>
          </div>

          <Button 
            className="mt-6" 
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                حفظ التغييرات
              </>
            )}
          </Button>
        </div>

        {/* Security */}
        <div className="card-elevated p-6">
          <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
            <Lock className="w-5 h-5" />
            الأمان
          </h3>

          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">
              لتغيير كلمة المرور، سنرسل لك رابط إلى بريدك الإلكتروني
            </p>
            <Button variant="outline" onClick={handleChangePassword}>
              <Lock className="w-4 h-4" />
              تغيير كلمة المرور
            </Button>
          </div>
        </div>

        {/* Notifications */}
        <div className="card-elevated p-6">
          <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
            <Bell className="w-5 h-5" />
            الإشعارات
          </h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">إشعارات البريد</p>
                <p className="text-sm text-muted-foreground">استلام إشعارات عبر البريد الإلكتروني</p>
              </div>
              <Switch
                checked={notifications.email}
                onCheckedChange={(checked) => setNotifications({ ...notifications, email: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">إشعارات التعيينات</p>
                <p className="text-sm text-muted-foreground">إشعارات عند تعيينك لمهام جديدة</p>
              </div>
              <Switch
                checked={notifications.assignments}
                onCheckedChange={(checked) => setNotifications({ ...notifications, assignments: checked })}
              />
            </div>
          </div>
        </div>

        {/* Account Type */}
        <div className="card-elevated p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            نوع الحساب
          </h3>
          <div className="flex items-center gap-3">
            <Badge className={freelancerProfile?.is_verified ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}>
              {freelancerProfile?.is_verified ? "فريلانسر موثق ✓" : "في انتظار التوثيق"}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {freelancerProfile?.is_verified 
                ? "يمكنك استلام مهام والعمل مع العملاء"
                : "حسابك قيد المراجعة من فريق الإدارة"
              }
            </span>
          </div>
        </div>

        {/* Telegram Link */}
        <TelegramLinkCard userType="freelancer" />
      </div>
    </DashboardLayout>
  );
}
