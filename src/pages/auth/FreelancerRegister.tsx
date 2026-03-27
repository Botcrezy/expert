import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { useReferralTracking } from "@/hooks/useReferralTracking";
import { 
  ArrowRight, 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  Briefcase, 
  Link as LinkIcon,
  Check,
  Wallet,
  Star,
  Clock,
  Loader2,
  Shield,
  Zap,
  Award,
  CheckCircle2
} from "lucide-react";

export default function FreelancerRegister() {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    bio: "",
    portfolioUrl: "",
    hourlyRate: "",
    category: "", // Single category instead of array
    skills: "",
    experience: "",
    agreeTerms: false,
  });
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, userRole, signUp } = useAuth();
  const { data: settings } = usePlatformSettings();
  const { processReferral } = useReferralTracking();

  // Get referral code from URL
  useEffect(() => {
    const refCode = searchParams.get("ref");
    if (refCode) {
      localStorage.setItem("referral_code", refCode.toUpperCase());
    }
  }, [searchParams]);

  // Fetch categories from database
  const { data: dbCategories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories-for-freelancer"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      return data || [];
    },
  });

  const validateStep = (currentStep: number): boolean => {
    if (currentStep === 1) {
      if (!formData.fullName || !formData.email || !formData.password || !formData.phone) {
        toast({
          title: "خطأ",
          description: "يرجى ملء جميع الحقول المطلوبة",
          variant: "destructive",
        });
        return false;
      }
      if (formData.password !== formData.confirmPassword) {
        toast({
          title: "خطأ",
          description: "كلمتا المرور غير متطابقتين",
          variant: "destructive",
        });
        return false;
      }
      if (formData.password.length < 8) {
        toast({
          title: "خطأ",
          description: "كلمة المرور يجب أن تكون 8 أحرف على الأقل",
          variant: "destructive",
        });
        return false;
      }
    }
    if (currentStep === 2) {
      if (!formData.bio || formData.bio.length < 20) {
        toast({
          title: "خطأ",
          description: "يرجى كتابة نبذة عنك (20 حرف على الأقل)",
          variant: "destructive",
        });
        return false;
      }

      if (formData.hourlyRate) {
        const rate = Number(formData.hourlyRate);
        if (isNaN(rate) || rate < 0) {
          toast({
            title: "خطأ في السعر بالساعة",
            description: "يرجى إدخال رقم صحيح للسعر بالساعة",
            variant: "destructive",
          });
          return false;
        }
        if (rate > 1000) {
          toast({
            title: "حد أقصى للسعر بالساعة",
            description: "السعر بالساعة لا يمكن أن يتخطى 1000 ج.م",
            variant: "destructive",
          });
          return false;
        }
      }
    }
    if (currentStep === 3) {
      if (!formData.category) {
        toast({
          title: "خطأ",
          description: "يرجى اختيار تخصصك الرئيسي",
          variant: "destructive",
        });
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.agreeTerms) {
      toast({
        title: "يرجى الموافقة على الشروط",
        variant: "destructive",
      });
      return;
    }

    if (!validateStep(3)) return;

    setLoading(true);

    try {
      // استخدم نظام التسجيل الموحد مع تمرير دور "freelancer"
      const { error } = await signUp(
        formData.email,
        formData.password,
        formData.fullName,
        "freelancer"
      );

      if (error) {
        let errorMessage = error.message;
        if (error.message.includes("already registered")) {
          errorMessage = "البريد الإلكتروني مسجل بالفعل";
        }

        toast({
          title: "حدث خطأ",
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }

      // بعد النجاح، احصل على المستخدم الحالي لإكمال بروفايل الفريلانسر
      const { data: authData } = await supabase.auth.getUser();

      if (authData.user) {
        const userId = authData.user.id;

        await supabase
          .from("profiles")
          .upsert(
            {
              user_id: userId,
              full_name: formData.fullName,
              email: formData.email,
              phone: formData.phone,
            },
            { onConflict: "user_id" }
          );

        const skillsArray = formData.skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

        const { error: freelancerError } = await supabase
          .from("freelancer_profiles")
          .upsert(
            {
              user_id: userId,
              bio: formData.bio,
              portfolio_url: formData.portfolioUrl || null,
              hourly_rate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : null,
              categories: formData.category ? [formData.category] : [],
              skills: { skills: skillsArray },
              experience: formData.experience || null,
              verification_status: "pending",
              is_verified: false,
              is_available: true,
              completed_tasks: 0,
              total_earnings: 0,
              rating: null,
              stars: 0,
            },
            { onConflict: "user_id" }
          );

        if (freelancerError) {
          console.error("Freelancer profile error:", freelancerError);
        }

        // Process referral if code exists
        if (localStorage.getItem("referral_code")) {
          await processReferral(userId, "freelancer");
        }

        // Telegram: notify admin (important event)
        const { notifyTelegramAdmin } = await import("@/lib/telegramAdminNotify");
        await notifyTelegramAdmin({
          eventKey: "admin_user_registered_freelancer",
          reference: { type: "user", id: userId },
          adminPath: `/admin/users/${userId}`,
          data: {
            user_name: formData.fullName,
            user_email: formData.email,
          },
        });
      }

      toast({
        title: "تم إرسال طلبك بنجاح! ✓",
        description: "سيتم مراجعة بياناتك وتفعيل حسابك خلال 24-48 ساعة",
      });

      navigate("/freelancer/account-pending");
    } catch (error: any) {
      toast({
        title: "حدث خطأ",
        description: error.message || "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const stepTitles = ["البيانات الأساسية", "معلومات العمل", "التخصص الرئيسي"];

  return (
    <div className="min-h-screen auth-neo auth-neo-bg flex flex-col lg:flex-row">
      {/* Mobile Header */}
      <div className="lg:hidden p-4 flex items-center justify-between border-b border-border/50">
        <Link to="/" className="flex items-center gap-2">
          {settings?.logoUrl ? (
            <img src={settings.logoUrl} alt={settings.siteName} className="w-9 h-9 rounded-xl object-contain" />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
              <span className="text-primary-foreground font-bold text-lg">{settings?.siteName?.charAt(0) || "S"}</span>
            </div>
          )}
          <span className="font-bold text-lg">{settings?.siteName || "Sity Experts"}</span>
        </Link>
      </div>

      {/* Left Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-12">
        <div className="w-full max-w-xl">
          <div className="mb-6 lg:mb-8">
            <Link 
              to="/" 
              className="hidden lg:inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors group"
            >
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              العودة للرئيسية
            </Link>
            
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-3">
              انضم كفريلانسر 💼
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              أكمل بياناتك لتنضم لفريق خبراء {settings?.siteName || "Sity"}
            </p>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-2 mb-6 lg:mb-8">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  step > s 
                    ? "bg-primary text-primary-foreground" 
                    : step === s 
                      ? "bg-primary text-primary-foreground ring-4 ring-primary/20" 
                      : "bg-muted text-muted-foreground"
                }`}>
                  {step > s ? <Check className="w-5 h-5" /> : s}
                </div>
                {s < 3 && (
                  <div className={`flex-1 h-1 rounded-full transition-colors ${
                    step > s ? "bg-primary" : "bg-muted"
                  }`} />
                )}
              </div>
            ))}
          </div>
          
          <p className="text-sm text-muted-foreground mb-6 text-center lg:text-right">
            الخطوة {step} من 3: {stepTitles[step - 1]}
          </p>

          <form onSubmit={handleSubmit}>
            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">الاسم الكامل *</Label>
                  <div className="relative">
                    <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="fullName"
                      placeholder="أدخل اسمك الكامل"
                      className="h-12 sm:h-14 pr-10 auth-neo-input"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">البريد الإلكتروني *</Label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="email@example.com"
                      className="h-12 sm:h-14 pr-10 auth-neo-input"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">رقم الهاتف *</Label>
                  <div className="relative">
                    <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="01xxxxxxxxx"
                      className="h-12 sm:h-14 pr-10 auth-neo-input"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      required
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">كلمة المرور *</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="8 أحرف على الأقل"
                      className="h-12 sm:h-14 auth-neo-input"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      minLength={8}
                      dir="ltr"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">تأكيد كلمة المرور *</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      className="h-12 sm:h-14 auth-neo-input"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      required
                      dir="ltr"
                    />
                  </div>
                </div>

                <Button type="button" className="w-full h-12 sm:h-14" onClick={nextStep}>
                  التالي
                  <ArrowLeft className="w-4 h-4 mr-2" />
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bio">نبذة عنك *</Label>
                  <Textarea
                    id="bio"
                    placeholder="اكتب نبذة مختصرة عن خبراتك ومهاراتك... (20 حرف على الأقل)"
                    rows={4}
                    className="auth-neo-input resize-none"
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    required
                  />
                  <p className="text-xs text-muted-foreground">{formData.bio.length}/20 حرف (الحد الأدنى)</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="portfolioUrl">رابط Portfolio أو موقعك</Label>
                  <div className="relative">
                    <LinkIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="portfolioUrl"
                      type="url"
                      placeholder="https://..."
                      className="h-12 sm:h-14 pr-10 auth-neo-input"
                      value={formData.portfolioUrl}
                      onChange={(e) => setFormData({ ...formData, portfolioUrl: e.target.value })}
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="experience">سنوات الخبرة *</Label>
                    <Select 
                      value={formData.experience} 
                      onValueChange={(value) => setFormData({ ...formData, experience: value })}
                    >
                      <SelectTrigger className="h-12 sm:h-14 auth-neo-input">
                        <SelectValue placeholder="اختر" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="less_than_1">أقل من سنة</SelectItem>
                        <SelectItem value="1-3">1-3 سنوات</SelectItem>
                        <SelectItem value="3-5">3-5 سنوات</SelectItem>
                        <SelectItem value="5+">أكثر من 5 سنوات</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hourlyRate">السعر بالساعة (ج.م)</Label>
                    <Input
                       id="hourlyRate"
                       type="number"
                       placeholder="100"
                       className="h-12 sm:h-14 auth-neo-input"
                       value={formData.hourlyRate}
                       onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                       dir="ltr"
                       min={0}
                       max={1000}
                     />
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button type="button" variant="outline" className="flex-1 h-12 sm:h-14" onClick={() => setStep(1)}>
                    <ArrowRight className="w-4 h-4 ml-2" />
                    السابق
                  </Button>
                  <Button type="button" className="flex-1 h-12 sm:h-14" onClick={nextStep}>
                    التالي
                    <ArrowLeft className="w-4 h-4 mr-2" />
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <Label>اختر تخصصك الرئيسي * (تخصص واحد فقط)</Label>
                  {categoriesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {dbCategories.map((cat) => (
                        <div
                          key={cat.id}
                          className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            formData.category === cat.id
                              ? "bg-primary/20 border-primary text-primary shadow-md"
                              : "bg-white/5 border-white/10 hover:border-primary/50"
                          }`}
                          onClick={() => setFormData({ ...formData, category: cat.id })}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              formData.category === cat.id ? "bg-primary text-primary-foreground" : "bg-muted"
                            }`}>
                              {formData.category === cat.id ? (
                                <CheckCircle2 className="w-5 h-5" />
                              ) : (
                                <Briefcase className="w-5 h-5" />
                              )}
                            </div>
                            <div>
                              <span className="font-medium">{cat.name_ar}</span>
                              {cat.description && (
                                <p className="text-xs text-muted-foreground mt-0.5">{cat.description}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="skills">المهارات (افصل بينها بفاصلة)</Label>
                  <Textarea
                    id="skills"
                    placeholder="مثال: تصميم جرافيك، فيجما، أدوبي فوتوشوب، أدوبي اليستريتور"
                    rows={3}
                    className="auth-neo-input resize-none"
                    value={formData.skills}
                    onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                  />
                </div>

                <div className="flex items-start gap-3 p-4 rounded-lg bg-white/5 border border-white/10">
                  <Checkbox
                    id="terms"
                    checked={formData.agreeTerms}
                    onCheckedChange={(checked) => setFormData({ ...formData, agreeTerms: checked === true })}
                  />
                  <Label htmlFor="terms" className="text-sm text-muted-foreground cursor-pointer leading-relaxed">
                    أوافق على{" "}
                    <Link to="/terms" className="text-primary hover:underline">شروط الخدمة</Link>
                    {" "}و{" "}
                    <Link to="/privacy" className="text-primary hover:underline">سياسة الخصوصية</Link>
                  </Label>
                </div>

                <div className="flex gap-3">
                  <Button type="button" variant="outline" className="flex-1 h-12 sm:h-14" onClick={() => setStep(2)}>
                    <ArrowRight className="w-4 h-4 ml-2" />
                    السابق
                  </Button>
                  <Button type="submit" className="flex-1 h-12 sm:h-14" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        جاري التسجيل...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        تسجيل
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </form>

          <p className="text-sm text-muted-foreground text-center mt-6">
            لديك حساب؟{" "}
            <Link to="/freelancer/login" className="text-primary hover:underline">
              تسجيل الدخول
            </Link>
          </p>
          <p className="text-sm text-muted-foreground text-center mt-2">
            تريد التسجيل كعميل؟{" "}
            <Link to="/register" className="text-primary hover:underline">
              إنشاء حساب عميل
            </Link>
          </p>
        </div>
      </div>

      {/* Right Panel - Branding */}
      <div className="hidden lg:flex lg:w-[45%] auth-neo-brand items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 right-20 w-64 h-64 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-20 left-20 w-96 h-96 rounded-full bg-white blur-3xl" />
        </div>
        
        <div className="relative z-10 max-w-md auth-neo-brand-content">
          <Link to="/" className="flex items-center gap-3 mb-8">
            {settings?.logoUrl ? (
              <img src={settings.logoUrl} alt={settings.siteName} className="w-14 h-14 rounded-2xl object-contain auth-neo-brand-badge p-2" />
            ) : (
              <div className="w-14 h-14 rounded-2xl auth-neo-brand-badge flex items-center justify-center">
                <span className="font-bold text-2xl">{settings?.siteName?.charAt(0) || "S"}</span>
              </div>
            )}
            <span className="font-bold text-2xl">{settings?.siteName || "Sity Experts"}</span>
          </Link>
          
          <h2 className="text-3xl xl:text-4xl font-bold mb-6 leading-relaxed">
            انضم لمجتمع المحترفين
          </h2>
          
          <p className="auth-neo-brand-lead text-lg mb-10 leading-relaxed">
            احصل على فرص عمل مميزة، واعمل على مشاريع متنوعة مع عملاء من مختلف المجالات
          </p>

          <div className="grid grid-cols-1 gap-4">
            {[
              { icon: Wallet, text: "أرباح مضمونة", desc: "دفعات أسبوعية منتظمة" },
              { icon: Shield, text: "بيئة آمنة", desc: "حماية كاملة لحقوقك" },
              { icon: Zap, text: "مرونة في العمل", desc: "اختر مشاريعك بنفسك" },
              { icon: Award, text: "تطوير مستمر", desc: "فرص للتعلم والنمو" },
            ].map((feature, index) => (
              <div key={index} className="auth-neo-brand-feature">
                <div className="auth-neo-brand-icon">
                  <feature.icon className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-base font-semibold">{feature.text}</span>
                  <p className="text-sm opacity-70">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
