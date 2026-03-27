import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useTableSubscription } from "@/hooks/useRealtimeSubscription";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  CheckCircle, 
  XCircle,
  Shield,
  Clock,
  Eye,
  Loader2,
  Search,
  User,
  MapPin,
  CreditCard,
  Calendar
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminIdentityVerifications() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVerification, setSelectedVerification] = useState<any>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [imageErrors, setImageErrors] = useState<{ id_front?: boolean; id_back?: boolean; selfie?: boolean }>({});

  // Realtime subscription
  useTableSubscription("identity_verifications", [["identity-verifications"]]);

  const { data: verifications, isLoading } = useQuery({
    queryKey: ["identity-verifications", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("identity_verifications")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      if (!data || data.length === 0) return [];

      // Fetch profiles
      const userIds = data.map(v => v.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", userIds);

      return data.map(v => ({
        ...v,
        profile: profiles?.find(p => p.user_id === v.user_id)
      }));
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ id, approved, reason }: { id: string; approved: boolean; reason?: string }) => {
      const { data: verification } = await supabase
        .from("identity_verifications")
        .select("user_id, user_type")
        .eq("id", id)
        .single();

      const { error } = await supabase
        .from("identity_verifications")
        .update({
          status: approved ? "approved" : "rejected",
          rejection_reason: reason || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      // Update profile identity_verified status
      if (approved && verification) {
        await supabase
          .from("profiles")
          .update({ identity_verified: true })
          .eq("user_id", verification.user_id);

        if (verification.user_type === "freelancer") {
          await supabase
            .from("freelancer_profiles")
            .update({ identity_verified: true })
            .eq("user_id", verification.user_id);
        }
      }
    },
    onSuccess: (_, { approved }) => {
      queryClient.invalidateQueries({ queryKey: ["identity-verifications"] });
      toast({ title: approved ? "تم قبول التحقق ✅" : "تم رفض الطلب" });
      setSelectedVerification(null);
      setShowRejectDialog(false);
      setRejectReason("");
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    },
  });

  const filteredVerifications = verifications?.filter((v: any) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      v.full_name?.toLowerCase().includes(searchLower) ||
      v.national_id?.includes(searchLower) ||
      v.profile?.email?.toLowerCase().includes(searchLower)
    );
  });

  const pendingCount = verifications?.filter((v: any) => v.status === "pending").length || 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-warning/10 text-warning"><Clock className="w-3 h-3 ml-1" />قيد المراجعة</Badge>;
      case "approved":
        return <Badge className="bg-success/10 text-success"><CheckCircle className="w-3 h-3 ml-1" />تم التحقق</Badge>;
      case "rejected":
        return <Badge className="bg-destructive/10 text-destructive"><XCircle className="w-3 h-3 ml-1" />مرفوض</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <DashboardLayout
      sidebar={<AdminSidebar />}
      title="طلبات التحقق من الهوية"
      subtitle="مراجعة واعتماد طلبات التحقق"
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card 
            className={`cursor-pointer transition-all ${statusFilter === "pending" ? "ring-2 ring-primary" : ""}`}
            onClick={() => setStatusFilter("pending")}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingCount}</p>
                <p className="text-sm text-muted-foreground">في الانتظار</p>
              </div>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer transition-all ${statusFilter === "approved" ? "ring-2 ring-primary" : ""}`}
            onClick={() => setStatusFilter("approved")}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {verifications?.filter((v: any) => v.status === "approved").length || 0}
                </p>
                <p className="text-sm text-muted-foreground">تم التحقق</p>
              </div>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer transition-all ${statusFilter === "rejected" ? "ring-2 ring-primary" : ""}`}
            onClick={() => setStatusFilter("rejected")}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {verifications?.filter((v: any) => v.status === "rejected").length || 0}
                </p>
                <p className="text-sm text-muted-foreground">مرفوض</p>
              </div>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer transition-all ${statusFilter === "all" ? "ring-2 ring-primary" : ""}`}
            onClick={() => setStatusFilter("all")}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{verifications?.length || 0}</p>
                <p className="text-sm text-muted-foreground">الإجمالي</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="بحث بالاسم أو الرقم القومي..."
            className="pr-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Table */}
        <div className="card-elevated overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>المستخدم</TableHead>
                <TableHead>النوع</TableHead>
                <TableHead>الرقم القومي</TableHead>
                <TableHead>العنوان</TableHead>
                <TableHead>تاريخ الطلب</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : !filteredVerifications?.length ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>لا توجد طلبات تحقق</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredVerifications.map((v: any) => (
                  <TableRow key={v.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={v.profile?.avatar_url} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {v.full_name?.charAt(0) || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{v.full_name}</p>
                          <p className="text-sm text-muted-foreground">{v.profile?.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {v.user_type === "client" ? "عميل" : "فريلانسر"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">{v.national_id}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{v.city}, {v.governorate}</TableCell>
                    <TableCell>
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(v.created_at), "dd MMM yyyy", { locale: ar })}
                      </span>
                    </TableCell>
                    <TableCell>{getStatusBadge(v.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedVerification(v)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {v.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              className="bg-success hover:bg-success/90"
                              onClick={() => verifyMutation.mutate({ id: v.id, approved: true })}
                              disabled={verifyMutation.isPending}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setSelectedVerification(v);
                                setShowRejectDialog(true);
                              }}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* View Details Dialog */}
      <Dialog
        open={!!selectedVerification && !showRejectDialog}
        onOpenChange={() => setSelectedVerification(null)}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              تفاصيل طلب التحقق
            </DialogTitle>
          </DialogHeader>

          {selectedVerification && (
            <Tabs defaultValue="personal" className="space-y-4">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="personal" className="gap-2">
                  <User className="w-4 h-4" />
                  البيانات الشخصية
                </TabsTrigger>
                <TabsTrigger value="address" className="gap-2">
                  <MapPin className="w-4 h-4" />
                  العنوان
                </TabsTrigger>
                <TabsTrigger value="documents" className="gap-2">
                  <CreditCard className="w-4 h-4" />
                  المستندات
                </TabsTrigger>
              </TabsList>

              <TabsContent value="personal" className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">الاسم الكامل</p>
                    <p className="font-semibold">{selectedVerification.full_name}</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">الرقم القومي</p>
                    <p className="font-semibold font-mono">{selectedVerification.national_id}</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">تاريخ الميلاد</p>
                    <p className="font-semibold">
                      {selectedVerification.date_of_birth 
                        ? format(new Date(selectedVerification.date_of_birth), "dd MMMM yyyy", { locale: ar })
                        : "غير محدد"}
                    </p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">الجنس</p>
                    <p className="font-semibold">
                      {selectedVerification.gender === "male" ? "ذكر" : 
                       selectedVerification.gender === "female" ? "أنثى" : "غير محدد"}
                    </p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">الجنسية</p>
                    <p className="font-semibold">{selectedVerification.nationality || "غير محدد"}</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">نوع الحساب</p>
                    <p className="font-semibold">
                      {selectedVerification.user_type === "client" ? "عميل" : "فريلانسر"}
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="address" className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2 p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">العنوان التفصيلي</p>
                    <p className="font-semibold">{selectedVerification.address}</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">المدينة</p>
                    <p className="font-semibold">{selectedVerification.city}</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">المحافظة</p>
                    <p className="font-semibold">{selectedVerification.governorate || "غير محدد"}</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">الرمز البريدي</p>
                    <p className="font-semibold">{selectedVerification.postal_code || "غير محدد"}</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="documents" className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">وجه البطاقة</p>
                    <div className="border rounded-lg overflow-hidden bg-muted aspect-[3/2] flex items-center justify-center">
                      {selectedVerification.id_front_url ? (
                        <>
                          <img 
                            src={selectedVerification.id_front_url} 
                            alt="Front ID" 
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              setImageErrors((prev) => ({ ...prev, id_front: true }));
                            }}
                          />
                          {imageErrors.id_front && (
                            <div className="error-text text-center p-4">
                              <p className="text-destructive text-sm">⚠️ فشل تحميل الصورة</p>
                              <p className="text-xs text-muted-foreground mt-1">تحقق من رابط الصورة</p>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-center text-muted-foreground">
                          <CreditCard className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">لا توجد صورة</p>
                        </div>
                      )}
                    </div>
                    {selectedVerification.id_front_url && (
                      <a 
                        href={selectedVerification.id_front_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline block"
                      >
                        فتح في تبويب جديد ↗
                      </a>
                    )}
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">ظهر البطاقة</p>
                    <div className="border rounded-lg overflow-hidden bg-muted aspect-[3/2] flex items-center justify-center">
                      {selectedVerification.id_back_url ? (
                        <>
                          <img 
                            src={selectedVerification.id_back_url} 
                            alt="Back ID" 
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              setImageErrors((prev) => ({ ...prev, id_back: true }));
                            }}
                          />
                          {imageErrors.id_back && (
                            <div className="error-text text-center p-4">
                              <p className="text-destructive text-sm">⚠️ فشل تحميل الصورة</p>
                              <p className="text-xs text-muted-foreground mt-1">تحقق من رابط الصورة</p>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-center text-muted-foreground">
                          <CreditCard className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">لا توجد صورة</p>
                        </div>
                      )}
                    </div>
                    {selectedVerification.id_back_url && (
                      <a 
                        href={selectedVerification.id_back_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline block"
                      >
                        فتح في تبويب جديد ↗
                      </a>
                    )}
                  </div>
                  {selectedVerification.selfie_url && (
                    <div className="sm:col-span-2 space-y-2">
                      <p className="text-sm font-medium">صورة سيلفي</p>
                      <div className="border rounded-lg overflow-hidden bg-muted max-w-sm mx-auto aspect-[3/2] flex items-center justify-center">
                        <img 
                          src={selectedVerification.selfie_url} 
                          alt="Selfie" 
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            setImageErrors((prev) => ({ ...prev, selfie: true }));
                          }}
                        />
                        {imageErrors.selfie && (
                          <div className="error-text text-center p-4">
                            <p className="text-destructive text-sm">⚠️ فشل تحميل الصورة</p>
                            <p className="text-xs text-muted-foreground mt-1">تحقق من رابط الصورة</p>
                          </div>
                        )}
                      </div>
                      <a 
                        href={selectedVerification.selfie_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline block text-center"
                      >
                        فتح في تبويب جديد ↗
                      </a>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setSelectedVerification(null)}>
              إغلاق
            </Button>
            {selectedVerification?.status === "pending" && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => setShowRejectDialog(true)}
                >
                  <XCircle className="w-4 h-4 ml-2" />
                  رفض
                </Button>
                <Button
                  className="bg-success hover:bg-success/90"
                  onClick={() => verifyMutation.mutate({ id: selectedVerification.id, approved: true })}
                  disabled={verifyMutation.isPending}
                >
                  <CheckCircle className="w-4 h-4 ml-2" />
                  قبول وتوثيق
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>رفض طلب التحقق</DialogTitle>
            <DialogDescription>
              يرجى تحديد سبب الرفض
            </DialogDescription>
          </DialogHeader>

          <Textarea
            placeholder="سبب الرفض..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={4}
          />

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false);
                setRejectReason("");
              }}
            >
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedVerification && verifyMutation.mutate({
                id: selectedVerification.id,
                approved: false,
                reason: rejectReason
              })}
              disabled={verifyMutation.isPending}
            >
              {verifyMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "تأكيد الرفض"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}