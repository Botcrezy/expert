import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FreelancerLayout } from "@/components/layout/FreelancerLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Gift, AlertTriangle, Copy, Clock, DollarSign, FileText, Shield, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getPublicAppOrigin } from "@/lib/getPublicAppOrigin";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

export default function FreelancerAdfaly() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // On each visit, attempt to release any paid invoices whose 4-day hold has elapsed.
  useEffect(() => {
    const run = async () => {
      if (!user?.id) return;
      try {
        await supabase.functions.invoke("release-payment-collection-funds", { body: {} });
        queryClient.invalidateQueries({ queryKey: ["payment-collection-invoices", user.id] });
      } catch {
        // silent
      }
    };

    run();
  }, [user?.id, queryClient]);

  const [showActivationForm, setShowActivationForm] = useState(false);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  
  // Activation form state
  const [usagePurpose, setUsagePurpose] = useState("");
  const [expectedAmount, setExpectedAmount] = useState("");
  const [hasInternationalClients, setHasInternationalClients] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  
  // Invoice form state
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientCountry, setClientCountry] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");

  // Fetch settings
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['payment-collection-settings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_collection_settings')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch identity verification
  const { data: verification } = useQuery({
    queryKey: ['identity-verification', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('identity_verifications')
        .select('status')
        .eq('user_id', user!.id)
        .eq('user_type', 'freelancer')
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Fetch invoices
  const {
    data: invoices,
    isLoading: invoicesLoading,
    error: invoicesError,
    refetch: refetchInvoices,
  } = useQuery({
    queryKey: ['payment-collection-invoices', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_collection_invoices')
        .select('*')
        .eq('freelancer_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user && settings?.is_enabled,
  });

  // Activate service mutation
  const activateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('payment_collection_settings')
        .upsert({
          user_id: user!.id,
          is_enabled: true,
          usage_purpose: usagePurpose,
          expected_monthly_amount: expectedAmount,
          has_international_clients: hasInternationalClients,
          agreed_to_terms: agreedToTerms,
          agreed_at: new Date().toISOString(),
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-collection-settings'] });
      setShowActivationForm(false);
      toast.success("تم تفعيل خدمة ادفعلي بنجاح!");
    },
    onError: (error: any) => {
      toast.error(error.message || "حدث خطأ أثناء التفعيل");
    },
  });

  // Create invoice mutation
  const createInvoiceMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('create-payment-collection', {
        body: {
          clientName,
          clientEmail,
          clientCountry,
          description,
          amount: parseFloat(amount),
          origin: getPublicAppOrigin(),
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['payment-collection-invoices', user?.id] });
      await queryClient.refetchQueries({ queryKey: ['payment-collection-invoices', user?.id] });

      setShowInvoiceForm(false);
      setClientName("");
      setClientEmail("");
      setClientCountry("");
      setDescription("");
      setAmount("");

      // Copy link to clipboard (always use the public origin)
      const generatedToken = data?.invoice?.token;
      const link = generatedToken ? `${getPublicAppOrigin()}/pay/${generatedToken}` : data?.paymentLink;
      if (link) navigator.clipboard.writeText(link);
      toast.success("تم إنشاء الفاتورة ونسخ الرابط!");
    },
    onError: (error: any) => {
      toast.error(error.message || "حدث خطأ أثناء إنشاء الفاتورة");
    },
  });

  const copyLink = (token: string) => {
    const link = `${getPublicAppOrigin()}/pay/${token}`;
    navigator.clipboard.writeText(link);
    toast.success("تم نسخ الرابط!");
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; variant: any }> = {
      pending: { label: "قيد الدفع", variant: "secondary" },
      paid: { label: "مدفوعة", variant: "default" },
      failed: { label: "فشل الدفع", variant: "destructive" },
      expired: { label: "منتهية", variant: "outline" },
      cancelled: { label: "ملغاة", variant: "outline" },
    };
    
    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (settingsLoading) {
    return (
      <FreelancerLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </FreelancerLayout>
    );
  }

  // First time - show welcome screen
  if (!settings) {
    return (
      <FreelancerLayout>
        <div className="container max-w-4xl mx-auto py-8 px-4">
          <Card className="border-2 border-primary/20">
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto w-24 h-24 bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center">
                <Gift className="w-12 h-12 text-primary-foreground" />
              </div>
              <CardTitle className="text-3xl">مرحباً بك في ادفعلي</CardTitle>
              <CardDescription className="text-lg">
                استقبل أموالك بسهولة من أي عميل داخل مصر أو خارجها
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center space-y-2 p-4 rounded-lg bg-muted">
                  <TrendingUp className="w-8 h-8 mx-auto text-primary" />
                  <h3 className="font-semibold">سريع وآمن</h3>
                  <p className="text-sm text-muted-foreground">روابط دفع احترافية</p>
                </div>
                <div className="text-center space-y-2 p-4 rounded-lg bg-muted">
                  <DollarSign className="w-8 h-8 mx-auto text-primary" />
                  <h3 className="font-semibold">بدون رسوم خفية</h3>
                  <p className="text-sm text-muted-foreground">شفافية كاملة</p>
                </div>
                <div className="text-center space-y-2 p-4 rounded-lg bg-muted">
                  <Shield className="w-8 h-8 mx-auto text-primary" />
                  <h3 className="font-semibold">حماية متقدمة</h3>
                  <p className="text-sm text-muted-foreground">معايير أمان عالية</p>
                </div>
              </div>

              {verification?.status !== 'approved' ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    لا يمكن تفعيل ميزة ادفعلي قبل توثيق الهوية لحماية المستخدمين ومنع إساءة الاستخدام.
                  </AlertDescription>
                </Alert>
              ) : null}

              <div className="flex gap-4">
                {verification?.status === 'approved' ? (
                  <Button 
                    onClick={() => setShowActivationForm(true)}
                    className="flex-1"
                    size="lg"
                  >
                    فعّل خدمة ادفعلي مجانًا
                  </Button>
                ) : (
                  <Button 
                    onClick={() => navigate('/freelancer/identity-verification')}
                    className="flex-1"
                    size="lg"
                  >
                    ابدأ توثيق الهوية
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Activation Form Dialog */}
          <Dialog open={showActivationForm} onOpenChange={setShowActivationForm}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>تفعيل خدمة ادفعلي</DialogTitle>
                <DialogDescription>
                  يرجى ملء المعلومات التالية لتفعيل الخدمة
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>ما طبيعة استخدامك للروابط؟ *</Label>
                  <RadioGroup value={usagePurpose} onValueChange={setUsagePurpose}>
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <RadioGroupItem value="design" id="design" />
                      <Label htmlFor="design" className="cursor-pointer">استلام دفعات مشاريع تصميم</Label>
                    </div>
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <RadioGroupItem value="development" id="development" />
                      <Label htmlFor="development" className="cursor-pointer">استلام دفعات تطوير مواقع</Label>
                    </div>
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <RadioGroupItem value="content" id="content" />
                      <Label htmlFor="content" className="cursor-pointer">استلام دفعات محتوى وتسويق</Label>
                    </div>
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <RadioGroupItem value="other" id="other" />
                      <Label htmlFor="other" className="cursor-pointer">أخرى</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label>ما متوسط المبلغ المتوقع تحصيله شهريًا؟ *</Label>
                  <RadioGroup value={expectedAmount} onValueChange={setExpectedAmount}>
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <RadioGroupItem value="low" id="low" />
                      <Label htmlFor="low" className="cursor-pointer">أقل من 3000 ج.م</Label>
                    </div>
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <RadioGroupItem value="medium" id="medium" />
                      <Label htmlFor="medium" className="cursor-pointer">من 3000 إلى 10000 ج.م</Label>
                    </div>
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <RadioGroupItem value="high" id="high" />
                      <Label htmlFor="high" className="cursor-pointer">أكثر من 10000 ج.م</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox 
                    id="international" 
                    checked={hasInternationalClients}
                    onCheckedChange={(checked) => setHasInternationalClients(checked as boolean)}
                  />
                  <Label htmlFor="international" className="cursor-pointer">
                    لدي عملاء خارج مصر
                  </Label>
                </div>

                <Separator />

                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription className="space-y-2">
                    <p className="font-semibold">سياسات الاستخدام:</p>
                    <ul className="text-sm space-y-1 mr-4 list-disc">
                      <li>يمنع إنشاء روابط دفع لأغراض غير مشروعة</li>
                      <li>يمنع التحايل أو غسل الأموال</li>
                      <li>أي نشاط مشبوه يؤدي لإيقاف الحساب وتجميد الرصيد</li>
                      <li>قد نقدم البيانات للجهات المختصة عند الضرورة</li>
                      <li>مساءلة قانونية كاملة وفق القوانين المعمول بها</li>
                    </ul>
                  </AlertDescription>
                </Alert>

                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox 
                    id="terms" 
                    checked={agreedToTerms}
                    onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                  />
                  <Label htmlFor="terms" className="cursor-pointer">
                    أوافق على الشروط والسياسات *
                  </Label>
                </div>
              </div>

              <DialogFooter>
                <Button
                  onClick={() => activateMutation.mutate()}
                  disabled={!usagePurpose || !expectedAmount || !agreedToTerms || activateMutation.isPending}
                >
                  {activateMutation.isPending ? "جاري التفعيل..." : "تفعيل الخدمة"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </FreelancerLayout>
    );
  }

  // Service is enabled - show dashboard
  const pendingCount = invoices?.filter(i => i.status === 'pending').length || 0;

  return (
    <FreelancerLayout>
      <div className="container max-w-7xl mx-auto py-8 px-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">ادفعلي</h1>
            <p className="text-muted-foreground">إدارة فواتير التحصيل</p>
          </div>
          <Button 
            onClick={() => setShowInvoiceForm(true)}
            disabled={pendingCount >= 3}
            size="lg"
          >
            <FileText className="w-4 h-4 ml-2" />
            إنشاء فاتورة جديدة
          </Button>
        </div>

        {pendingCount >= 3 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              لا يمكنك إنشاء أكثر من 3 روابط دفع غير مدفوعة في الوقت نفسه. يرجى انتظار الدفع أو إلغاء فاتورة قديمة.
            </AlertDescription>
          </Alert>
        )}

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>إجمالي الفواتير</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{invoices?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>قيد الدفع</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{pendingCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>مدفوعة</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {invoices?.filter(i => i.status === 'paid').length || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>إجمالي المحصل</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(invoices as any[] | undefined)
                  ?.filter((i: any) => i.status === "paid" && !!i.released_at)
                  .reduce((sum: number, i: any) => sum + Number(i.amount), 0)
                  .toLocaleString()} ج.م
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Invoices Table */}
        <Card>
          <CardHeader>
            <CardTitle>الفواتير</CardTitle>
          </CardHeader>
          <CardContent>
            {invoicesError ? (
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between gap-3">
                  <span>
                    تعذر تحميل الفواتير. غالبًا سببها صلاحيات الوصول أو مشكلة اتصال.
                  </span>
                  <Button variant="outline" size="sm" onClick={() => refetchInvoices()}>
                    إعادة المحاولة
                  </Button>
                </AlertDescription>
              </Alert>
            ) : null}

            {invoicesLoading ? (
              <div className="text-center py-8">جاري التحميل...</div>
            ) : !invoices || invoices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                لم تقم بإنشاء أي فواتير بعد
              </div>
            ) : (
              <div className="space-y-4">
                {invoices.map((invoice) => (
                  <div key={invoice.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{invoice.invoice_number}</p>
                          {getStatusBadge(invoice.status)}
                          {invoice.flagged && (
                            <Badge variant="destructive">مشبوهة</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {invoice.client_name} • {invoice.client_email}
                        </p>
                        <p className="text-sm">{invoice.description}</p>
                      </div>
                      <div className="text-left space-y-1">
                        <p className="text-2xl font-bold">{Number(invoice.amount).toLocaleString()} ج.م</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(invoice.created_at), 'dd MMM yyyy', { locale: ar })}
                        </p>
                      </div>
                    </div>
                    
                    {invoice.status === 'pending' && (
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-orange-600" />
                        <span>
                          ينتهي في: {format(new Date(invoice.expires_at), 'dd MMM yyyy HH:mm', { locale: ar })}
                        </span>
                      </div>
                    )}

                    {invoice.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => copyLink(invoice.token)}
                        >
                          <Copy className="w-4 h-4 ml-2" />
                          نسخ الرابط
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Invoice Dialog */}
        <Dialog open={showInvoiceForm} onOpenChange={setShowInvoiceForm}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>إنشاء فاتورة جديدة</DialogTitle>
              <DialogDescription>
                ملاحظة: الرابط صالح لمدة 24 ساعة فقط
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="clientName">اسم العميل *</Label>
                <Input
                  id="clientName"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="أدخل اسم العميل"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientEmail">البريد الإلكتروني *</Label>
                <Input
                  id="clientEmail"
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="example@domain.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientCountry">الدولة</Label>
                <Input
                  id="clientCountry"
                  value={clientCountry}
                  onChange={(e) => setClientCountry(e.target.value)}
                  placeholder="مصر"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">وصف الاتفاق/الخدمة *</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="مثال: تصميم شعار وهوية بصرية كاملة"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">المبلغ (بالجنيه المصري) *</Label>
                <Input
                  id="amount"
                  type="number"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  تأكد من صحة البيانات قبل إنشاء الفاتورة. الرابط سيكون صالحاً لمدة 24 ساعة فقط.
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter>
              <Button
                onClick={() => createInvoiceMutation.mutate()}
                disabled={!clientName || !clientEmail || !description || !amount || createInvoiceMutation.isPending}
              >
                {createInvoiceMutation.isPending ? "جاري الإنشاء..." : "إنشاء الفاتورة"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </FreelancerLayout>
  );
}
