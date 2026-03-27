import { useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Building2, 
  Search, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Eye,
  Globe,
  Palette,
  Clock
} from "lucide-react";

export default function AdminBrands() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedBrand, setSelectedBrand] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState("");

  const { data: brands, isLoading } = useQuery({
    queryKey: ["admin-brands"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brands")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      
      // Fetch user profiles separately
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(b => b.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", userIds);
        
        return data.map(brand => ({
          ...brand,
          profiles: profiles?.find(p => p.user_id === brand.user_id)
        }));
      }
      
      return data || [];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const { error } = await supabase
        .from("brands")
        .update({ status, admin_notes: notes })
        .eq("id", id);
      if (error) throw error;

      // Log audit
      await supabase.from("audit_logs").insert({
        action: `brand_${status}`,
        entity_type: "brand",
        entity_id: id,
        new_values: { status, notes }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-brands"] });
      toast({ title: "تم تحديث حالة البراند بنجاح! ✅" });
      setSelectedBrand(null);
    },
    onError: (error: any) => {
      toast({ title: "حدث خطأ", description: error.message, variant: "destructive" });
    }
  });

  const filteredBrands = brands?.filter((brand: any) =>
    brand.name?.toLowerCase().includes(search.toLowerCase()) ||
    brand.profiles?.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-700"><Clock className="w-3 h-3 mr-1" />قيد المراجعة</Badge>;
      case "approved":
        return <Badge className="bg-green-100 text-green-700"><CheckCircle2 className="w-3 h-3 mr-1" />معتمد</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-700"><XCircle className="w-3 h-3 mr-1" />مرفوض</Badge>;
      case "active":
        return <Badge className="bg-blue-100 text-blue-700"><Palette className="w-3 h-3 mr-1" />نشط</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout sidebar={<AdminSidebar />} title="إدارة البراندات">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      sidebar={<AdminSidebar />}
      title="إدارة البراندات"
      subtitle="مراجعة وإدارة براندات العملاء"
    >
      <div className="space-y-6">
        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="البحث عن براند..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>

        {/* Brands Grid */}
        {filteredBrands && filteredBrands.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBrands.map((brand: any) => (
              <Card key={brand.id} className="overflow-hidden">
                <div 
                  className="h-3"
                  style={{ backgroundColor: brand.colors?.primary || "#3b82f6" }}
                />
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                        style={{ backgroundColor: brand.colors?.primary || "#3b82f6" }}
                      >
                        {brand.name?.charAt(0)}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{brand.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {brand.profiles?.full_name}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(brand.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {brand.industry && (
                    <p className="text-sm"><strong>المجال:</strong> {brand.industry}</p>
                  )}
                  {brand.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {brand.description}
                    </p>
                  )}
                  {brand.website && (
                    <a 
                      href={brand.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      <Globe className="w-3 h-3" />
                      {brand.website}
                    </a>
                  )}
                  
                  <div className="flex gap-2 pt-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      asChild
                    >
                      <Link to={`/admin/brands/${brand.id}`}>
                        <Eye className="w-4 h-4 ml-1" />
                        إدارة
                      </Link>
                    </Button>
                    {brand.status === "pending" && (
                      <>
                        <Button 
                          size="sm" 
                          variant="default"
                          onClick={() => updateStatusMutation.mutate({ 
                            id: brand.id, 
                            status: "approved" 
                          })}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => {
                            setSelectedBrand(brand);
                            setAdminNotes("");
                          }}
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Building2 className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">لا توجد براندات</h3>
            <p className="text-muted-foreground">ستظهر هنا براندات العملاء</p>
          </div>
        )}
      </div>

      {/* Review Dialog */}
      <Dialog open={!!selectedBrand} onOpenChange={() => setSelectedBrand(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>مراجعة البراند: {selectedBrand?.name}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>العميل:</strong>
                <p className="text-muted-foreground">{selectedBrand?.profiles?.full_name}</p>
              </div>
              <div>
                <strong>البريد:</strong>
                <p className="text-muted-foreground">{selectedBrand?.profiles?.email}</p>
              </div>
              <div>
                <strong>المجال:</strong>
                <p className="text-muted-foreground">{selectedBrand?.industry || "-"}</p>
              </div>
              <div>
                <strong>الموقع:</strong>
                <p className="text-muted-foreground">{selectedBrand?.website || "-"}</p>
              </div>
            </div>

            {selectedBrand?.description && (
              <div>
                <strong>الوصف:</strong>
                <p className="text-sm text-muted-foreground mt-1">{selectedBrand.description}</p>
              </div>
            )}

            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div 
                  className="w-8 h-8 rounded-lg border"
                  style={{ backgroundColor: selectedBrand?.colors?.primary }}
                />
                <span className="text-sm">اللون الرئيسي</span>
              </div>
              <div className="flex items-center gap-2">
                <div 
                  className="w-8 h-8 rounded-lg border"
                  style={{ backgroundColor: selectedBrand?.colors?.secondary }}
                />
                <span className="text-sm">اللون الثانوي</span>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">ملاحظات الإدارة</label>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="أضف ملاحظات..."
                rows={3}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSelectedBrand(null)}>
              إغلاق
            </Button>
            {selectedBrand?.status === "pending" && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => updateStatusMutation.mutate({
                    id: selectedBrand.id,
                    status: "rejected",
                    notes: adminNotes
                  })}
                  disabled={updateStatusMutation.isPending}
                >
                  <XCircle className="w-4 h-4 ml-1" />
                  رفض
                </Button>
                <Button
                  onClick={() => updateStatusMutation.mutate({
                    id: selectedBrand.id,
                    status: "approved",
                    notes: adminNotes
                  })}
                  disabled={updateStatusMutation.isPending}
                >
                  <CheckCircle2 className="w-4 h-4 ml-1" />
                  قبول
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
