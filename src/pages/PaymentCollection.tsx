import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getPublicAppOrigin } from "@/lib/getPublicAppOrigin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, CheckCircle2, Clock, Shield, Star, XCircle, MapPin, FileText, Award } from "lucide-react";
import { format, differenceInHours, differenceInMinutes } from "date-fns";
import { ar } from "date-fns/locale";

export default function PaymentCollection() {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const status = searchParams.get('status');
  const callbackDetected =
    status === 'callback' ||
    !!searchParams.get('paymentStatus') ||
    !!searchParams.get('transactionId') ||
    !!searchParams.get('orderId') ||
    !!searchParams.get('kashierOrderId');
  const [timeRemaining, setTimeRemaining] = useState("");
  const [iframeState, setIframeState] = useState<"loading" | "loaded" | "error">("loading");
  const [iframeKey, setIframeKey] = useState(0);


  // Fetch invoice details (public-safe via backend function)
  const { data: invoice, isLoading, error } = useQuery({
    queryKey: ['payment-collection-invoice', token],
    queryFn: async () => {
      if (!token) throw new Error('Missing token');

      const { data, error } = await (supabase as any).rpc(
        'get_payment_collection_invoice_public',
        { p_token: token }
      );

      if (error) throw error;
      if (!data) throw new Error('Invoice not found');
      return data as any;
    },
    enabled: !!token,
  });

  // Calculate time remaining
  useEffect(() => {
    if (!invoice) return;

    const updateTimer = () => {
      const now = new Date();
      const expires = new Date(invoice.expires_at);
      const hours = differenceInHours(expires, now);
      const minutes = differenceInMinutes(expires, now) % 60;

      if (hours <= 0 && minutes <= 0) {
        setTimeRemaining("منتهي");
      } else if (hours > 24) {
        const days = Math.floor(hours / 24);
        setTimeRemaining(`${days} يوم`);
      } else {
        setTimeRemaining(`${hours} ساعة و ${minutes} دقيقة`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [invoice]);

  // Some payment methods inside Kashier are strict about URL parsing.
  // If metaData contains JSON ("{...}") it can cause: "redirect URL must be a valid uri".
  // We normalize the URL here so old invoices still work.
  // IMPORTANT: Must be declared before any early returns to keep hooks order stable.
  const safePaymentUrl = useMemo(() => {
    if (!invoice?.payment_url) return null;

    try {
      const u = new URL(invoice.payment_url);

      // 1) Normalize metaData (old invoices used JSON)
      const meta = u.searchParams.get("metaData");
      if (meta && /[{}"]/g.test(meta)) {
        let extracted = token || "";
        try {
          const parsed = JSON.parse(meta);
          if (parsed?.token) extracted = String(parsed.token);
        } catch {
          // ignore
        }
        if (extracted) u.searchParams.set("metaData", extracted);
      }

      // 2) IMPORTANT: Don't rewrite redirect URLs based on the current domain.
      // Kashier can reject non-whitelisted domains with a Forbidden error.
      // So we keep the invoice's original redirect URLs as-is.

      return u.toString();
    } catch {
      return invoice.payment_url;
    }
  }, [invoice?.payment_url, token]);

  // Reset iframe state whenever the URL changes (new invoice/payment attempt)
  useEffect(() => {
    setIframeState("loading");
  }, [safePaymentUrl]);

  const publicOrigin = useMemo(() => getPublicAppOrigin(), []);
  const isOnPublicOrigin = useMemo(() => {
    if (typeof window === "undefined") return true;
    return window.location.origin === publicOrigin;
  }, [publicOrigin]);

  const goToPublicDomain = () => {
    if (!token) return;
    const target = new URL(`/pay/${token}`, publicOrigin);
    window.location.href = target.toString();
  };

  const retryIframe = () => {
    setIframeState("loading");
    setIframeKey((k) => k + 1);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <XCircle className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle className="text-center">فاتورة غير موجودة</CardTitle>
            <CardDescription className="text-center">
              الفاتورة التي تبحث عنها غير موجودة أو منتهية الصلاحية
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Check if expired
  const isExpired = new Date(invoice.expires_at) < new Date();
  
  // Check if already paid
  if (invoice.status === 'paid') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-center">تم الدفع بنجاح</CardTitle>
            <CardDescription className="text-center">
              تم دفع هذه الفاتورة بنجاح في {format(new Date(invoice.paid_at!), 'dd MMM yyyy HH:mm', { locale: ar })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">رقم الفاتورة:</span>
                <span className="font-semibold">{invoice.invoice_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">المبلغ:</span>
                <span className="font-semibold">{Number(invoice.amount).toLocaleString()} ج.م</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if expired
  if (isExpired || invoice.status === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mb-4">
              <Clock className="w-8 h-8 text-orange-600" />
            </div>
            <CardTitle className="text-center">الفاتورة منتهية</CardTitle>
            <CardDescription className="text-center">
              انتهت صلاحية رابط الدفع. يرجى التواصل مع المستقل للحصول على رابط جديد.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const freelancerProfile = invoice.freelancer;
  const freelancerData = invoice.freelancer;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/50 to-background">
      {/* Security Badge - Floating */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
        <div className="flex items-center gap-2 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 backdrop-blur-md border border-primary/20 text-primary px-6 py-3 rounded-full shadow-lg">
          <Shield className="w-5 h-5" />
          <span className="text-sm font-semibold">دفع آمن ومشفر بتقنية SSL</span>
        </div>
      </div>

      {/* Main Container - Split Layout */}
      <div className="container max-w-7xl mx-auto p-4 lg:p-8 pt-20">
        <div className="grid lg:grid-cols-[400px,1fr] gap-6 lg:gap-8 min-h-[calc(100vh-8rem)]">
          
          {/* Right Side - Freelancer Info (Mobile: Top, Desktop: Right) */}
          <div className="order-2 lg:order-1 space-y-6 animate-slide-in-right">
            
            {/* Freelancer Profile Card */}
            <Card className="border-2 overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300">
              {/* Header with gradient */}
              <div className="h-24 bg-gradient-to-br from-primary via-primary/80 to-primary/60 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30"></div>
              </div>

              <CardHeader className="-mt-12 relative z-10 space-y-6">
                {/* Avatar */}
                <div className="flex justify-center">
                  <div className="relative">
                    <Avatar className="w-24 h-24 border-4 border-background shadow-2xl ring-4 ring-primary/20">
                      <AvatarImage src={freelancerProfile.avatar_url || ''} />
                      <AvatarFallback className="text-2xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
                        {freelancerProfile.full_name?.charAt(0) || 'F'}
                      </AvatarFallback>
                    </Avatar>
                    {freelancerData.stars && freelancerData.stars > 0 && (
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                        <Star className="w-3 h-3 fill-white" />
                        {freelancerData.stars}
                      </div>
                    )}
                  </div>
                </div>

                {/* Name & Title */}
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold bg-gradient-to-l from-foreground to-foreground/80 bg-clip-text">
                    {freelancerProfile.full_name}
                  </h2>
                  {freelancerData.bio && (
                    <p className="text-sm text-muted-foreground line-clamp-2 px-4">
                      {freelancerData.bio}
                    </p>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center justify-center gap-6 px-4">
                  {freelancerData.rating && (
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                        <span className="font-bold text-lg">{freelancerData.rating.toFixed(1)}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">التقييم</span>
                    </div>
                  )}
                  {freelancerData.completed_tasks > 0 && (
                    <Separator orientation="vertical" className="h-10" />
                  )}
                  {freelancerData.completed_tasks > 0 && (
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center gap-1">
                        <Award className="w-4 h-4 text-primary" />
                        <span className="font-bold text-lg">{freelancerData.completed_tasks}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">مهمة مكتملة</span>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Contact Info (Strict Privacy) */}
                <div className="space-y-3">
                  <div className="text-xs text-muted-foreground">
                    لحماية الخصوصية، لا نعرض بيانات تواصل مباشرة على رابط الدفع.
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Invoice Details Card */}
            <Card className="border-2 shadow-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    تفاصيل الفاتورة
                  </CardTitle>
                  <Badge variant="outline" className="font-mono">{invoice.invoice_number}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-start text-sm">
                    <span className="text-muted-foreground">بيانات العميل</span>
                    <span className="font-medium text-left">{invoice.client?.name_masked || '—'}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-start text-sm">
                    <span className="text-muted-foreground">البريد الإلكتروني</span>
                    <span className="font-medium text-left break-all">{invoice.client?.email_masked || '—'}</span>
                  </div>
                  {invoice.client?.country && (
                    <>
                      <Separator />
                      <div className="flex justify-between items-start text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          الدولة
                        </span>
                        <span className="font-medium">{invoice.client.country}</span>
                      </div>
                    </>
                  )}
                  <Separator />
                  <div className="flex justify-between items-start text-sm">
                    <span className="text-muted-foreground">الوصف</span>
                    <span className="font-medium text-left max-w-[200px]">{invoice.description}</span>
                  </div>
                </div>

                <Separator className="my-4" />

                {/* Total Amount */}
                <div className="bg-gradient-to-br from-primary/5 to-primary/10 p-4 rounded-lg border border-primary/20">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">المبلغ الإجمالي</span>
                    <div className="text-left">
                      <div className="text-3xl font-bold text-primary">
                        {Number(invoice.amount).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">جنيه مصري</div>
                    </div>
                  </div>
                </div>

                {/* Time Remaining */}
                <Alert className="bg-gradient-to-r from-orange-500/10 to-yellow-500/10 border-orange-500/20">
                  <Clock className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="flex items-center justify-between text-sm">
                    <span>الوقت المتبقي للدفع</span>
                    <span className="font-bold text-orange-600">{timeRemaining}</span>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Security Footer */}
            <div className="text-center text-sm text-muted-foreground space-y-2 p-4">
              <div className="flex items-center justify-center gap-2">
                <Shield className="w-4 h-4" />
                <span>جميع المعاملات مشفرة ومحمية</span>
              </div>
              <div className="text-xs">مدعوم من منصة Sity Experts</div>
            </div>
          </div>

          {/* Left Side - Payment Frame (Mobile: Bottom, Desktop: Left) */}
          <div className="order-1 lg:order-2 animate-slide-in-left">
            <Card className="border-2 shadow-2xl h-full min-h-[600px] lg:min-h-full overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  إتمام عملية الدفع
                </CardTitle>

                <CardDescription>
                  سيتم تحويلك إلى بوابة الدفع الآمنة لإتمام العملية
                </CardDescription>
              </CardHeader>

              <CardContent className="p-0 h-[calc(100%-5rem)]">
                {callbackDetected ? (
                  <div className="flex items-center justify-center h-full p-8">
                    <Alert className="max-w-md">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <AlertDescription className="text-center">
                        <div className="space-y-2">
                          <div className="font-semibold text-lg">تم استلام نتيجة الدفع</div>
                          <div className="text-sm text-muted-foreground">سيتم تحديث حالة الفاتورة تلقائياً خلال لحظات</div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  </div>
                ) : invoice.payment_url ? (
                  <div className="h-full relative">
                    {/* Domain guidance (helps when providers reject preview hosts) */}
                    {!isOnPublicOrigin && (
                      <div className="absolute top-3 left-3 right-3 z-20">
                        <Alert className="bg-background/90 backdrop-blur border-primary/20">
                          <AlertDescription className="flex flex-col gap-2 text-sm">
                            <div>
                              لو ظهرت مشكلة في الدفع داخل المعاينة، هنحوّلك تلقائياً للدومين الرسمي لإتمام الدفع.
                            </div>
                            <div className="flex justify-end">
                              <Button size="sm" variant="outline" onClick={goToPublicDomain}>
                                فتح صفحة الدفع على الدومين الرسمي
                              </Button>
                            </div>
                          </AlertDescription>
                        </Alert>
                      </div>
                    )}

                    {/* Loading Overlay */}
                    {iframeState === "loading" && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
                        <div className="text-center space-y-4">
                          <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto"></div>
                          <p className="text-sm text-muted-foreground">جاري تحميل بوابة الدفع الآمنة...</p>
                        </div>
                      </div>
                    )}

                    {/* Iframe Error Overlay */}
                    {iframeState === "error" && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background z-10 p-6">
                        <div className="max-w-md w-full">
                          <Alert variant="destructive">
                            <AlertTriangle className="h-5 w-5" />
                            <AlertDescription className="space-y-3">
                              <div className="font-semibold">تعذر تحميل بوابة الدفع داخل الصفحة</div>
                              <div className="text-sm">قد يكون هذا بسبب قيود المتصفح أو مزود الدفع. جرّب إعادة التحميل.</div>
                              <Button className="w-full" onClick={retryIframe}>
                                إعادة تحميل بوابة الدفع
                              </Button>
                            </AlertDescription>
                          </Alert>
                        </div>
                      </div>
                    )}
                    
                    {/* Payment Iframe */}
                    <iframe
                      key={iframeKey}
                      src={safePaymentUrl || undefined}
                      className="w-full h-full border-0"
                      title="Payment Gateway"
                      sandbox="allow-same-origin allow-scripts allow-forms allow-top-navigation allow-popups"
                      onLoad={() => setIframeState("loaded")}
                      onError={() => setIframeState("error")}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full p-8">
                    <Alert variant="destructive" className="max-w-md">
                      <AlertTriangle className="h-5 w-5" />
                      <AlertDescription className="text-center">
                        <div className="space-y-2">
                          <div className="font-semibold">حدث خطأ في تحميل بوابة الدفع</div>
                          <div className="text-sm">يرجى المحاولة لاحقاً أو التواصل مع المستقل</div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}
