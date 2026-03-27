import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { FreelancerSidebar } from "@/components/layout/FreelancerSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { 
  Shield, 
  Upload, 
  CheckCircle2, 
  Clock, 
  XCircle,
  Loader2,
  User,
  MapPin,
  CreditCard,
  Camera
} from "lucide-react";

const egyptianGovernorates = [
  "القاهرة", "الجيزة", "الإسكندرية", "الدقهلية", "الشرقية", 
  "المنوفية", "القليوبية", "البحيرة", "كفر الشيخ", "الغربية",
  "المنيا", "أسيوط", "سوهاج", "قنا", "الأقصر", "أسوان",
  "البحر الأحمر", "الوادي الجديد", "مطروح", "شمال سيناء", 
  "جنوب سيناء", "بورسعيد", "الإسماعيلية", "السويس", "دمياط", "الفيوم", "بني سويف"
];

export default function FreelancerIdentityVerification() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState<string | null>(null);
  
  const idFrontRef = useRef<HTMLInputElement>(null);
  const idBackRef = useRef<HTMLInputElement>(null);
  const selfieRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    full_name: "",
    national_id: "",
    date_of_birth: "",
    gender: "",
    nationality: "مصري",
    governorate: "",
    city: "",
    address: "",
    postal_code: "",
    id_front_url: "",
    id_back_url: "",
    selfie_url: "",
  });

  // Check existing verification
  const { data: existingVerification, isLoading } = useQuery({
    queryKey: ["freelancer-identity-verification", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("identity_verifications")
        .select("*")
        .eq("user_id", user.id)
        .eq("user_type", "freelancer")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const handleFileUpload = async (field: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "الملف كبير جداً", description: "الحد الأقصى 5MB", variant: "destructive" });
      return;
    }

    setUploading(field);
    try {
      const fileExt = file.name.split(".").pop();
      const safeExt = fileExt || "png";
      const fileName = `${field}-${Date.now()}.${safeExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from("identity-documents")
        .upload(filePath, file, { upsert: false });

      if (uploadError) throw uploadError;

      // Get signed URL for private bucket (valid for 1 year)
      const { data: signedData, error: signedError } = await supabase.storage
        .from("identity-documents")
        .createSignedUrl(filePath, 60 * 60 * 24 * 365);

      if (signedError || !signedData?.signedUrl) throw signedError;

      // Store the signed URL
      setFormData(prev => ({ ...prev, [field]: signedData.signedUrl }));
      toast({ title: "تم رفع الملف بنجاح ✅" });
    } catch (error: any) {
      toast({ title: "خطأ في رفع الملف", description: error.message, variant: "destructive" });
    } finally {
      setUploading(null);
    }
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("يجب تسجيل الدخول");

      const { data, error } = await supabase
        .from("identity_verifications")
        .insert({
          user_id: user.id,
          user_type: "freelancer",
          full_name: formData.full_name,
          national_id: formData.national_id,
          date_of_birth: formData.date_of_birth || null,
          gender: formData.gender || null,
          nationality: formData.nationality,
          governorate: formData.governorate,
          city: formData.city,
          address: formData.address,
          postal_code: formData.postal_code || null,
          id_front_url: formData.id_front_url,
          id_back_url: formData.id_back_url,
          selfie_url: formData.selfie_url || null,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;

      // In-app notification for freelancer
      await supabase.from("notifications").insert({
        user_id: user.id,
        type: "verification",
        title: "تم استلام طلب التحقق من الهوية",
        body: "سيتم مراجعة بياناتك قريباً",
        reference_type: "identity_verification",
        reference_id: data.id,
      });

      // Telegram notification for admins (important event)
      const { notifyTelegramAdmin } = await import("@/lib/telegramAdminNotify");
      await notifyTelegramAdmin({
        eventKey: "admin_identity_submitted_freelancer",
        reference: { type: "identity_verification", id: data.id },
        adminPath: `/admin/identity-verifications`,
        data: {
          user_name: formData.full_name,
          reference_id: data.id,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["freelancer-identity-verification"] });
      toast({ title: "تم إرسال طلب التحقق بنجاح! ✅", description: "سيتم مراجعة بياناتك قريباً" });
    },
    onError: (error: any) => {
      toast({ title: "حدث خطأ", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.full_name || !formData.national_id || !formData.governorate || 
        !formData.city || !formData.address || !formData.id_front_url || !formData.id_back_url || !formData.selfie_url) {
      toast({ title: "يرجى ملء جميع الحقول المطلوبة ورفع جميع الصور", variant: "destructive" });
      return;
    }

    submitMutation.mutate();
  };

  if (isLoading) {
    return (
      <DashboardLayout sidebar={<FreelancerSidebar />} title="التحقق من الهوية">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  // Show status if already submitted
  if (existingVerification) {
    return (
      <DashboardLayout 
        sidebar={<FreelancerSidebar />} 
        title="التحقق من الهوية"
        subtitle="حالة طلب التحقق الخاص بك"
      >
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-8 text-center">
            {existingVerification.status === "pending" && (
              <>
                <Clock className="w-16 h-16 text-warning mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">طلبك قيد المراجعة</h2>
                <p className="text-muted-foreground">سيتم مراجعة بياناتك والرد عليك في أقرب وقت</p>
              </>
            )}
            {existingVerification.status === "approved" && (
              <>
                <CheckCircle2 className="w-16 h-16 text-success mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">تم التحقق من هويتك بنجاح ✅</h2>
                <p className="text-muted-foreground">حسابك موثق الآن</p>
              </>
            )}
            {existingVerification.status === "rejected" && (
              <>
                <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">تم رفض طلب التحقق</h2>
                <p className="text-muted-foreground mb-4">{existingVerification.rejection_reason || "يرجى التواصل مع الدعم"}</p>
                <Button onClick={() => navigate("/freelancer/support")}>تواصل مع الدعم</Button>
              </>
            )}
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      sidebar={<FreelancerSidebar />} 
      title="التحقق من الهوية"
      subtitle="أكمل بيانات التحقق للحصول على شارة التوثيق"
    >
      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-6">
        {/* Personal Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              البيانات الشخصية
            </CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label>الاسم الكامل (كما في الهوية) *</Label>
              <Input 
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="الاسم رباعي"
                required
              />
            </div>
            <div>
              <Label>الرقم القومي *</Label>
              <Input 
                value={formData.national_id}
                onChange={(e) => setFormData({ ...formData, national_id: e.target.value })}
                placeholder="14 رقم"
                maxLength={14}
                required
              />
            </div>
            <div>
              <Label>تاريخ الميلاد</Label>
              <Input 
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
              />
            </div>
            <div>
              <Label>النوع</Label>
              <Select value={formData.gender} onValueChange={(v) => setFormData({ ...formData, gender: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">ذكر</SelectItem>
                  <SelectItem value="female">أنثى</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>الجنسية</Label>
              <Input 
                value={formData.nationality}
                onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
              />
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
            <div>
              <Label>المحافظة *</Label>
              <Select value={formData.governorate} onValueChange={(v) => setFormData({ ...formData, governorate: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر المحافظة" />
                </SelectTrigger>
                <SelectContent>
                  {egyptianGovernorates.map((gov) => (
                    <SelectItem key={gov} value={gov}>{gov}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>المدينة *</Label>
              <Input 
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                required
              />
            </div>
            <div className="sm:col-span-2">
              <Label>العنوان التفصيلي *</Label>
              <Input 
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="الشارع، رقم المبنى، الشقة"
                required
              />
            </div>
            <div>
              <Label>الرمز البريدي</Label>
              <Input 
                value={formData.postal_code}
                onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Documents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              صور الهوية
            </CardTitle>
            <CardDescription>ارفع صور واضحة لبطاقة الهوية الوطنية</CardDescription>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-3 gap-4">
            {/* Front ID */}
            <div className="space-y-2">
              <Label>وجه البطاقة *</Label>
              <div className="border-2 border-dashed rounded-lg p-4 text-center">
                {formData.id_front_url ? (
                  <img src={formData.id_front_url} alt="Front" className="w-full h-32 object-cover rounded" />
                ) : (
                  <CreditCard className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                )}
                <input
                  ref={idFrontRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload("id_front_url", e)}
                  className="hidden"
                  disabled={!!uploading}
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  disabled={!!uploading}
                  onClick={() => idFrontRef.current?.click()}
                >
                  {uploading === "id_front_url" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {formData.id_front_url ? "تغيير" : "رفع"}
                </Button>
              </div>
            </div>

            {/* Back ID */}
            <div className="space-y-2">
              <Label>ظهر البطاقة *</Label>
              <div className="border-2 border-dashed rounded-lg p-4 text-center">
                {formData.id_back_url ? (
                  <img src={formData.id_back_url} alt="Back" className="w-full h-32 object-cover rounded" />
                ) : (
                  <CreditCard className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                )}
                <input
                  ref={idBackRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload("id_back_url", e)}
                  className="hidden"
                  disabled={!!uploading}
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  disabled={!!uploading}
                  onClick={() => idBackRef.current?.click()}
                >
                  {uploading === "id_back_url" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {formData.id_back_url ? "تغيير" : "رفع"}
                </Button>
              </div>
            </div>

            {/* Selfie */}
            <div className="space-y-2">
              <Label>صورة سيلفي مع الهوية *</Label>
              <div className="border-2 border-dashed rounded-lg p-4 text-center">
                {formData.selfie_url ? (
                  <img src={formData.selfie_url} alt="Selfie" className="w-full h-32 object-cover rounded" />
                ) : (
                  <Camera className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                )}
                <input
                  ref={selfieRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload("selfie_url", e)}
                  className="hidden"
                  disabled={!!uploading}
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  disabled={!!uploading}
                  onClick={() => selfieRef.current?.click()}
                >
                  {uploading === "selfie_url" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {formData.selfie_url ? "تغيير" : "رفع"}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">التقط صورة سيلفي وأنت تحمل بطاقة هويتك</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" size="lg" disabled={submitMutation.isPending}>
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
        </div>
      </form>
    </DashboardLayout>
  );
}
