import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Plus, 
  Pencil, 
  Trash2,
  Tag,
  Percent,
  Calendar
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

export default function AdminCoupons() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<any>(null);
  const [formData, setFormData] = useState({
    code: "",
    type: "percent" as "percent" | "fixed",
    value: 0,
    max_uses: null as number | null,
    max_uses_per_user: 1,
    min_order_amount: 0,
    first_time_only: false,
    expires_at: "",
  });

  const { data: coupons, isLoading } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const { data } = await supabase
        .from("coupons")
        .select("*")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from("coupons").insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast({ title: "تم إنشاء الكوبون بنجاح ✅" });
      setIsOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase.from("coupons").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast({ title: "تم تحديث الكوبون ✅" });
      setIsOpen(false);
      setEditingCoupon(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("coupons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast({ title: "تم حذف الكوبون ✅" });
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("coupons").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast({ title: "تم تحديث الحالة ✅" });
    },
  });

  const resetForm = () => {
    setFormData({
      code: "",
      type: "percent",
      value: 0,
      max_uses: null,
      max_uses_per_user: 1,
      min_order_amount: 0,
      first_time_only: false,
      expires_at: "",
    });
  };

  const handleEdit = (coupon: any) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      max_uses: coupon.max_uses,
      max_uses_per_user: coupon.max_uses_per_user || 1,
      min_order_amount: coupon.min_order_amount || 0,
      first_time_only: coupon.first_time_only,
      expires_at: coupon.expires_at ? format(new Date(coupon.expires_at), "yyyy-MM-dd") : "",
    });
    setIsOpen(true);
  };

  const handleSubmit = () => {
    const data = {
      ...formData,
      code: formData.code.toUpperCase(),
      expires_at: formData.expires_at || null,
      max_uses: formData.max_uses || null,
    };

    if (editingCoupon) {
      updateMutation.mutate({ id: editingCoupon.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <DashboardLayout
      sidebar={<AdminSidebar />}
      title="إدارة الكوبونات"
      subtitle="إنشاء وإدارة كوبونات الخصم"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Tag className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{coupons?.length || 0}</p>
              <p className="text-sm text-muted-foreground">إجمالي الكوبونات</p>
            </div>
          </div>
          
          <Dialog open={isOpen} onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) {
              setEditingCoupon(null);
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 ml-2" />
                إضافة كوبون
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingCoupon ? "تعديل الكوبون" : "إضافة كوبون جديد"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>كود الكوبون</Label>
                  <Input
                    placeholder="مثال: SAVE20"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="uppercase"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>نوع الخصم</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value: "percent" | "fixed") => setFormData({ ...formData, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percent">نسبة مئوية</SelectItem>
                        <SelectItem value="fixed">مبلغ ثابت</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>القيمة</Label>
                    <Input
                      type="number"
                      placeholder={formData.type === "percent" ? "%" : "ج.م"}
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>الحد الأقصى للاستخدام</Label>
                    <Input
                      type="number"
                      placeholder="غير محدود"
                      value={formData.max_uses || ""}
                      onChange={(e) => setFormData({ ...formData, max_uses: e.target.value ? Number(e.target.value) : null })}
                    />
                  </div>
                  <div>
                    <Label>الاستخدام لكل مستخدم</Label>
                    <Input
                      type="number"
                      value={formData.max_uses_per_user}
                      onChange={(e) => setFormData({ ...formData, max_uses_per_user: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div>
                  <Label>الحد الأدنى للطلب</Label>
                  <Input
                    type="number"
                    placeholder="0 = بدون حد أدنى"
                    value={formData.min_order_amount}
                    onChange={(e) => setFormData({ ...formData, min_order_amount: Number(e.target.value) })}
                  />
                </div>

                <div>
                  <Label>تاريخ الانتهاء</Label>
                  <Input
                    type="date"
                    value={formData.expires_at}
                    onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>للمشتركين الجدد فقط</Label>
                  <Switch
                    checked={formData.first_time_only}
                    onCheckedChange={(checked) => setFormData({ ...formData, first_time_only: checked })}
                  />
                </div>

                <Button onClick={handleSubmit} className="w-full">
                  {editingCoupon ? "حفظ التغييرات" : "إنشاء الكوبون"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Coupons Table */}
        <div className="card-elevated">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الكود</TableHead>
                <TableHead>الخصم</TableHead>
                <TableHead>الاستخدام</TableHead>
                <TableHead>الانتهاء</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    جاري التحميل...
                  </TableCell>
                </TableRow>
              ) : coupons?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    لا توجد كوبونات
                  </TableCell>
                </TableRow>
              ) : (
                coupons?.map((coupon) => {
                  const isExpired = coupon.expires_at && new Date(coupon.expires_at) < new Date();
                  return (
                    <TableRow key={coupon.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4 text-primary" />
                          <span className="font-mono font-bold">{coupon.code}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {coupon.type === "percent" ? (
                            <>
                              <Percent className="w-4 h-4" />
                              <span>{coupon.value}%</span>
                            </>
                          ) : (
                            <span>{coupon.value} ج.م</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {coupon.uses_count} / {coupon.max_uses || "∞"}
                      </TableCell>
                      <TableCell>
                        {coupon.expires_at ? (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span className={isExpired ? "text-destructive" : ""}>
                              {format(new Date(coupon.expires_at), "dd MMM yyyy", { locale: ar })}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">بدون انتهاء</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={coupon.is_active}
                          onCheckedChange={(checked) => 
                            toggleActiveMutation.mutate({ id: coupon.id, is_active: checked })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(coupon)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => deleteMutation.mutate(coupon.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
}
