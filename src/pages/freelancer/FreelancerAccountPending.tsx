import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  User,
  Mail,
  Phone,
  Briefcase,
  Globe,
  LogOut,
  Loader2,
  RefreshCw,
  FileText,
  Download,
  Linkedin,
  Github,
} from "lucide-react";

export default function FreelancerAccountPending() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { data: settings } = usePlatformSettings();

  // Fetch freelancer profile status
  const { data: freelancerProfile, isLoading, refetch } = useQuery({
    queryKey: ["freelancer-profile-status", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("freelancer_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    refetchInterval: 30000, // Check every 30 seconds
  });

  // Fetch profile data
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
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

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ["all-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*");
      return data || [];
    },
  });

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await signOut();
    navigate("/");
  };

  // If approved, redirect to dashboard
  if (freelancerProfile?.verification_status === "approved" && freelancerProfile?.is_verified) {
    navigate("/freelancer/dashboard", { replace: true });
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  const getStatusInfo = () => {
    switch (freelancerProfile?.verification_status) {
      case "pending":
        return {
          icon: Clock,
          iconColor: "text-warning",
          bgColor: "bg-warning/10",
          title: "حسابك قيد المراجعة",
          description: "فريقنا يراجع بياناتك حالياً. سنتواصل معك قريباً.",
          badge: "قيد المراجعة",
          badgeVariant: "secondary" as const,
        };
      case "rejected":
        return {
          icon: XCircle,
          iconColor: "text-destructive",
          bgColor: "bg-destructive/10",
          title: "للأسف، تم رفض طلبك",
          description: "يمكنك تعديل بياناتك وإعادة التقديم مرة أخرى.",
          badge: "مرفوض",
          badgeVariant: "destructive" as const,
        };
      case "needs_update":
        return {
          icon: AlertCircle,
          iconColor: "text-info",
          bgColor: "bg-info/10",
          title: "مطلوب تحديث البيانات",
          description: "يرجى تحديث بياناتك حسب ملاحظات فريق المراجعة.",
          badge: "outline" as const,
        };
      default:
        return {
          icon: Clock,
          iconColor: "text-warning",
          bgColor: "bg-warning/10",
          title: "حسابك قيد المراجعة",
          description: "فريقنا يراجع بياناتك حالياً.",
          badge: "قيد المراجعة",
          badgeVariant: "secondary" as const,
        };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  const getCategoryName = (categoryId: string) => {
    const category = categories?.find((c: any) => c.id === categoryId);
    return category?.name_ar || categoryId;
  };

  const supportEmail = settings?.supportEmail || "support@sityexperts.com";

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              {settings?.logoUrl ? (
                <img 
                  src={settings.logoUrl} 
                  alt={settings?.siteName || "Sity Experts"} 
                  className="w-10 h-10 rounded-xl object-contain"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-lg">
                    {settings?.siteName?.charAt(0) || "S"}
                  </span>
                </div>
              )}
              <span className="font-bold text-xl">{settings?.siteName || "Sity Experts"}</span>
            </Link>

            <Button
              variant="ghost"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <LogOut className="w-4 h-4" />
                  تسجيل الخروج
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Status Card */}
        <Card className="mb-8 border-2">
          <CardContent className="pt-8 pb-8">
            <div className="text-center">
              <div className={`w-20 h-20 rounded-full ${statusInfo.bgColor} flex items-center justify-center mx-auto mb-6`}>
                <StatusIcon className={`w-10 h-10 ${statusInfo.iconColor}`} />
              </div>
              
              <Badge variant={statusInfo.badgeVariant} className="mb-4 text-sm px-4 py-1">
                {statusInfo.badge}
              </Badge>
              
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
                {statusInfo.title}
              </h1>
              <p className="text-muted-foreground text-lg max-w-md mx-auto mb-6">
                {statusInfo.description}
              </p>

              <Button
                variant="outline"
                onClick={() => refetch()}
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                تحديث الحالة
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Your Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              بياناتك المُرسلة
            </CardTitle>
            <CardDescription>
              هذه البيانات التي أرسلتها للمراجعة
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Personal Info */}
            <div>
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <User className="w-4 h-4" />
                المعلومات الشخصية
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <User className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">الاسم</p>
                    <p className="font-medium">{profile?.full_name || "غير محدد"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Mail className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">البريد الإلكتروني</p>
                    <p className="font-medium">{profile?.email || user?.email}</p>
                  </div>
                </div>
                {profile?.phone && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Phone className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">رقم الهاتف</p>
                      <p className="font-medium">{profile.phone}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Professional Info */}
            <div>
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                المعلومات المهنية
              </h3>
              
              {freelancerProfile?.bio && (
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground mb-1">نبذة عنك</p>
                  <p className="text-foreground bg-muted/50 p-3 rounded-lg">{freelancerProfile.bio}</p>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                {freelancerProfile?.hourly_rate && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <span className="text-lg">💰</span>
                    <div>
                      <p className="text-xs text-muted-foreground">السعر بالساعة</p>
                      <p className="font-medium">{freelancerProfile.hourly_rate} ج.م</p>
                    </div>
                  </div>
                )}
                {freelancerProfile?.portfolio_url && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Globe className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">معرض الأعمال</p>
                      <a 
                        href={freelancerProfile.portfolio_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="font-medium text-primary hover:underline truncate block max-w-[200px]"
                      >
                        {freelancerProfile.portfolio_url}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Categories & Skills */}
            <div>
              <h3 className="font-semibold text-foreground mb-4">التخصصات والمهارات</h3>
              
              {freelancerProfile?.categories && freelancerProfile.categories.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground mb-2">التخصصات</p>
                  <div className="flex flex-wrap gap-2">
                    {freelancerProfile.categories.map((cat: string) => (
                      <Badge key={cat} variant="secondary" className="text-sm">
                        {getCategoryName(cat)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {freelancerProfile?.skills && (freelancerProfile.skills as any)?.skills?.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">المهارات</p>
                  <div className="flex flex-wrap gap-2">
                    {(freelancerProfile.skills as any).skills.map((skill: string) => (
                      <Badge key={skill} variant="outline" className="text-sm">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Help Section */}
        <div className="mt-8 text-center">
          <p className="text-muted-foreground mb-4">
            محتاج مساعدة؟ تواصل معنا على
          </p>
          <a 
            href={`mailto:${supportEmail}`} 
            className="text-primary hover:underline font-medium"
          >
            {supportEmail}
          </a>
        </div>
      </main>
    </div>
  );
}
