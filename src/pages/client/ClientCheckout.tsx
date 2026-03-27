import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ClientSidebar } from "@/components/layout/ClientSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  Sparkles,
  Shield,
  Zap,
  Star,
  ArrowRight,
  Check,
  ExternalLink,
  Gift,
  X,
  GraduationCap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { KashierIframeModal } from "@/components/payment/KashierIframeModal";
import { getPublicAppOrigin } from "@/lib/getPublicAppOrigin";

export default function ClientCheckout() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
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
  
  // Query params
  const searchParams = new URLSearchParams(window.location.search);
  const trackIdFromUrl = searchParams.get("track");
  const purchaseIntentIdFromUrl = searchParams.get("pi");
  const resumeFromPublicPortfolio = searchParams.get("resume") === "1";

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
        const finishedOrderId = pendingOrderId;
        setPendingOrderId(null);

        if (Boolean(purchaseIntentIdFromUrl)) {
          toast({
            title: "تم الدفع بنجاح! 🎉",
            description: "جاري إنشاء الطلب من الخدمة...",
          });
          navigate(`/client/requests?payment=success&order=${finishedOrderId}`, { replace: true });
        } else {
          toast({
            title: "تم الدفع بنجاح! 🎉",
            description: "تم تفعيل الكريديت في حسابك",
          });
          navigate("/client/billing", { replace: true });
        }

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
  }, [pendingOrderId, purchaseIntentIdFromUrl, navigate, toast]);

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
      }, 3000); // Poll every 3 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [paymentWindowOpened, pendingOrderId, pollingPayment, pollPaymentStatus]);

  const { data: plans } = useQuery({
    queryKey: ["plans"],
    queryFn: async () => {
      const { data } = await supabase
        .from("plans")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      return data || [];
    },
    enabled: !purchaseIntentIdFromUrl && !resumeFromPublicPortfolio,
  });

  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .eq("type", "credit_pack")
        .order("sort_order");
      return data || [];
    },
    enabled: !purchaseIntentIdFromUrl && !resumeFromPublicPortfolio,
  });

  const { data: servicePurchaseProduct } = useQuery({
    queryKey: ["service-purchase-product"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("type", "service_purchase")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: purchaseIntent, isLoading: intentLoading, error: intentError } = useQuery({
    queryKey: ["purchase-intent", purchaseIntentIdFromUrl],
    queryFn: async () => {
      if (!purchaseIntentIdFromUrl) return null;
      const { data, error } = await supabase
        .from("purchase_intents")
        .select("*")
        .eq("id", purchaseIntentIdFromUrl)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!purchaseIntentIdFromUrl,
  });

  useEffect(() => {
    if (!intentError) return;
    console.error("Purchase intent load error:", intentError);
    toast({
      title: "تعذر تحميل بيانات شراء الخدمة",
      description: (intentError as any)?.message || "يرجى تحديث الصفحة والمحاولة مرة أخرى",
      variant: "destructive",
    });
  }, [intentError, toast]);

  // Resume flow: create purchase intent from sessionStorage (after login)
  useEffect(() => {
    const resume = async () => {
      if (!resumeFromPublicPortfolio || !user) return;
      const pending = sessionStorage.getItem("pending_service_purchase");
      if (!pending) return;

      try {
        const parsed = JSON.parse(pending);
        const service = parsed?.service;
        const freelancerId = parsed?.freelancerId;
        const addons = Array.isArray(parsed?.addons) ? parsed.addons : [];
        const total = Number(parsed?.total ?? Number(service?.price_egp || 0));
        if (!service?.id || !freelancerId) return;

        const { data, error } = await supabase
          .from("purchase_intents")
          .insert({
            user_id: user.id,
            freelancer_id: freelancerId,
            portfolio_service_id: service.id,
            title_snapshot: service.title,
            description_snapshot: service.description || null,
            price_egp_snapshot: Number(service.price_egp || 0),
            addons_snapshot: addons,
            total_price_egp_snapshot: total,
            quantity: 1,
            status: "draft",
          } as any)
          .select("id")
          .single();

        if (error) throw error;

        sessionStorage.removeItem("pending_service_purchase");
        navigate(`/client/checkout?pi=${data.id}`, { replace: true });
      } catch (e) {
        console.error("Resume purchase intent error:", e);
      }
    };

    resume();
  }, [resumeFromPublicPortfolio, user, navigate]);

  // Fetch course products (for paid courses)
  const { data: courseProducts } = useQuery({
    queryKey: ["course-products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*, learning_tracks(*)")
        .eq("is_active", true)
        .eq("type", "course")
        .not("track_id", "is", null);
      return data || [];
    },
    enabled: !purchaseIntentIdFromUrl && !resumeFromPublicPortfolio,
  });

  // Fetch specific track if coming from URL
  const { data: trackFromUrl } = useQuery({
    queryKey: ["track-checkout", trackIdFromUrl],
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
    enabled: !!trackIdFromUrl && !purchaseIntentIdFromUrl && !resumeFromPublicPortfolio,
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
    queryKey: ["platform-settings-checkout"],
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

  const selectedItem = purchaseIntentIdFromUrl && purchaseIntent
    ? ({
        id: purchaseIntent.id,
        price: Number((purchaseIntent as any).total_price_egp_snapshot ?? purchaseIntent.price_egp_snapshot ?? 0),
        type: "service_purchase",
        name: purchaseIntent.title_snapshot,
      } as any)
    : selectedPlan
    ? plans?.find((p) => p.id === selectedPlan)
    : selectedCourse
    ? courseProducts?.find((p) => p.id === selectedCourse)
    : products?.find((p) => p.id === selectedProduct);

  const subtotal = (selectedItem as any)?.price || 0;
  const rawDiscount = appliedCoupon
    ? appliedCoupon.type === "percent"
      ? (subtotal * appliedCoupon.value) / 100
      : appliedCoupon.value
    : 0;
  const discount = Math.min(rawDiscount, subtotal);
  const total = Math.max(subtotal - discount, 0);
  const isFreeOrCovered = (selectedItem as any)?.is_free || total === 0;

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
    if (!user) return;

    // Service purchase flow
    if (Boolean(purchaseIntentIdFromUrl)) {
      if (intentLoading) {
        toast({ title: "جاري تحميل بيانات الخدمة..." });
        return;
      }
      if (!purchaseIntent) {
        toast({
          title: "لا يمكن بدء الدفع",
          description: "لم نتمكن من تحميل بيانات شراء الخدمة. حاول إعادة تحميل الصفحة.",
          variant: "destructive",
        });
        return;
      }
      if (!servicePurchaseProduct) {
        toast({
          title: "لا يمكن بدء الدفع",
          description: "منتج شراء الخدمة غير مُعد في النظام.",
          variant: "destructive",
        });
        return;
      }

      console.log("Starting Kashier service payment", {
        purchaseIntentIdFromUrl,
        purchaseIntentId: purchaseIntent.id,
        total,
        subtotal,
      });

      setKashierLoading(true);
      try {
        const orderNumber = `ORD-${Date.now()}`;
        const { data: order, error: orderError } = await supabase
          .from("orders")
          .insert({
            user_id: user.id,
            order_number: orderNumber,
            subtotal,
            discount: 0,
            total,
            tax: 0,
            status: "pending_payment",
            payment_method: "kashier",
          })
          .select()
          .single();

        if (orderError) throw orderError;

        await supabase.from("order_items").insert({
          order_id: order.id,
          product_id: servicePurchaseProduct.id,
          purchase_intent_id: purchaseIntent.id,
          quantity: purchaseIntent.quantity || 1,
          unit_price: subtotal,
          total: total,
        });

        // Call Kashier backend function to get payment URL
        // NOTE: Some Kashier methods reject redirect URLs that contain query params,
        // so we keep it a clean URL and rely on webhook + polling.
        const redirectBase = `${getPublicAppOrigin()}/client/requests`;
        const { data: kashierData, error: kashierError } = await supabase.functions.invoke(
          "kashier-payment",
          {
            body: {
              orderId: orderNumber,
              amount: total,
              userId: user.id,
              redirectUrl: redirectBase,
            },
          }
        );

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
      return;
    }

    // Default checkout flow (existing)
    if (!selectedPlan && !selectedProduct && !selectedCourse) return;

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
      const productId = selectedPlan || selectedProduct || selectedCourse;
      await supabase.from("order_items").insert({
        order_id: order.id,
        product_id: productId,
        quantity: 1,
        unit_price: (selectedItem as any)?.price || 0,
        total: (selectedItem as any)?.price || 0,
      });

      // Call Kashier edge function to get payment URL
      const redirectBase = `${getPublicAppOrigin()}/client/billing`;
      const { data: kashierData, error: kashierError } = await supabase.functions.invoke(
        "kashier-payment",
        {
          body: {
            orderId: orderNumber,
            amount: total,
            userId: user.id,
            redirectUrl: redirectBase,
          },
        }
      );

      if (kashierError) throw kashierError;

      if (kashierData?.paymentUrl) {
        // Open floating iframe modal for payment
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

    const servicePurchase = Boolean(purchaseIntentIdFromUrl);
    toast({
      title: "تم الدفع بنجاح",
      description: servicePurchase
        ? "تم الدفع وجاري تجهيز الطلب — سيظهر خلال لحظات في طلباتي"
        : "تم تفعيل الكريديت في حسابك",
    });
    navigate(servicePurchase ? "/client/requests" : "/client/billing");
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
    // Keep polling for a bit in case payment completed
    if (pendingOrderId) {
      setPaymentWindowOpened(true);
    }
  };

  const handleFreePlanActivation = async () => {
    if (!user || !selectedPlan) return;
    
    const selectedPlanData = plans?.find((p) => p.id === selectedPlan);
    if (!selectedPlanData) return;
    
    const isFree = selectedPlanData.is_free || selectedPlanData.price === 0;
    const isCoveredByCoupon = total === 0 && appliedCoupon;
    
    if (!isFree && !isCoveredByCoupon) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("activate-free-plan", {
        body: {
          planId: selectedPlan,
          couponId: appliedCoupon?.id || null,
          subtotal: selectedPlanData.price,
          discount: discount,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "فشل في تفعيل الباقة");

      toast({
        title: "تم تفعيل الباقة بنجاح! 🎉",
        description: data.message || `تم إضافة ${selectedPlanData.credits_per_month} كريديت إلى حسابك`,
      });
      navigate("/client/billing");
    } catch (error: any) {
      console.error("Plan activation error:", error);
      toast({
        title: "حدث خطأ",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFreeCourseActivation = async () => {
    if (!user || !selectedCourse) return;

    const selectedCourseProduct = courseProducts?.find((p) => p.id === selectedCourse);
    if (!selectedCourseProduct) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("activate-free-plan", {
        body: {
          planId: selectedCourse,
          couponId: appliedCoupon?.id || null,
          subtotal: selectedCourseProduct.price,
          discount: discount,
          isCourse: true,
          trackId: selectedCourseProduct.track_id,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "فشل في تفعيل الكورس");

      toast({
        title: "تم تفعيل الكورس بنجاح! 🎉",
        description: "يمكنك الآن البدء في مشاهدة الدروس",
      });
      navigate("/client/studio");
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
    if (!user) return;

    // Service purchase: ensure intent + product loaded before any payment attempt (Kashier or manual)
    if (purchaseIntentIdFromUrl) {
      if (intentLoading) {
        toast({ title: "جاري تحميل بيانات الخدمة..." });
        return;
      }
      if (!purchaseIntent || !servicePurchaseProduct) {
        toast({
          title: "لا يمكن إكمال الدفع الآن",
          description: "بيانات شراء الخدمة غير مكتملة. يرجى تحديث الصفحة والمحاولة مرة أخرى.",
          variant: "destructive",
        });
        return;
      }
    }

    // For non-service purchases, user must select a plan/product/course first
    if (!purchaseIntentIdFromUrl && !selectedPlan && !selectedProduct && !selectedCourse) return;

    // If total is fully covered (free plan/product/course), activate without manual payment
    if (!purchaseIntentIdFromUrl && total === 0) {
      if (selectedPlan) {
        return handleFreePlanActivation();
      }
      if (selectedProduct) {
        setLoading(true);
        try {
          const { data, error } = await supabase.functions.invoke("activate-free-plan", {
            body: {
              planId: selectedProduct,
              couponId: appliedCoupon?.id || null,
              subtotal: selectedItem?.price || 0,
              discount: discount,
            },
          });

          if (error) throw error;
          if (!data?.success) throw new Error(data?.error || "فشل في تفعيل الكريديت");

          toast({
            title: "تم تفعيل الكريديت بنجاح! 🎉",
            description: "تم استخدام كود الخصم لتغطية المبلغ بالكامل",
          });
          navigate("/client/billing");
          return;
        } catch (error: any) {
          toast({ title: "حدث خطأ", description: error.message, variant: "destructive" });
          setLoading(false);
          return;
        }
      }
      if (selectedCourse) {
        return handleFreeCourseActivation();
      }
    }

    // Check if selected plan is free without coupon
    if (!purchaseIntentIdFromUrl) {
      const selectedPlanData = plans?.find((p) => p.id === selectedPlan);
      if (selectedPlanData && (selectedPlanData.is_free || selectedPlanData.price === 0)) {
        return handleFreePlanActivation();
      }
    }

    // If using Kashier, open iFrame modal
    if (paymentMethod === "kashier") {
      return handleKashierPayment();
    }

    // Manual payment (bank transfer or mobile wallet)
    if (!paymentReference.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال رقم المرجع / رقم العملية",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      let receiptUrl = null;

      if (receiptFile) {
        setUploadingReceipt(true);
        const fileExt = receiptFile.name.split(".").pop();
        // Path: {userId}/receipts/{timestamp}.ext
        const filePath = `${user.id}/receipts/${Date.now()}.${fileExt}`;

        const { data, error: uploadError } = await supabase.storage
          .from("request-files")
          .upload(filePath, receiptFile);

        if (uploadError) {
          console.error("Receipt upload error:", uploadError);
        } else {
          // Store the storage path (bucket is private)
          receiptUrl = data?.path || filePath;
        }
        setUploadingReceipt(false);
      }

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          order_number: `ORD-${Date.now()}`,
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

      const productId = selectedPlan || selectedProduct || selectedCourse;
      if (productId) {
        await supabase.from("order_items").insert({
          order_id: order.id,
          product_id: productId,
          quantity: 1,
          unit_price: selectedItem?.price || 0,
          total: selectedItem?.price || 0,
        });
      } else if (purchaseIntentIdFromUrl && purchaseIntent && servicePurchaseProduct) {
        // Manual payment for service purchase must link to purchase_intent_id so admin approval can convert it to a request
        await supabase.from("order_items").insert({
          order_id: order.id,
          product_id: servicePurchaseProduct.id,
          purchase_intent_id: purchaseIntent.id,
          quantity: purchaseIntent.quantity || 1,
          unit_price: subtotal,
          total: total,
        });
      }

      toast({
        title: "تم إرسال طلبك بنجاح! ✅",
        description: purchaseIntentIdFromUrl
          ? "سيتم إنشاء طلب الخدمة بعد اعتماد الدفع من الإدارة"
          : "سيتم مراجعة الطلب وتفعيله بعد التحقق من الدفع",
      });
      navigate(purchaseIntentIdFromUrl ? "/client/requests" : "/client/billing");
      
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast({ title: "حدث خطأ", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelPaymentPolling = () => {
    setPaymentWindowOpened(false);
    // Don't clear pendingOrderId immediately - let polling check one more time
    setTimeout(() => {
      setPendingOrderId(null);
      setPollingPayment(false);
    }, 1000);
  };

  const paymentMethods = [
    {
      id: "kashier" as const,
      name: "دفع إلكتروني",
      description: "فيزا/ماستر/فوري/المحافظ",
      icon: Globe,
      enabled: kashierAvailable,
      recommended: true,
    },
    {
      id: "bank_transfer" as const,
      name: "تحويل بنكي",
      description: "تحويل لحساب بنكي",
      icon: Building2,
      enabled: true,
      details: platformSettings?.bankTransferDetails || "البنك الأهلي المصري\nرقم الحساب: 1234567890",
    },
    {
      id: "mobile_wallet" as const,
      name: "محفظة إلكترونية",
      description: "فودافون/أورانج/اتصالات",
      icon: Wallet,
      enabled: true,
      details: platformSettings?.mobileWalletDetails || "فودافون كاش: 01xxxxxxxxx",
    },
  ];

  return (
    <DashboardLayout
      sidebar={<ClientSidebar />}
      title="شراء كريديتات"
      subtitle="اختر الباقة أو الكريديتات المناسبة لك"
    >
      <div className="max-w-6xl mx-auto">
        {/* Header with benefits */}
        <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20">
          <div className="flex flex-wrap items-center gap-6 justify-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">دفع آمن</p>
                <p className="text-sm text-muted-foreground">مشفر بالكامل</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center">
                <Zap className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="font-medium text-foreground">تفعيل فوري</p>
                <p className="text-sm text-muted-foreground">بعد التحقق من الدفع</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-warning/20 flex items-center justify-center">
                <Star className="w-6 h-6 text-warning" />
              </div>
              <div>
                <p className="font-medium text-foreground">دعم متواصل</p>
                <p className="text-sm text-muted-foreground">24/7</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Plans & Products */}
          <div className="lg:col-span-2 space-y-8">
            {/* Free Plans */}
            {plans?.filter(p => p.is_free || p.price === 0).length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Gift className="w-5 h-5 text-success" />
                  <h3 className="text-lg font-semibold text-foreground">الباقات المجانية</h3>
                  <Badge variant="outline" className="text-success border-success/30">تفعيل فوري</Badge>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {plans?.filter(p => p.is_free || p.price === 0).map((plan) => (
                    <div
                      key={plan.id}
                      className={cn(
                        "relative p-6 rounded-2xl cursor-pointer transition-all duration-300 border-2",
                        selectedPlan === plan.id 
                          ? "border-success bg-success/5 shadow-lg shadow-success/10" 
                          : "border-border bg-card hover:border-success/50 hover:shadow-md"
                      )}
                      onClick={() => {
                        setSelectedPlan(plan.id);
                        setSelectedProduct(null);
                      }}
                    >
                      <Badge className="absolute -top-2 right-4 bg-success text-success-foreground">
                        مجاني
                      </Badge>
                      <h4 className="font-bold text-lg text-foreground mb-1">{plan.name}</h4>
                      <p className="text-sm text-muted-foreground mb-4">{plan.name_ar}</p>
                      <div className="flex items-baseline gap-1 mb-5">
                        <span className="text-3xl font-bold text-success">مجاناً</span>
                      </div>
                      <ul className="space-y-3">
                        <li className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-success flex-shrink-0" />
                          <span>{plan.credits_per_month} كريديت شهرياً</span>
                        </li>
                        <li className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-success flex-shrink-0" />
                          <span>{plan.revisions_limit} تعديلات</span>
                        </li>
                        <li className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-success flex-shrink-0" />
                          <span>تفعيل فوري بدون مراجعة</span>
                        </li>
                      </ul>
                      {selectedPlan === plan.id && (
                        <div className="absolute inset-0 rounded-2xl ring-2 ring-success pointer-events-none" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Monthly Plans */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">الباقات الشهرية</h3>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {plans?.filter(p => !p.is_free && p.price > 0).map((plan, idx) => (
                  <div
                    key={plan.id}
                    className={cn(
                      "relative p-6 rounded-2xl cursor-pointer transition-all duration-300 border-2",
                      selectedPlan === plan.id 
                        ? "border-primary bg-primary/5 shadow-lg shadow-primary/10" 
                        : "border-border bg-card hover:border-primary/50 hover:shadow-md"
                    )}
                    onClick={() => {
                      setSelectedPlan(plan.id);
                      setSelectedProduct(null);
                    }}
                  >
                    {idx === 1 && (
                      <Badge className="absolute -top-2 right-4 bg-primary text-primary-foreground">
                        الأكثر شيوعاً
                      </Badge>
                    )}
                    <h4 className="font-bold text-lg text-foreground mb-1">{plan.name}</h4>
                    <p className="text-sm text-muted-foreground mb-4">{plan.name_ar}</p>
                    <div className="flex items-baseline gap-1 mb-5">
                      <span className="text-3xl font-bold text-primary">{plan.price}</span>
                      <span className="text-muted-foreground text-sm">ج.م/شهر</span>
                    </div>
                    <ul className="space-y-3">
                      <li className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-success flex-shrink-0" />
                        <span>{plan.credits_per_month} كريديت شهرياً</span>
                      </li>
                      <li className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-success flex-shrink-0" />
                        <span>{plan.revisions_limit} تعديلات</span>
                      </li>
                      {plan.sla_hours && (
                        <li className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-success flex-shrink-0" />
                          <span>تسليم خلال {plan.sla_hours} ساعة</span>
                        </li>
                      )}
                    </ul>
                    {selectedPlan === plan.id && (
                      <div className="absolute inset-0 rounded-2xl ring-2 ring-primary pointer-events-none" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Credit Packs */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">باقات الكريديتات</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {products?.map((product) => (
                  <div
                    key={product.id}
                    className={cn(
                      "p-5 rounded-xl cursor-pointer transition-all duration-300 text-center border-2",
                      selectedProduct === product.id 
                        ? "border-primary bg-primary/5 shadow-lg shadow-primary/10" 
                        : "border-border bg-card hover:border-primary/50"
                    )}
                    onClick={() => {
                      setSelectedProduct(product.id);
                      setSelectedPlan(null);
                      setSelectedCourse(null);
                    }}
                  >
                    <div className="text-3xl font-bold text-primary mb-1">
                      {product.credits}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">كريديت</p>
                    <p className="font-semibold text-foreground">{product.price} ج.م</p>
                    {selectedProduct === product.id && (
                      <div className="mt-3 text-primary font-medium text-sm flex items-center justify-center gap-1">
                        <Check className="w-4 h-4" />
                        مختار
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Paid Courses - Show if coming from track URL or if there are course products */}
            {(trackIdFromUrl || (courseProducts && courseProducts.length > 0)) && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <GraduationCap className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground">الكورسات المدفوعة</h3>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  {(trackIdFromUrl && trackFromUrl ? [trackFromUrl] : courseProducts)?.map((item: any) => {
                    const courseId = item.track_id ? item.id : courseProducts?.find(p => p.track_id === item.id)?.id;
                    const track = item.learning_tracks || item;
                    const product = item.track_id ? item : courseProducts?.find(p => p.track_id === item.id);
                    
                    if (!product) return null;
                    
                    return (
                      <div
                        key={product.id}
                        className={cn(
                          "relative p-5 rounded-xl cursor-pointer transition-all duration-300 border-2 overflow-hidden",
                          selectedCourse === product.id 
                            ? "border-primary bg-primary/5 shadow-lg shadow-primary/10" 
                            : "border-border bg-card hover:border-primary/50"
                        )}
                        onClick={() => {
                          setSelectedCourse(product.id);
                          setSelectedPlan(null);
                          setSelectedProduct(null);
                        }}
                      >
                        {track.cover_image && (
                          <div className="absolute inset-0 opacity-10">
                            <img src={track.cover_image} alt="" className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="relative z-10">
                          <div className="flex items-start gap-3 mb-3">
                            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                              <GraduationCap className="w-6 h-6 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-foreground line-clamp-1">{track.name_ar || product.name_ar}</h4>
                              <p className="text-sm text-muted-foreground line-clamp-1">{track.description_ar || product.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-4">
                            <Badge variant="outline">{track.level === "beginner" ? "مبتدئ" : track.level === "intermediate" ? "متوسط" : "متقدم"}</Badge>
                            <span className="text-xl font-bold text-primary">{product.price} ج.م</span>
                          </div>
                        </div>
                        {selectedCourse === product.id && (
                          <div className="absolute inset-0 rounded-xl ring-2 ring-primary pointer-events-none" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Payment Method - hidden for free/zero total */}
            {selectedItem && !(selectedItem && ((selectedItem as any).is_free || (selectedItem as any).price === 0)) && total > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <CreditCard className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground">طريقة الدفع</h3>
                </div>
                <div className="grid sm:grid-cols-3 gap-4 mb-6">
                  {paymentMethods.filter(m => m.enabled).map((method) => (
                    <div
                      key={method.id}
                      className={cn(
                        "relative p-5 rounded-xl cursor-pointer transition-all duration-300 border-2",
                        paymentMethod === method.id 
                          ? "border-primary bg-primary/5" 
                          : "border-border bg-card hover:border-primary/50"
                      )}
                      onClick={() => setPaymentMethod(method.id)}
                    >
                      {method.recommended && (
                        <Badge className="absolute -top-2 right-2 bg-success text-success-foreground text-xs">
                          موصى به
                        </Badge>
                      )}
                      <div className="flex items-center gap-3 mb-2">
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center",
                          paymentMethod === method.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        )}>
                          <method.icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground text-sm">{method.name}</p>
                          <p className="text-xs text-muted-foreground">{method.description}</p>
                        </div>
                      </div>
                      {paymentMethod === method.id && (
                        <CheckCircle2 className="absolute top-3 left-3 w-5 h-5 text-primary" />
                      )}
                    </div>
                  ))}
                </div>

                {/* Payment Details for manual methods */}
                {paymentMethod !== "kashier" && paymentMethod !== "coupon_only" && (
                  <div className="space-y-4 p-6 rounded-xl bg-muted/50 border">
                    <div className="p-4 rounded-lg bg-card border">
                      <p className="text-sm font-medium text-foreground mb-2">
                        {paymentMethod === "bank_transfer" ? "بيانات التحويل البنكي:" : "بيانات المحافظ الإلكترونية:"}
                      </p>
                      <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-sans">
                        {paymentMethod === "bank_transfer" 
                          ? (platformSettings?.bankTransferDetails || "البنك الأهلي المصري\nرقم الحساب: 1234567890")
                          : (platformSettings?.mobileWalletDetails || "فودافون كاش: 01xxxxxxxxx")}
                      </pre>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="paymentReference">رقم المرجع / رقم العملية *</Label>
                      <Input
                        id="paymentReference"
                        placeholder="أدخل رقم المرجع من إيصال التحويل"
                        value={paymentReference}
                        onChange={(e) => setPaymentReference(e.target.value)}
                        className="bg-card"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="paymentNotes">ملاحظات إضافية</Label>
                      <Textarea
                        id="paymentNotes"
                        placeholder="أي معلومات إضافية..."
                        rows={2}
                        value={paymentNotes}
                        onChange={(e) => setPaymentNotes(e.target.value)}
                        className="bg-card"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>إيصال الدفع (اختياري)</Label>
                      <div className="flex items-center gap-4">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*,.pdf"
                          onChange={handleReceiptUpload}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          className="gap-2"
                        >
                          <Upload className="w-4 h-4" />
                          رفع إيصال
                        </Button>
                        {receiptFile && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <FileImage className="w-4 h-4" />
                            {receiptFile.name}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Kashier info */}
                {paymentMethod === "kashier" && (
                  <div className="p-6 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <Globe className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground mb-1">الدفع الإلكتروني عبر Kashier</h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          سيتم فتح نافذة الدفع الآمنة حيث يمكنك الدفع باستخدام:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary">Visa</Badge>
                          <Badge variant="secondary">Mastercard</Badge>
                          <Badge variant="secondary">فوري</Badge>
                          <Badge variant="secondary">فودافون كاش</Badge>
                          <Badge variant="secondary">التقسيط</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 p-6 rounded-2xl bg-card border shadow-lg">
              <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-primary" />
                إتمام الشراء
              </h3>

              {selectedItem ? (
                <>
                  <div className="space-y-4 mb-6">
                    <div className="flex justify-between items-start">
                      <span className="text-muted-foreground">المنتج</span>
                      <span className="font-medium text-foreground text-left">{selectedItem.name_ar || selectedItem.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">السعر</span>
                      <span className="text-foreground">
                        {(selectedItem as any).is_free || subtotal === 0 ? (
                          <span className="text-success font-bold">مجاني</span>
                        ) : (
                          `${subtotal} ج.م`
                        )}
                      </span>
                    </div>
                    {appliedCoupon && subtotal > 0 && (
                      <div className="flex justify-between text-success">
                        <span className="flex items-center gap-1">
                          <Gift className="w-4 h-4" />
                          خصم ({appliedCoupon.code})
                        </span>
                        <span>-{discount.toFixed(2)} ج.م</span>
                      </div>
                    )}
                    <div className="border-t border-border pt-4 flex justify-between text-lg font-bold">
                      <span>الإجمالي</span>
                      <span className={total === 0 ? "text-success" : "text-primary"}>
                        {total === 0 ? "مجاني" : `${total.toFixed(2)} ج.م`}
                      </span>
                    </div>
                  </div>

                  {/* Hide coupon for free plans */}
                  {!((selectedItem as any).is_free || subtotal === 0) && (
                    <div className="mb-6 p-4 rounded-xl bg-muted/50">
                      <Label htmlFor="coupon" className="text-sm font-medium">كود الخصم</Label>
                      <div className="flex gap-2 mt-2">
                        <div className="relative flex-1">
                          <Tag className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="coupon"
                            placeholder="أدخل الكود"
                            className="pr-9 bg-card"
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                            disabled={!!appliedCoupon}
                          />
                        </div>
                        <Button 
                          variant="outline" 
                          onClick={handleApplyCoupon}
                          disabled={!!appliedCoupon}
                        >
                          تطبيق
                        </Button>
                      </div>
                      {appliedCoupon && (
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-sm text-success flex items-center gap-1">
                            <Check className="w-4 h-4" />
                            تم تطبيق كود: {appliedCoupon.code}
                          </p>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={handleRemoveCoupon}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 px-2"
                          >
                            <X className="w-4 h-4" />
                            إزالة
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  <Button 
                    className={cn(
                      "w-full h-12 text-base gap-2",
                      isFreeOrCovered && "bg-success hover:bg-success/90"
                    )}
                    size="lg"
                    onClick={handleCheckout}
                    disabled={
                      loading ||
                      uploadingReceipt ||
                      kashierLoading ||
                      // For service purchases, prevent starting Kashier before intent is ready
                      (Boolean(purchaseIntentIdFromUrl) &&
                        paymentMethod === "kashier" &&
                        (intentLoading || !purchaseIntent || !servicePurchaseProduct)) ||
                      (
                        !isFreeOrCovered &&
                        paymentMethod !== "kashier" &&
                        paymentMethod !== "coupon_only" &&
                        !paymentReference.trim()
                      )
                    }
                  >
                    {loading || uploadingReceipt || kashierLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        جاري المعالجة...
                      </>
                    ) : (selectedItem as any).is_free || subtotal === 0 ? (
                      <>
                        <Gift className="w-5 h-5" />
                        تفعيل الباقة المجانية
                        <ArrowRight className="w-4 h-4" />
                      </>
                    ) : paymentMethod === "kashier" ? (
                      <>
                        <Globe className="w-5 h-5" />
                        الدفع الآن
                        <ArrowRight className="w-4 h-4" />
                      </>
                    ) : total === 0 ? (
                      <>
                        <Sparkles className="w-5 h-5" />
                        إتمام الشراء وتفعيل المنتج
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-5 h-5" />
                        {purchaseIntentIdFromUrl ? "إرسال طلب الخدمة للمراجعة" : "إرسال الطلب للمراجعة"}
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-muted-foreground text-center mt-4">
                    {(selectedItem as any).is_free || subtotal === 0
                      ? "سيتم التفعيل فوراً بدون مراجعة"
                      : paymentMethod === "kashier" 
                      ? "ستفتح نافذة الدفع الآمنة"
                      : total === 0
                      ? "سيتم إتمام الشراء وتفعيل المنتج فوراً باستخدام كود الخصم"
                      : purchaseIntentIdFromUrl
                      ? "سيتم إنشاء طلب الخدمة بعد مراجعة الإدارة"
                      : "سيتم تفعيل الكريديت بعد مراجعة الإدارة"}
                  </p>
                </>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                    <ShoppingCart className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">اختر باقة أو كريديتات</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Processing Status Banner */}
      {paymentWindowOpened && (
        <div className="fixed bottom-4 right-4 left-4 z-50 max-w-md mx-auto">
          <div className="bg-card border shadow-lg rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">جاري انتظار الدفع...</p>
                <p className="text-sm text-muted-foreground">أكمل الدفع في التبويب الجديد</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={handleCancelPaymentPolling}
              >
                إلغاء
              </Button>
              <Button
                size="sm"
                className="flex-1"
                onClick={() => navigate("/client/billing")}
              >
                عرض الفواتير
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Kashier iFrame Modal */}
      <KashierIframeModal
        isOpen={showKashierIframe}
        onClose={handleKashierClose}
        paymentUrl={kashierPaymentUrl}
        orderId={pendingOrderId || ""}
        onSuccess={handleKashierSuccess}
        onFailure={handleKashierFailure}
      />
    </DashboardLayout>
  );
}
