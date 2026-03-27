import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ClientSidebar } from "@/components/layout/ClientSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TelegramLinkCard } from "@/components/telegram/TelegramLinkCard";
import { 
  User, 
  Mail, 
  Phone, 
  Lock,
  Bell,
  Loader2,
  Save,
  Camera,
  Upload,
  CreditCard,
  Crown,
  CheckCircle2
} from "lucide-react";

export default function ClientSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profile, setProfile] = useState({
    fullName: "",
    email: "",
    phone: "",
    avatarUrl: "",
  });
  const [notifications, setNotifications] = useState({
    email: true,
    updates: true,
  });

  // Fetch subscription and credits
  const { data: subscription } = useQuery({
    queryKey: ["client-subscription", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("client_subscriptions")
        .select("*, plans(*)")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Fetch credit balance
  const { data: creditBalance } = useQuery({
    queryKey: ["credit-balance", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { data } = await supabase
        .from("credits_ledger")
        .select("balance_after")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data?.balance_after || 0;
    },
    enabled: !!user,
  });

  // Fetch user profile
  const { data: profileData, refetch: refetchProfile } = useQuery({
    queryKey: ["user-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (profileData) {
      setProfile({
        fullName: profileData.full_name || "",
        email: profileData.email || user?.email || "",
        phone: profileData.phone || "",
        avatarUrl: profileData.avatar_url || "",
      });
    } else if (user) {
      setProfile(prev => ({
        ...prev,
        email: user.email || "",
      }));
    }
  }, [profileData, user]);

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
          full_name: profile.fullName || user.email?.split("@")[0] || "مستخدم",
          email: user.email,
        }, { onConflict: "user_id" });

      if (updateError) throw updateError;

      setProfile(prev => ({ ...prev, avatarUrl }));
      queryClient.invalidateQueries({ queryKey: ["user-profile", user.id] });
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

  const handleSaveProfile = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Use upsert to handle both insert and update cases
      const { error } = await supabase
        .from("profiles")
        .upsert({
          user_id: user.id,
          full_name: profile.fullName,
          phone: profile.phone,
          email: user.email,
        }, { onConflict: "user_id" });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["user-profile", user.id] });
      toast({
        title: "تم حفظ التغييرات بنجاح! ✅",
      });
    } catch (error: any) {
      console.error("Save profile error:", error);
      toast({
        title: "حدث خطأ",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const currentPlan = subscription?.plans as any;

  return (
    <DashboardLayout
      sidebar={<ClientSidebar />}
      title="الإعدادات"
      subtitle="إدارة حسابك وتفضيلاتك"
    >
      <div className="max-w-3xl space-y-8">
        {/* Subscription & Credits Overview */}
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="card-elevated p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Crown className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">الباقة الحالية</h3>
                <p className="text-sm text-muted-foreground">
                  {currentPlan?.name_ar || "لا يوجد اشتراك"}
                </p>
              </div>
            </div>
            {subscription && (
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground">الكريديت المتبقي</span>
                <Badge variant="secondary" className="text-lg font-bold">
                  {subscription.credits_remaining}
                </Badge>
              </div>
            )}
            {!subscription && (
              <p className="text-sm text-muted-foreground">
                اشترك في باقة للحصول على كريديت وإنشاء طلبات
              </p>
            )}
          </div>

          <div className="card-elevated p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 text-green-600 flex items-center justify-center">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">رصيد الكريديت</h3>
                <p className="text-sm text-muted-foreground">كريديت إضافي</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">الرصيد الحالي</span>
              <Badge variant="secondary" className="text-lg font-bold">
                {creditBalance || 0}
              </Badge>
            </div>
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
                <AvatarImage src={profile.avatarUrl} alt={profile.fullName} />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {getInitials(profile.fullName || "U")}
                </AvatarFallback>
              </Avatar>
              
              {uploadingAvatar && (
                <div className="absolute inset-0 bg-background/80 rounded-full flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
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
            بيانات الحساب
          </h3>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">الاسم الكامل</Label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="fullName"
                  className="pr-10"
                  value={profile.fullName}
                  onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
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
                  value={profile.email}
                  disabled
                />
              </div>
              <p className="text-xs text-muted-foreground">لا يمكن تغيير البريد الإلكتروني</p>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="phone">رقم الهاتف</Label>
              <div className="relative">
                <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  className="pr-10"
                  placeholder="01xxxxxxxxx"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                />
              </div>
            </div>
          </div>

          <Button onClick={handleSaveProfile} disabled={loading} className="mt-6">
            {loading ? (
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
                <p className="font-medium text-foreground">تحديثات المشاريع</p>
                <p className="text-sm text-muted-foreground">إشعارات عند تحديث حالة طلباتك</p>
              </div>
              <Switch
                checked={notifications.updates}
                onCheckedChange={(checked) => setNotifications({ ...notifications, updates: checked })}
              />
            </div>
          </div>
        </div>

        {/* Telegram Link */}
        <TelegramLinkCard userType="client" />

        {/* Account Type */}
        <div className="card-elevated p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            نوع الحساب
          </h3>
          <div className="flex items-center gap-3">
            <Badge className="bg-blue-100 text-blue-700">عميل</Badge>
            <span className="text-sm text-muted-foreground">
              يمكنك إنشاء طلبات والحصول على خدمات من المنصة
            </span>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
