import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTableSubscription } from "@/hooks/useRealtimeSubscription";
import { 
  ArrowRight,
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Shield,
  Briefcase,
  CreditCard,
  ShieldCheck,
  Star,
  Clock,
  Globe,
  FileText,
  Loader2,
  Wallet,
  Package,
  CheckCircle,
  XCircle
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

export default function AdminUserDetails() {
  const { userId } = useParams();
  const navigate = useNavigate();

  // Realtime subscriptions
  useTableSubscription("profiles", [["user-details", userId!]]);
  useTableSubscription("identity_verifications", [["user-verification", userId!]]);

  const { data, isLoading } = useQuery({
    queryKey: ["user-details", userId],
    queryFn: async () => {
      if (!userId) return null;

      // Get profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      // Get role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .single();

      // Get subscription
      const { data: subscription } = await supabase
        .from("client_subscriptions")
        .select("*, plans(*)")
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle();

      // Get credits ledger
      const { data: credits } = await supabase
        .from("credits_ledger")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);

      // Get wallet ledger
      const { data: wallet } = await supabase
        .from("wallet_ledger")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);

      // Get identity verification
      const { data: verification } = await supabase
        .from("identity_verifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Get orders
      const { data: orders } = await supabase
        .from("orders")
        .select("*, order_items(*, products(name_ar))")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);

      // Get requests
      const { data: requests } = await supabase
        .from("requests")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);

      // Get freelancer profile if applicable
      let freelancerProfile = null;
      if (roleData?.role === "freelancer") {
        const { data: fp } = await supabase
          .from("freelancer_profiles")
          .select("*")
          .eq("user_id", userId)
          .single();
        freelancerProfile = fp;
      }

      // Get brands
      const { data: brands } = await supabase
        .from("brands")
        .select("*")
        .eq("user_id", userId);

      return {
        profile,
        role: roleData?.role || "client",
        subscription,
        credits,
        wallet,
        verification,
        orders,
        requests,
        freelancerProfile,
        brands,
      };
    },
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <DashboardLayout sidebar={<AdminSidebar />}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!data?.profile) {
    return (
      <DashboardLayout sidebar={<AdminSidebar />}>
        <div className="text-center py-12">
          <p className="text-muted-foreground">لم يتم العثور على المستخدم</p>
          <Button onClick={() => navigate(-1)} className="mt-4">
            <ArrowRight className="w-4 h-4 ml-2" />
            رجوع
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const { profile, role, subscription, credits, wallet, verification, orders, requests, freelancerProfile, brands } = data;

  const getRoleBadge = (role: string) => {
    const roles: Record<string, { label: string; class: string }> = {
      client: { label: "عميل", class: "bg-blue-100 text-blue-700" },
      freelancer: { label: "فريلانسر", class: "bg-purple-100 text-purple-700" },
      admin: { label: "أدمن", class: "bg-red-100 text-red-700" },
      team_leader: { label: "قائد فريق", class: "bg-orange-100 text-orange-700" },
    };
    return roles[role] || { label: role, class: "bg-gray-100 text-gray-700" };
  };

  const currentBalance = wallet?.[0]?.balance_after || 0;
  const currentCredits = credits?.[0]?.balance_after || subscription?.credits_remaining || 0;

  return (
    <DashboardLayout
      sidebar={<AdminSidebar />}
      title="تفاصيل المستخدم"
      subtitle={profile.full_name}
    >
      <div className="space-y-6">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowRight className="w-4 h-4 ml-2" />
          رجوع
        </Button>

        {/* User Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <Avatar className="w-20 h-20">
                <AvatarImage src={profile.avatar_url} />
                <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                  {profile.full_name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-bold">{profile.full_name}</h2>
                  <Badge className={getRoleBadge(role).class}>
                    {getRoleBadge(role).label}
                  </Badge>
                  {profile.is_verified && (
                    <Badge className="bg-blue-100 text-blue-700">
                      <ShieldCheck className="w-3 h-3 ml-1" />
                      موثق
                    </Badge>
                  )}
                  {profile.identity_verified && (
                    <Badge className="bg-success/10 text-success">
                      <Shield className="w-3 h-3 ml-1" />
                      هوية موثقة
                    </Badge>
                  )}
                  {profile.is_banned && (
                    <Badge variant="destructive">محظور</Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
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
                    انضم {format(new Date(profile.created_at), "dd MMMM yyyy", { locale: ar })}
                  </span>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-primary">{currentCredits}</p>
                  <p className="text-xs text-muted-foreground">كريديت</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-success">{currentBalance}</p>
                  <p className="text-xs text-muted-foreground">ج.م</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="flex-wrap">
            <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
            <TabsTrigger value="verification">التحقق من الهوية</TabsTrigger>
            {role === "freelancer" && (
              <TabsTrigger value="freelancer">بيانات الفريلانسر</TabsTrigger>
            )}
            <TabsTrigger value="orders">الطلبات</TabsTrigger>
            <TabsTrigger value="requests">المهام</TabsTrigger>
            <TabsTrigger value="transactions">المعاملات</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Profile Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="w-5 h-5" />
                    البيانات الشخصية
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">الاسم</p>
                    <p className="font-medium">{profile.full_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">البريد</p>
                    <p className="font-medium">{profile.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">الهاتف</p>
                    <p className="font-medium">{profile.phone || "غير محدد"}</p>
                  </div>
                  {profile.address && (
                    <div>
                      <p className="text-sm text-muted-foreground">العنوان</p>
                      <p className="font-medium">{profile.address}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Subscription */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    الاشتراك
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {subscription ? (
                    <>
                      <div>
                        <p className="text-sm text-muted-foreground">الباقة</p>
                        <p className="font-medium">{(subscription.plans as any)?.name_ar}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">الكريديت المتبقي</p>
                        <p className="font-medium">{subscription.credits_remaining}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">تاريخ الانتهاء</p>
                        <p className="font-medium">
                          {subscription.expires_at 
                            ? format(new Date(subscription.expires_at), "dd MMMM yyyy", { locale: ar })
                            : "غير محدد"}
                        </p>
                      </div>
                    </>
                  ) : (
                    <p className="text-muted-foreground">لا يوجد اشتراك نشط</p>
                  )}
                </CardContent>
              </Card>

              {/* Brands */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Briefcase className="w-5 h-5" />
                    البراندات
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {brands && brands.length > 0 ? (
                    <div className="space-y-2">
                      {brands.map((brand: any) => (
                        <div key={brand.id} className="p-2 bg-muted rounded-lg">
                          <p className="font-medium">{brand.name}</p>
                          <p className="text-sm text-muted-foreground">{brand.industry}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">لا توجد براندات</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="verification">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  حالة التحقق من الهوية
                </CardTitle>
              </CardHeader>
              <CardContent>
                {verification ? (
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      {verification.status === "pending" && (
                        <Badge className="bg-warning/10 text-warning text-base px-4 py-2">
                          <Clock className="w-4 h-4 ml-2" />
                          قيد المراجعة
                        </Badge>
                      )}
                      {verification.status === "approved" && (
                        <Badge className="bg-success/10 text-success text-base px-4 py-2">
                          <CheckCircle className="w-4 h-4 ml-2" />
                          تم التحقق
                        </Badge>
                      )}
                      {verification.status === "rejected" && (
                        <Badge className="bg-destructive/10 text-destructive text-base px-4 py-2">
                          <XCircle className="w-4 h-4 ml-2" />
                          مرفوض
                        </Badge>
                      )}
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">الاسم</p>
                        <p className="font-medium">{verification.full_name}</p>
                      </div>
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">الرقم القومي</p>
                        <p className="font-medium font-mono">{verification.national_id}</p>
                      </div>
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">المدينة</p>
                        <p className="font-medium">{verification.city}</p>
                      </div>
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">المحافظة</p>
                        <p className="font-medium">{verification.governorate}</p>
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium mb-2">وجه البطاقة</p>
                        <img 
                          src={verification.id_front_url} 
                          alt="Front ID" 
                          className="w-full h-48 object-contain bg-muted rounded-lg"
                        />
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-2">ظهر البطاقة</p>
                        <img 
                          src={verification.id_back_url} 
                          alt="Back ID" 
                          className="w-full h-48 object-contain bg-muted rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Shield className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">لم يقدم المستخدم طلب تحقق من الهوية بعد</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {role === "freelancer" && freelancerProfile && (
            <TabsContent value="freelancer">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5" />
                    بيانات الفريلانسر
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 bg-muted rounded-lg text-center">
                      <Star className="w-8 h-8 mx-auto text-yellow-500 mb-2" />
                      <p className="text-2xl font-bold">{freelancerProfile.stars || 0}</p>
                      <p className="text-sm text-muted-foreground">نجمة</p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg text-center">
                      <CheckCircle className="w-8 h-8 mx-auto text-success mb-2" />
                      <p className="text-2xl font-bold">{freelancerProfile.completed_tasks || 0}</p>
                      <p className="text-sm text-muted-foreground">مهمة مكتملة</p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg text-center">
                      <Wallet className="w-8 h-8 mx-auto text-primary mb-2" />
                      <p className="text-2xl font-bold">{freelancerProfile.total_earnings || 0}</p>
                      <p className="text-sm text-muted-foreground">إجمالي الأرباح</p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg text-center">
                      <Clock className="w-8 h-8 mx-auto text-blue-500 mb-2" />
                      <p className="text-2xl font-bold">{freelancerProfile.hourly_rate || "-"}</p>
                      <p className="text-sm text-muted-foreground">ج.م/ساعة</p>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground mb-2">نبذة</p>
                      <p>{freelancerProfile.bio || "غير محدد"}</p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground mb-2">التخصصات</p>
                      <div className="flex flex-wrap gap-2">
                        {freelancerProfile.categories?.map((cat: string) => (
                          <Badge key={cat} variant="secondary">{cat}</Badge>
                        ))}
                      </div>
                    </div>
                    {freelancerProfile.portfolio_url && (
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground mb-2">Portfolio</p>
                        <a 
                          href={freelancerProfile.portfolio_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          <Globe className="w-4 h-4" />
                          {freelancerProfile.portfolio_url}
                        </a>
                      </div>
                    )}
                    {freelancerProfile.cv_url && (
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground mb-2">السيرة الذاتية</p>
                        <a 
                          href={freelancerProfile.cv_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          <FileText className="w-4 h-4" />
                          عرض CV
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2">حالة التحقق</p>
                    <div className="flex gap-2">
                      <Badge variant={freelancerProfile.is_verified ? "default" : "secondary"}>
                        {freelancerProfile.is_verified ? "موثق" : "غير موثق"}
                      </Badge>
                      <Badge variant="outline">
                        {freelancerProfile.verification_status === "approved" ? "مقبول" :
                         freelancerProfile.verification_status === "pending" ? "قيد المراجعة" : "مرفوض"}
                      </Badge>
                      <Badge variant={freelancerProfile.is_available ? "default" : "secondary"}>
                        {freelancerProfile.is_available ? "متاح" : "غير متاح"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  سجل الطلبات
                </CardTitle>
              </CardHeader>
              <CardContent>
                {orders && orders.length > 0 ? (
                  <div className="space-y-3">
                    {orders.map((order: any) => (
                      <div key={order.id} className="p-4 bg-muted rounded-lg flex items-center justify-between">
                        <div>
                          <p className="font-medium">{order.order_number}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(order.created_at), "dd MMMM yyyy", { locale: ar })}
                          </p>
                        </div>
                        <div className="text-left">
                          <p className="font-bold">{order.total} ج.م</p>
                          <Badge variant={order.status === "paid" ? "default" : "secondary"}>
                            {order.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">لا توجد طلبات</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="requests">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  سجل المهام
                </CardTitle>
              </CardHeader>
              <CardContent>
                {requests && requests.length > 0 ? (
                  <div className="space-y-3">
                    {requests.map((request: any) => (
                      <div key={request.id} className="p-4 bg-muted rounded-lg flex items-center justify-between">
                        <div>
                          <p className="font-medium">{request.title}</p>
                          <p className="text-sm text-muted-foreground">{request.request_number}</p>
                        </div>
                        <Badge>{request.status}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">لا توجد مهام</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Credits */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    سجل الكريديت
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {credits && credits.length > 0 ? (
                    <div className="space-y-2">
                      {credits.map((tx: any) => (
                        <div key={tx.id} className="p-3 bg-muted rounded-lg flex items-center justify-between">
                          <div>
                            <p className="text-sm">{tx.reason || tx.type}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(tx.created_at), "dd/MM/yyyy HH:mm")}
                            </p>
                          </div>
                          <span className={`font-bold ${tx.amount > 0 ? "text-success" : "text-destructive"}`}>
                            {tx.amount > 0 ? "+" : ""}{tx.amount}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-4">لا توجد معاملات</p>
                  )}
                </CardContent>
              </Card>

              {/* Wallet */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="w-5 h-5" />
                    سجل المحفظة
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {wallet && wallet.length > 0 ? (
                    <div className="space-y-2">
                      {wallet.map((tx: any) => (
                        <div key={tx.id} className="p-3 bg-muted rounded-lg flex items-center justify-between">
                          <div>
                            <p className="text-sm">{tx.reason || tx.type}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(tx.created_at), "dd/MM/yyyy HH:mm")}
                            </p>
                          </div>
                          <span className={`font-bold ${tx.amount > 0 ? "text-success" : "text-destructive"}`}>
                            {tx.amount > 0 ? "+" : ""}{tx.amount} ج.م
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-4">لا توجد معاملات</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}