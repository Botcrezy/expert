import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ClientSidebar } from "@/components/layout/ClientSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Shield, 
  Upload, 
  Loader2, 
  CheckCircle2, 
  Clock, 
  XCircle,
  User,
  MapPin,
  CreditCard,
  Camera
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const egyptianGovernorates = [
  "القاهرة", "الجيزة", "الإسكندرية", "الدقهلية", "البحر الأحمر",
  "البحيرة", "الفيوم", "الغربية", "الإسماعيلية", "المنوفية",
  "المنيا", "القليوبية", "الوادي الجديد", "السويس", "أسوان",
  "أسيوط", "بني سويف", "بورسعيد", "دمياط", "الشرقية",
  "جنوب سيناء", "كفر الشيخ", "مطروح", "الأقصر", "قنا", "سوهاج"
];

export default function IdentityVerification() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    full_name: "",
    national_id: "",
    date_of_birth: "",
    gender: "",
    nationality: "مصري",
    address: "",
    city: "",
    governorate: "",
    postal_code: "",
    id_front_url: "",
    id_back_url: "",
    selfie_url: "",
  });

  // Fetch existing verification
  const { data: verification, isLoading } = useQuery({
    queryKey: ["identity-verification", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("identity_verifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch profile data
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (profile) {
      setFormData(prev => ({
        ...prev,
        full_name: profile.full_name || "",
      }));
    }
  }, [profile]);

  const uploadFile = async (file: File, type: string) => {
    if (!user?.id) return;
    
    setUploading(type);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${type}-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("identity-documents")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // استخدم رابط موقَّع حتى مع الباكيت الخاصة
      const { data: signedData, error: signedError } = await supabase.storage
        .from("identity-documents")
        .createSignedUrl(filePath, 60 * 60 * 24 * 365); // سنة كاملة

      if (signedError || !signedData?.signedUrl) throw signedError;

      setFormData(prev => ({ ...prev, [`${type}_url`]: signedData.signedUrl }));
      toast({ title: "تم رفع الصورة بنجاح ✅" });
    } catch (error: any) {
      toast({
        title: "خطأ في رفع الصورة",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(null);
    }
  };
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("يجب تسجيل الدخول");

      const { data, error } = await supabase
        .from("identity_verifications")
        .insert({
          user_id: user.id,
          user_type: "client",
          ...formData,
          date_of_birth: formData.date_of_birth || null,
        })
        .select("id")
        .single();

      if (error) throw error;

      // Telegram: notify admin (important event)
      const { notifyTelegramAdmin } = await import("@/lib/telegramAdminNotify");
      await notifyTelegramAdmin({
        eventKey: "admin_identity_submitted_client",
        reference: { type: "identity_verification", id: data.id },
        adminPath: `/admin/identity-verifications`,
        data: {
          user_name: formData.full_name,
          reference_id: data.id,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["identity-verification"] });
      toast({ title: "تم إرسال طلب التحقق بنجاح ✅" });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.full_name || !formData.national_id || !formData.address || !formData.city) {
      toast({
        title: "خطأ",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }

    if (!formData.id_front_url || !formData.id_back_url || !formData.selfie_url) {
      toast({
        title: "خطأ",
        description: "يرجى رفع صور الهوية (الوجه والخلف) وصورة السيلفي",
        variant: "destructive",
      });
      return;
    }

    submitMutation.mutate();
  };

  if (isLoading) {
    return (
      <DashboardLayout sidebar={<ClientSidebar />} title="التحقق من الهوية">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  // Show status if already submitted
  if (verification) {
    return (
      <DashboardLayout sidebar={<ClientSidebar />} title="التحقق من الهوية">
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            {verification.status === "pending" && (
              <>
                <Clock className="w-16 h-16 mx-auto text-warning mb-4" />
                <CardTitle className="text-2xl">طلبك قيد المراجعة</CardTitle>
                <CardDescription>
                  تم إرسال طلب التحقق من الهوية وسيتم مراجعته خلال 24-48 ساعة
                </CardDescription>
              </>
            )}
            {verification.status === "approved" && (
              <>
                <CheckCircle2 className="w-16 h-16 mx-auto text-success mb-4" />
                <CardTitle className="text-2xl">تم التحقق من هويتك ✅</CardTitle>
                <CardDescription>
                  تهانينا! تم التحقق من هويتك بنجاح
                </CardDescription>
              </>
            )}
            {verification.status === "rejected" && (
              <>
                <XCircle className="w-16 h-16 mx-auto text-destructive mb-4" />
                <CardTitle className="text-2xl">تم رفض طلبك</CardTitle>
                <CardDescription>
                  {verification.rejection_reason || "يرجى التواصل مع الدعم لمزيد من التفاصيل"}
                </CardDescription>
              </>
            )}
          </CardHeader>
          <CardContent className="text-center">
            <Badge variant={
              verification.status === "pending" ? "secondary" :
              verification.status === "approved" ? "default" : "destructive"
            } className="text-base px-4 py-2">
              {verification.status === "pending" && "قيد المراجعة"}
              {verification.status === "approved" && "تم التحقق"}
              {verification.status === "rejected" && "مرفوض"}
            </Badge>
            
            {verification.status === "rejected" && (
              <Button 
                className="mt-6 w-full" 
                onClick={() => queryClient.setQueryData(["identity-verification", user?.id], null)}
              >
                إعادة التقديم
              </Button>
            )}
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      sidebar={<ClientSidebar />} 
      title="التحقق من الهوية"
      subtitle="أكمل بياناتك للتحقق من هويتك"
    >
      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              البيانات الشخصية
            </CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>الاسم الكامل *</Label>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="كما هو مكتوب في الهوية"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>الرقم القومي *</Label>
              <Input
                value={formData.national_id}
                onChange={(e) => setFormData({ ...formData, national_id: e.target.value })}
                placeholder="14 رقم"
                maxLength={14}
                required
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label>تاريخ الميلاد</Label>
              <Input
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label>الجنس</Label>
              <Select 
                value={formData.gender} 
                onValueChange={(value) => setFormData({ ...formData, gender: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">ذكر</SelectItem>
                  <SelectItem value="female">أنثى</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              العنوان
            </CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-2">
              <Label>العنوان التفصيلي *</Label>
              <Textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="الشارع، المبنى، الشقة..."
                required
              />
            </div>
            <div className="space-y-2">
              <Label>المدينة *</Label>
              <Input
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="مثل: مدينة نصر"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>المحافظة</Label>
              <Select 
                value={formData.governorate} 
                onValueChange={(value) => setFormData({ ...formData, governorate: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر المحافظة" />
                </SelectTrigger>
                <SelectContent>
                  {egyptianGovernorates.map(gov => (
                    <SelectItem key={gov} value={gov}>{gov}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* ID Card Images */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              صور الهوية الوطنية
            </CardTitle>
            <CardDescription>
              يرجى رفع صور واضحة لبطاقة الهوية الوطنية
            </CardDescription>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4">
            {/* Front ID */}
            <div className="space-y-2">
              <Label>وجه البطاقة *</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                {formData.id_front_url ? (
                  <div className="relative">
                    <img 
                      src={formData.id_front_url} 
                      alt="Front ID" 
                      className="max-h-32 mx-auto rounded-lg object-cover"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="mt-2"
                      onClick={() => setFormData({ ...formData, id_front_url: "" })}
                    >
                      تغيير
                    </Button>
                  </div>
                ) : (
                  <label className="cursor-pointer block">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], "id_front")}
                      disabled={uploading === "id_front"}
                    />
                    <div className="py-6">
                      {uploading === "id_front" ? (
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                      ) : (
                        <>
                          <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">اضغط لرفع الصورة</p>
                        </>
                      )}
                    </div>
                  </label>
                )}
              </div>
            </div>

            {/* Back ID */}
            <div className="space-y-2">
              <Label>ظهر البطاقة *</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                {formData.id_back_url ? (
                  <div className="relative">
                    <img 
                      src={formData.id_back_url} 
                      alt="Back ID" 
                      className="max-h-32 mx-auto rounded-lg object-cover"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="mt-2"
                      onClick={() => setFormData({ ...formData, id_back_url: "" })}
                    >
                      تغيير
                    </Button>
                  </div>
                ) : (
                  <label className="cursor-pointer block">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], "id_back")}
                      disabled={uploading === "id_back"}
                    />
                    <div className="py-6">
                      {uploading === "id_back" ? (
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                      ) : (
                        <>
                          <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">اضغط لرفع الصورة</p>
                        </>
                      )}
                    </div>
                  </label>
                )}
              </div>
            </div>

            {/* Selfie (Required) */}
            <div className="sm:col-span-2 space-y-2">
              <Label>صورة سيلفي مع الهوية *</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                {formData.selfie_url ? (
                  <div className="relative">
                    <img 
                      src={formData.selfie_url} 
                      alt="Selfie" 
                      className="max-h-32 mx-auto rounded-lg object-cover"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="mt-2"
                      onClick={() => setFormData({ ...formData, selfie_url: "" })}
                    >
                      تغيير
                    </Button>
                  </div>
                ) : (
                  <label className="cursor-pointer block">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], "selfie")}
                      disabled={uploading === "selfie"}
                    />
                    <div className="py-4">
                      {uploading === "selfie" ? (
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                      ) : (
                        <>
                          <Camera className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">صورة شخصية تظهر وجهك بوضوح</p>
                        </>
                      )}
                    </div>
                  </label>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Button 
          type="submit" 
          className="w-full h-12" 
          disabled={submitMutation.isPending}
        >
          {submitMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              جاري الإرسال...
            </>
          ) : (
            <>
              <Shield className="w-4 h-4" />
              إرسال طلب التحقق
            </>
          )}
        </Button>
      </form>
    </DashboardLayout>
  );
}