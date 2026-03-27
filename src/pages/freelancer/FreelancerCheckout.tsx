import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FreelancerLayout } from "@/components/layout/FreelancerLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  CreditCard, 
  CheckCircle2, 
  Tag,
  Loader2,
  ShoppingCart,
  Upload,
  FileImage,
  Wallet,
  Building2,
  Globe,
  GraduationCap,
  X,
  BookOpen,
  Clock,
  Users
} from "lucide-react";
import { cn } from "@/lib/utils";
import { KashierIframeModal } from "@/components/payment/KashierIframeModal";
import { getPublicAppOrigin } from "@/lib/getPublicAppOrigin";

export default function FreelancerCheckout() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"bank_transfer" | "mobile_wallet" | "kashier" | "coupon_only">("bank_transfer");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [kashierLoading, setKashierLoading] = useState(false);
  const [kashierAvailable, setKashierAvailable] = useState(false);
  
  // Kashier iframe state
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [pollingPayment, setPollingPayment] = useState(false);
  const [paymentWindowOpened, setPaymentWindowOpened] = useState(false);
  const [showKashierIframe, setShowKashierIframe] = useState(false);
  const [kashierPaymentUrl, setKashierPaymentUrl] = useState("");
  
  // Get track parameter from URL for course purchases
  const searchParams = new URLSearchParams(window.location.search);
  const trackIdFromUrl = searchParams.get("track");

  // Check if Kashier is configured
  useEffect(() => {
    const checkKashier = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("kashier-payment", {
          method: "GET",
        });
        if (error) throw error;
        const available = Boolean((data as any)?.configured ?? (data as any)?.available);
        setKashierAvailable(available);
      } catch {
        setKashierAvailable(false);
      }
    };
    checkKashier();
  }, []);

  // Poll for payment status when payment window is opened
  const pollPaymentStatus = useCallback(async () => {
    if (!pendingOrderId) return false;
    
    const { data: order, error } = await supabase
      .from("orders")
      .select("status")
      .eq("id", pendingOrderId)
      .maybeSingle();
    
    if (!error && order) {
      if (order.status === "paid") {
        setPollingPayment(false);
        setPaymentWindowOpened(false);
        setPendingOrderId(null);
        toast({
          title: "تم الدفع بنجاح! 🎉",
          description: "تم تفعيل الكورس في حسابك",
        });
        navigate("/freelancer/studio");
        return true;
      } else if (order.status === "failed") {
        setPollingPayment(false);
        setPaymentWindowOpened(false);
        setPendingOrderId(null);
        toast({
          title: "فشل الدفع",
          description: "حدث خطأ أثناء عملية الدفع، يرجى المحاولة مرة أخرى",
          variant: "destructive",
        });
        return true;
      }
    }
    return false;
  }, [pendingOrderId, navigate, toast]);

  // Start polling when payment window is opened
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (paymentWindowOpened && pendingOrderId && !pollingPayment) {
      setPollingPayment(true);
      interval = setInterval(async () => {
        const done = await pollPaymentStatus();
        if (done) {
          clearInterval(interval);
        }
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [paymentWindowOpened, pendingOrderId, pollingPayment, pollPaymentStatus]);

  // Fetch course products (for paid courses)
  const { data: courseProducts } = useQuery({
    queryKey: ["freelancer-course-products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*, learning_tracks(*)")
        .eq("is_active", true)
        .eq("type", "course")
        .not("track_id", "is", null);
      return data || [];
    },
  });

  // Fetch specific track if coming from URL
  const { data: trackFromUrl } = useQuery({
    queryKey: ["freelancer-track-checkout", trackIdFromUrl],
    queryFn: async () => {
      if (!trackIdFromUrl) return null;
      
      // First get the product for this track
      const { data: product } = await supabase
        .from("products")
        .select("*, learning_tracks(*)")
        .eq("track_id", trackIdFromUrl)
        .eq("type", "course")
        .eq("is_active", true)
        .maybeSingle();
      
      if (product) return product;
      
      // If no product, get the track directly
      const { data: track } = await supabase
        .from("learning_tracks")
        .select("*")
        .eq("id", trackIdFromUrl)
        .eq("is_active", true)
        .maybeSingle();
      
      return track;
    },
    enabled: !!trackIdFromUrl,
  });

  // Auto-select course from URL
  useEffect(() => {
    if (trackFromUrl && trackIdFromUrl) {
      if ('track_id' in trackFromUrl) {
        // It's a product
        setSelectedCourse(trackFromUrl.id);
      } else {
        // It's a track - find its product
        const product = courseProducts?.find(p => p.track_id === trackIdFromUrl);
        if (product) {
          setSelectedCourse(product.id);
        }
      }
    }
  }, [trackFromUrl, trackIdFromUrl, courseProducts]);

  const { data: platformSettings } = useQuery({
    queryKey: ["platform-settings-freelancer-checkout"],
    queryFn: async () => {
      const { data } = await supabase
        .from("settings")
        .select("key, value")
        .in("key", ["bankTransferDetails", "mobileWalletDetails"]);
      const settings: Record<string, string> = {};
      data?.forEach((s) => {
        try {
          settings[s.key] = typeof s.value === "string" ? JSON.parse(s.value) : s.value;
        } catch {
          settings[s.key] = s.value as string;
        }
      });
      return settings;
    },
  });

  const selectedItem = courseProducts?.find(p => p.id === selectedCourse);
  const subtotal = selectedItem?.price || 0;
  const rawDiscount = appliedCoupon 
    ? appliedCoupon.type === "percent" 
      ? (subtotal * appliedCoupon.value / 100)
      : appliedCoupon.value
    : 0;
  const discount = Math.min(rawDiscount, subtotal);
  const total = Math.max(subtotal - discount, 0);

  // If total is 0, automatically switch to coupon_only payment
  useEffect(() => {
    if (total === 0 && appliedCoupon) {
      setPaymentMethod("coupon_only");
    }
  }, [total, appliedCoupon]);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;

    const { data: coupon, error } = await supabase
      .from("coupons")
      .select("*")
      .eq("code", couponCode.toUpperCase())
      .eq("is_active", true)
      .maybeSingle();

    if (error || !coupon) {
      toast({
        title: "كود غير صالح",
        description: "يرجى التأكد من الكود وإعادة المحاولة",
        variant: "destructive",
      });
      return;
    }

    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      toast({ title: "كود منتهي الصلاحية", variant: "destructive" });
      return;
    }

    if (coupon.min_order_amount && subtotal < coupon.min_order_amount) {
      toast({
        title: "الحد الأدنى للطلب",
        description: `الحد الأدنى للطلب لاستخدام هذا الكود هو ${coupon.min_order_amount} ج.م`,
        variant: "destructive",
      });
      return;
    }

    setAppliedCoupon(coupon);
    toast({ title: "تم تطبيق الكود بنجاح! ✅" });
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    toast({ title: "تم إزالة الكوبون" });
  };

  const handleReceiptUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      toast({
        title: "خطأ",
        description: "يرجى رفع صورة أو ملف PDF فقط",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "خطأ",
        description: "حجم الملف يجب أن يكون أقل من 10MB",
        variant: "destructive",
      });
      return;
    }

    setReceiptFile(file);
    toast({ title: "تم رفع الإيصال ✅" });
  };

  const handleKashierPayment = async () => {
    if (!user || !selectedCourse) return;

    setKashierLoading(true);
    try {
      // Create order first
      const orderNumber = `ORD-${Date.now()}`;
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          order_number: orderNumber,
          subtotal,
          discount,
          total,
          tax: 0,
          status: "pending_payment",
          coupon_id: appliedCoupon?.id || null,
          payment_method: "kashier",
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order item
      await supabase
        .from("order_items")
        .insert({
          order_id: order.id,
          product_id: selectedCourse,
          quantity: 1,
          unit_price: selectedItem?.price || 0,
          total: selectedItem?.price || 0,
        });

      // Call Kashier edge function to get payment URL
      const { data: kashierData, error: kashierError } = await supabase.functions.invoke("kashier-payment", {
        body: {
          orderId: orderNumber,
          amount: total,
          userId: user.id,
          // Keep redirect URL clean (no query params) for strict payment methods.
          redirectUrl: `${getPublicAppOrigin()}/freelancer/studio`,
        },
      });

      if (kashierError) throw kashierError;

      if (kashierData?.paymentUrl) {
        setPendingOrderId(order.id);
        setKashierPaymentUrl(kashierData.paymentUrl);
        setShowKashierIframe(true);
      } else {
        throw new Error("لم يتم الحصول على رابط الدفع");
      }
    } catch (error: any) {
      console.error("Kashier payment error:", error);
      toast({
        title: "خطأ في بدء عملية الدفع",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setKashierLoading(false);
    }
  };

  const handleKashierSuccess = () => {
    setShowKashierIframe(false);
    setKashierPaymentUrl("");
    setPendingOrderId(null);
    toast({
      title: "تم الدفع بنجاح! 🎉",
      description: "تم تفعيل الكورس في حسابك",
    });
    navigate("/freelancer/studio");
  };

  const handleKashierFailure = () => {
    setShowKashierIframe(false);
    setKashierPaymentUrl("");
    setPendingOrderId(null);
    toast({
      title: "فشل الدفع",
      description: "حدث خطأ أثناء عملية الدفع، يرجى المحاولة مرة أخرى",
      variant: "destructive",
    });
  };

  const handleKashierClose = () => {
    setShowKashierIframe(false);
    if (pendingOrderId) {
      setPaymentWindowOpened(true);
    }
  };

  const handleFreeCourseActivation = async () => {
    if (!user || !selectedCourse) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("activate-free-plan", {
        body: { 
          planId: selectedCourse,
          couponId: appliedCoupon?.id || null,
          subtotal: selectedItem?.price || 0,
          discount: discount,
          isCourse: true,
          trackId: selectedItem?.track_id,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "فشل في تفعيل الكورس");

      toast({
        title: "تم تفعيل الكورس بنجاح! 🎉",
        description: "يمكنك الآن البدء في مشاهدة الدروس",
      });
      navigate("/freelancer/studio");
    } catch (error: any) {
      console.error("Course activation error:", error);
      toast({
        title: "حدث خطأ",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (!user || !selectedCourse) return;

    // Check if free or covered by coupon
    if (total === 0) {
      return handleFreeCourseActivation();
    }

    // If using Kashier
    if (paymentMethod === "kashier") {
      return handleKashierPayment();
    }

    // Manual payment (bank transfer / mobile wallet)
    setLoading(true);
    try {
      let receiptUrl = null;
      if (receiptFile) {
        setUploadingReceipt(true);
        const fileName = `receipts/${user.id}/${Date.now()}-${receiptFile.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(fileName, receiptFile);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(fileName);

        receiptUrl = publicUrlData.publicUrl;
        setUploadingReceipt(false);
      }

      const orderNumber = `ORD-${Date.now()}`;
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          order_number: orderNumber,
          subtotal,
          discount,
          total,
          tax: 0,
          status: "pending_payment",
          coupon_id: appliedCoupon?.id || null,
          payment_method: paymentMethod,
          payment_reference: paymentReference,
          payment_receipt_url: receiptUrl,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      await supabase
        .from("order_items")
        .insert({
          order_id: order.id,
          product_id: selectedCourse,
          quantity: 1,
          unit_price: selectedItem?.price || 0,
          total: selectedItem?.price || 0,
        });

      toast({
        title: "تم إرسال طلبك بنجاح! 📤",
        description: "سيتم مراجعة الدفع وتفعيل الكورس قريباً",
      });
      navigate("/freelancer/studio");
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast({
        title: "حدث خطأ",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setUploadingReceipt(false);
    }
  };

  // Check if user already enrolled
  const { data: existingEnrollment } = useQuery({
    queryKey: ["enrollment-check", user?.id, trackIdFromUrl],
    queryFn: async () => {
      if (!user || !trackIdFromUrl) return null;
      const { data } = await supabase
        .from("course_enrollments")
        .select("*")
        .eq("user_id", user.id)
        .eq("track_id", trackIdFromUrl)
        .eq("is_active", true)
        .maybeSingle();
      return data;
    },
    enabled: !!user && !!trackIdFromUrl,
  });

  if (existingEnrollment) {
    return (
      <FreelancerLayout title="أنت مسجل بالفعل">
        <Card className="max-w-lg mx-auto">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">أنت مسجل في هذا الكورس بالفعل!</h2>
            <p className="text-muted-foreground mb-4">يمكنك البدء في مشاهدة الدروس الآن</p>
            <Button onClick={() => navigate(`/freelancer/course/${trackIdFromUrl}`)}>
              <BookOpen className="w-4 h-4 ml-2" />
              ابدأ المشاهدة
            </Button>
          </CardContent>
        </Card>
      </FreelancerLayout>
    );
  }

  return (
    <FreelancerLayout title="شراء كورس">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Course Selection */}
        {trackFromUrl && 'learning_tracks' in (trackFromUrl as any) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5" />
                تفاصيل الكورس
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                {(trackFromUrl as any).learning_tracks?.cover_image && (
                  <img 
                    src={(trackFromUrl as any).learning_tracks.cover_image} 
                    alt={(trackFromUrl as any).learning_tracks.name_ar}
                    className="w-32 h-24 object-cover rounded-lg"
                  />
                )}
                <div className="flex-1">
                  <h3 className="text-lg font-bold">{(trackFromUrl as any).learning_tracks?.name_ar || (trackFromUrl as any).name_ar}</h3>
                  <p className="text-muted-foreground text-sm mb-2">
                    {(trackFromUrl as any).learning_tracks?.description_ar || (trackFromUrl as any).description_ar}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {(trackFromUrl as any).learning_tracks?.level || (trackFromUrl as any).level}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {(trackFromUrl as any).learning_tracks?.enrollment_count || 0} مسجل
                    </span>
                  </div>
                  <div className="mt-2">
                    <Badge variant="secondary" className="text-lg">
                      {(trackFromUrl as any).price} ج.م
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Available Courses if no specific track */}
        {!trackIdFromUrl && courseProducts && courseProducts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>اختر الكورس</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {courseProducts.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => setSelectedCourse(product.id)}
                    className={cn(
                      "p-4 border rounded-xl cursor-pointer transition-all",
                      selectedCourse === product.id 
                        ? "border-primary bg-primary/5 ring-2 ring-primary" 
                        : "hover:border-primary/50"
                    )}
                  >
                    <div className="flex gap-3">
                      {product.learning_tracks?.cover_image && (
                        <img 
                          src={product.learning_tracks.cover_image} 
                          alt={product.learning_tracks.name_ar}
                          className="w-20 h-16 object-cover rounded"
                        />
                      )}
                      <div className="flex-1">
                        <h4 className="font-medium">{product.learning_tracks?.name_ar || product.name_ar}</h4>
                        <p className="text-sm text-muted-foreground">
                          {product.learning_tracks?.level}
                        </p>
                        <Badge variant="secondary" className="mt-1">
                          {product.price} ج.م
                        </Badge>
                      </div>
                      {selectedCourse === product.id && (
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Coupon Code */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5" />
              كود الخصم
            </CardTitle>
          </CardHeader>
          <CardContent>
            {appliedCoupon ? (
              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="font-medium">{appliedCoupon.code}</span>
                  <Badge variant="secondary">
                    {appliedCoupon.type === "percent" 
                      ? `${appliedCoupon.value}% خصم` 
                      : `${appliedCoupon.value} ج.م خصم`}
                  </Badge>
                </div>
                <Button variant="ghost" size="sm" onClick={handleRemoveCoupon}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  placeholder="أدخل كود الخصم"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className="flex-1"
                />
                <Button onClick={handleApplyCoupon} variant="secondary">
                  تطبيق
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Methods */}
        {total > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                طريقة الدفع
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                {/* Kashier */}
                {kashierAvailable && (
                  <div
                    onClick={() => setPaymentMethod("kashier")}
                    className={cn(
                      "p-4 border rounded-xl cursor-pointer transition-all text-center",
                      paymentMethod === "kashier" 
                        ? "border-primary bg-primary/5 ring-2 ring-primary" 
                        : "hover:border-primary/50"
                    )}
                  >
                    <Globe className="w-8 h-8 mx-auto mb-2 text-primary" />
                    <h4 className="font-medium">الدفع الإلكتروني</h4>
                    <p className="text-xs text-muted-foreground">Visa, Mastercard</p>
                  </div>
                )}
                
                {/* Bank Transfer */}
                <div
                  onClick={() => setPaymentMethod("bank_transfer")}
                  className={cn(
                    "p-4 border rounded-xl cursor-pointer transition-all text-center",
                    paymentMethod === "bank_transfer" 
                      ? "border-primary bg-primary/5 ring-2 ring-primary" 
                      : "hover:border-primary/50"
                  )}
                >
                  <Building2 className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                  <h4 className="font-medium">تحويل بنكي</h4>
                  <p className="text-xs text-muted-foreground">حوالة بنكية</p>
                </div>
                
                {/* Mobile Wallet */}
                <div
                  onClick={() => setPaymentMethod("mobile_wallet")}
                  className={cn(
                    "p-4 border rounded-xl cursor-pointer transition-all text-center",
                    paymentMethod === "mobile_wallet" 
                      ? "border-primary bg-primary/5 ring-2 ring-primary" 
                      : "hover:border-primary/50"
                  )}
                >
                  <Wallet className="w-8 h-8 mx-auto mb-2 text-orange-500" />
                  <h4 className="font-medium">محفظة إلكترونية</h4>
                  <p className="text-xs text-muted-foreground">فودافون كاش، إلخ</p>
                </div>
              </div>

              {/* Payment Details for Manual Methods */}
              {(paymentMethod === "bank_transfer" || paymentMethod === "mobile_wallet") && (
                <div className="space-y-4 pt-4 border-t">
                  {paymentMethod === "bank_transfer" && platformSettings?.bankTransferDetails && (
                    <div className="p-4 bg-muted rounded-lg">
                      <h5 className="font-medium mb-2">بيانات التحويل البنكي:</h5>
                      <pre className="text-sm whitespace-pre-wrap">{platformSettings.bankTransferDetails}</pre>
                    </div>
                  )}
                  
                  {paymentMethod === "mobile_wallet" && platformSettings?.mobileWalletDetails && (
                    <div className="p-4 bg-muted rounded-lg">
                      <h5 className="font-medium mb-2">بيانات المحفظة:</h5>
                      <pre className="text-sm whitespace-pre-wrap">{platformSettings.mobileWalletDetails}</pre>
                    </div>
                  )}
                  
                  <div className="space-y-3">
                    <div>
                      <Label>رقم العملية / المرجع</Label>
                      <Input
                        value={paymentReference}
                        onChange={(e) => setPaymentReference(e.target.value)}
                        placeholder="أدخل رقم العملية أو المرجع"
                      />
                    </div>
                    
                    <div>
                      <Label>ملاحظات إضافية</Label>
                      <Textarea
                        value={paymentNotes}
                        onChange={(e) => setPaymentNotes(e.target.value)}
                        placeholder="أي ملاحظات إضافية..."
                        rows={2}
                      />
                    </div>
                    
                    <div>
                      <Label>إيصال الدفع (صورة أو PDF)</Label>
                      <div className="mt-1">
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept="image/*,.pdf"
                          onChange={handleReceiptUpload}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full"
                        >
                          {receiptFile ? (
                            <span className="flex items-center gap-2">
                              <FileImage className="w-4 h-4" />
                              {receiptFile.name}
                            </span>
                          ) : (
                            <span className="flex items-center gap-2">
                              <Upload className="w-4 h-4" />
                              رفع إيصال الدفع
                            </span>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Order Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              إتمام الشراء
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span>السعر</span>
              <span>{subtotal} ج.م</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>الخصم</span>
                <span>-{discount.toFixed(2)} ج.م</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold pt-3 border-t">
              <span>الإجمالي</span>
              <span>{total.toFixed(2)} ج.م</span>
            </div>
            
            <Button
              onClick={handleCheckout}
              disabled={!selectedCourse || loading || kashierLoading}
              className="w-full mt-4"
              size="lg"
            >
              {loading || kashierLoading ? (
                <Loader2 className="w-4 h-4 animate-spin ml-2" />
              ) : total === 0 ? (
                "شراء الآن (مجاناً بالكوبون)"
              ) : paymentMethod === "kashier" ? (
                "الدفع الآن"
              ) : (
                "شراء الآن"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Kashier iFrame Modal */}
      <KashierIframeModal
        isOpen={showKashierIframe}
        paymentUrl={kashierPaymentUrl}
        onSuccess={handleKashierSuccess}
        onFailure={handleKashierFailure}
        onClose={handleKashierClose}
      />
    </FreelancerLayout>
  );
}
