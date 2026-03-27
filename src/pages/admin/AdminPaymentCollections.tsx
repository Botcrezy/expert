import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Copy, FileText, Flag, XCircle, Clock, Search } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { DataTable } from "@/components/ui/DataTable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getPublicAppOrigin } from "@/lib/getPublicAppOrigin";

export default function AdminPaymentCollections() {
  const { user } = useAuth();
  const queryClient = useQueryClient();


  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedFreelancer, setSelectedFreelancer] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientCountry, setClientCountry] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Fetch all invoices with freelancer details
  const { data: rawInvoices, isLoading } = useQuery({
    queryKey: ['admin-payment-collections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_collection_invoices')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      const invoicesWithFreelancers = await Promise.all(
        (data || []).map(async (invoice) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('user_id', invoice.freelancer_id)
            .single();
          
          return { ...invoice, freelancer: { profiles: profile } };
        })
      );
      
      return invoicesWithFreelancers;
    },
  });

  const invoices = rawInvoices;

  // Fetch freelancers with active service
  const { data: rawFreelancers } = useQuery({
    queryKey: ['active-freelancers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_collection_settings')
        .select('user_id')
        .eq('is_enabled', true);
      
      if (error) throw error;
      
      const freelancersWithProfiles = await Promise.all(
        (data || []).map(async (setting) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('user_id', setting.user_id)
            .single();
          
          return { ...setting, profiles: profile };
        })
      );
      
      return freelancersWithProfiles;
    },
  });

  const freelancers = rawFreelancers;

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
          createdBy: selectedFreelancer,
          origin: getPublicAppOrigin(),
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-payment-collections'] });
      setShowCreateForm(false);
      setSelectedFreelancer("");
      setClientName("");
      setClientEmail("");
      setClientCountry("");
      setDescription("");
      setAmount("");

      // Copy link (always public origin)
      const generatedToken = (data as any)?.invoice?.token;
      const link = generatedToken ? `${getPublicAppOrigin()}/pay/${generatedToken}` : (data as any)?.paymentLink;
      if (link) navigator.clipboard.writeText(link);

      toast.success("تم إنشاء الفاتورة بنجاح");
    },
    onError: (error: any) => {
      toast.error(error.message || "حدث خطأ أثناء إنشاء الفاتورة");
    },
  });

  // Cancel invoice mutation
  const cancelMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const { error } = await supabase
        .from('payment_collection_invoices')
        .update({ status: 'cancelled' })
        .eq('id', invoiceId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payment-collections'] });
      toast.success("تم إلغاء الفاتورة");
    },
  });

  // Flag invoice mutation
  const flagMutation = useMutation({
    mutationFn: async ({ invoiceId, flagged, reason }: { invoiceId: string; flagged: boolean; reason?: string }) => {
      const { error } = await supabase
        .from('payment_collection_invoices')
        .update({ 
          flagged,
          flagged_reason: reason || null
        })
        .eq('id', invoiceId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payment-collections'] });
      toast.success("تم تحديث علامة الفاتورة");
    },
  });

  // Suspend service mutation
  const suspendServiceMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      const { error } = await supabase
        .from('payment_collection_settings')
        .update({
          is_enabled: false,
          suspended_by: user!.id,
          suspended_at: new Date().toISOString(),
          suspension_reason: reason
        })
        .eq('user_id', userId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payment-collections'] });
      toast.success("تم تجميد الخدمة للمستخدم");
    },
  });

  const copyLink = (token: string) => {
    const link = `${getPublicAppOrigin()}/pay/${token}`;
    navigator.clipboard.writeText(link);
    toast.success("تم نسخ الرابط");
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; variant: any }> = {
      pending: { label: "قيد الدفع", variant: "secondary" },
      paid: { label: "مدفوعة", variant: "default" },
      failed: { label: "فشل", variant: "destructive" },
      expired: { label: "منتهية", variant: "outline" },
      cancelled: { label: "ملغاة", variant: "outline" },
    };
    
    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // Filter invoices
  const filteredInvoices = invoices?.filter(invoice => {
    const matchesSearch = !searchQuery || 
      invoice.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.freelancer.profiles.full_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const columns = [
    {
      key: 'invoice_number',
      header: 'رقم الفاتورة',
      render: (invoice: any) => (
        <div className="space-y-1">
          <div className="font-semibold">{invoice.invoice_number}</div>
          {invoice.flagged && (
            <Badge variant="destructive" className="text-xs">
              <Flag className="w-3 h-3 ml-1" />
              مشبوهة
            </Badge>
          )}
        </div>
      )
    },
    {
      key: 'freelancer',
      header: 'الفريلانسر',
      render: (invoice: any) => (
        <div className="space-y-1">
          <div className="font-medium">{invoice.freelancer.profiles.full_name}</div>
          <div className="text-xs text-muted-foreground">{invoice.freelancer.profiles.email}</div>
        </div>
      )
    },
    {
      key: 'client',
      header: 'العميل',
      render: (invoice: any) => (
        <div className="space-y-1">
          <div className="font-medium">{invoice.client_name}</div>
          <div className="text-xs text-muted-foreground">{invoice.client_email}</div>
        </div>
      )
    },
    {
      key: 'amount',
      header: 'المبلغ',
      render: (invoice: any) => (
        <div className="font-semibold">{Number(invoice.amount).toLocaleString()} ج.م</div>
      )
    },
    {
      key: 'status',
      header: 'الحالة',
      render: (invoice: any) => getStatusBadge(invoice.status)
    },
    {
      key: 'created_at',
      header: 'التاريخ',
      render: (invoice: any) => (
        <div className="text-sm">
          {format(new Date(invoice.created_at), 'dd MMM yyyy HH:mm', { locale: ar })}
        </div>
      )
    },
    {
      key: 'expires_at',
      header: 'ينتهي في',
      render: (invoice: any) => (
        <div className="flex items-center gap-1 text-sm">
          <Clock className="w-3 h-3" />
          {format(new Date(invoice.expires_at), 'dd MMM HH:mm', { locale: ar })}
        </div>
      )
    },
    {
      key: 'actions',
      header: 'الإجراءات',
      render: (invoice: any) => (
        <div className="flex gap-2">
          {invoice.status === 'pending' && (
            <>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => copyLink(invoice.token)}
              >
                <Copy className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => cancelMutation.mutate(invoice.id)}
              >
                <XCircle className="w-4 h-4" />
              </Button>
            </>
          )}
          <Button 
            variant={invoice.flagged ? "default" : "outline"}
            size="sm"
            onClick={() => flagMutation.mutate({ 
              invoiceId: invoice.id, 
              flagged: !invoice.flagged,
              reason: !invoice.flagged ? "تم وضع علامة من قبل الأدمن" : undefined
            })}
          >
            <Flag className="w-4 h-4" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <DashboardLayout sidebar={<AdminSidebar />}>
      <div className="container max-w-7xl mx-auto py-8 px-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">إدارة فواتير التحصيل</h1>
            <p className="text-muted-foreground">عرض وإدارة جميع فواتير "ادفعلي"</p>
          </div>
          <Button onClick={() => setShowCreateForm(true)} size="lg">
            <FileText className="w-4 h-4 ml-2" />
            إنشاء فاتورة جديدة
          </Button>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-5 gap-4">
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
              <div className="text-2xl font-bold text-orange-600">
                {invoices?.filter(i => i.status === 'pending').length || 0}
              </div>
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
              <CardDescription>مشبوهة</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {invoices?.filter(i => i.flagged).length || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>إجمالي المحصل</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {invoices?.filter(i => i.status === 'paid').reduce((sum, i) => sum + Number(i.amount), 0).toLocaleString()} ج.م
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <div className="flex gap-4 items-end">
              <div className="flex-1 space-y-2">
                <Label>بحث</Label>
                <div className="relative">
                  <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="ابحث برقم الفاتورة أو اسم العميل أو الفريلانسر..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-10"
                  />
                </div>
              </div>
              <div className="w-48 space-y-2">
                <Label>الحالة</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="pending">قيد الدفع</SelectItem>
                    <SelectItem value="paid">مدفوعة</SelectItem>
                    <SelectItem value="failed">فشل</SelectItem>
                    <SelectItem value="expired">منتهية</SelectItem>
                    <SelectItem value="cancelled">ملغاة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Invoices Table */}
        <Card>
          <CardHeader>
            <CardTitle>الفواتير ({filteredInvoices?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {!filteredInvoices || filteredInvoices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">لا توجد فواتير</div>
            ) : (
              <DataTable
                columns={columns}
                data={filteredInvoices}
                searchable={false}
              />
            )}
          </CardContent>
        </Card>

        {/* Create Invoice Dialog */}
        <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>إنشاء فاتورة جديدة</DialogTitle>
              <DialogDescription>
                إنشاء فاتورة لفريلانسر معين
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>اختر الفريلانسر *</Label>
                <Select value={selectedFreelancer} onValueChange={setSelectedFreelancer}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر فريلانسر" />
                  </SelectTrigger>
                  <SelectContent>
                    {freelancers?.map((freelancer) => (
                      <SelectItem key={freelancer.user_id} value={freelancer.user_id}>
                        {freelancer.profiles.full_name} ({freelancer.profiles.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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
            </div>

            <DialogFooter>
              <Button
                onClick={() => createInvoiceMutation.mutate()}
                disabled={!selectedFreelancer || !clientName || !clientEmail || !description || !amount || createInvoiceMutation.isPending}
              >
                {createInvoiceMutation.isPending ? "جاري الإنشاء..." : "إنشاء الفاتورة"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
