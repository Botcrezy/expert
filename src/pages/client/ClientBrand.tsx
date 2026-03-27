import { useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ClientSidebar } from "@/components/layout/ClientSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { 
  Palette, 
  Building2, 
  Globe, 
  Upload, 
  Plus, 
  Loader2, 
  CheckCircle2, 
  Clock, 
  XCircle,
  Sparkles
} from "lucide-react";

export default function ClientBrand() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    industry: "",
    website: "",
    colors: { primary: "#3b82f6", secondary: "#10b981" },
    social_links: { facebook: "", instagram: "", twitter: "" }
  });

  const { data: brands, isLoading } = useQuery({
    queryKey: ["client-brands", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brands")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const createBrandMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("brands").insert({
        user_id: user?.id,
        name: formData.name,
        description: formData.description,
        industry: formData.industry,
        website: formData.website,
        colors: formData.colors,
        social_links: formData.social_links,
        status: "pending"
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-brands"] });
      toast({ title: "تم إنشاء البراند بنجاح! ✅", description: "سيتم مراجعته من قبل الإدارة" });
      setShowForm(false);
      setFormData({
        name: "",
        description: "",
        industry: "",
        website: "",
        colors: { primary: "#3b82f6", secondary: "#10b981" },
        social_links: { facebook: "", instagram: "", twitter: "" }
      });
    },
    onError: (error: any) => {
      toast({ title: "حدث خطأ", description: error.message, variant: "destructive" });
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-700"><Clock className="w-3 h-3 mr-1" />قيد المراجعة</Badge>;
      case "approved":
        return <Badge className="bg-green-100 text-green-700"><CheckCircle2 className="w-3 h-3 mr-1" />معتمد</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-700"><XCircle className="w-3 h-3 mr-1" />مرفوض</Badge>;
      case "active":
        return <Badge className="bg-blue-100 text-blue-700"><Sparkles className="w-3 h-3 mr-1" />نشط</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout sidebar={<ClientSidebar />} title="إدارة البراند">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      sidebar={<ClientSidebar />}
      title="إدارة البراند"
      subtitle="أنشئ مشاريع وبراندات لتسهيل العمل مع فريقنا"
    >
      <div className="space-y-6">
        {!showForm && (
          <div className="flex justify-end">
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 ml-2" />
              إنشاء براند جديد
            </Button>
          </div>
        )}

        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-primary" />
                إنشاء براند جديد
              </CardTitle>
              <CardDescription>
                أدخل بيانات شركتك أو مشروعك لتسهيل التواصل والعمل
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>اسم البراند / الشركة *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="مثال: شركة النجاح للتسويق"
                  />
                </div>
                <div className="space-y-2">
                  <Label>المجال / الصناعة</Label>
                  <Input
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    placeholder="مثال: تسويق رقمي"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>وصف النشاط</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="اشرح نشاط شركتك وأهدافها..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>الموقع الإلكتروني</Label>
                <Input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://example.com"
                  dir="ltr"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>اللون الرئيسي</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={formData.colors.primary}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        colors: { ...formData.colors, primary: e.target.value } 
                      })}
                      className="w-12 h-12 rounded-lg border cursor-pointer"
                    />
                    <Input
                      value={formData.colors.primary}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        colors: { ...formData.colors, primary: e.target.value } 
                      })}
                      className="flex-1"
                      dir="ltr"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>اللون الثانوي</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={formData.colors.secondary}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        colors: { ...formData.colors, secondary: e.target.value } 
                      })}
                      className="w-12 h-12 rounded-lg border cursor-pointer"
                    />
                    <Input
                      value={formData.colors.secondary}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        colors: { ...formData.colors, secondary: e.target.value } 
                      })}
                      className="flex-1"
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  onClick={() => createBrandMutation.mutate()} 
                  disabled={!formData.name || createBrandMutation.isPending}
                >
                  {createBrandMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin ml-2" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 ml-2" />
                  )}
                  إنشاء البراند
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>
                  إلغاء
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Existing Brands */}
        {brands && brands.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {brands.map((brand: any) => (
              <Card key={brand.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div 
                  className="h-3"
                  style={{ backgroundColor: (brand.colors as any)?.primary || "#3b82f6" }}
                />
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                        style={{ backgroundColor: (brand.colors as any)?.primary || "#3b82f6" }}
                      >
                        {brand.name?.charAt(0)}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{brand.name}</CardTitle>
                        {brand.industry && (
                          <p className="text-sm text-muted-foreground">{brand.industry}</p>
                        )}
                      </div>
                    </div>
                    {getStatusBadge(brand.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  {brand.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                      {brand.description}
                    </p>
                  )}
                  {brand.website && (
                    <a 
                      href={brand.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline flex items-center gap-1 mb-4"
                    >
                      <Globe className="w-3 h-3" />
                      {brand.website}
                    </a>
                  )}
                  {brand.admin_notes && brand.status === "rejected" && (
                    <p className="text-sm text-red-600 mb-4 p-2 bg-red-50 rounded">
                      {brand.admin_notes}
                    </p>
                  )}
                  {(brand.status === "approved" || brand.status === "active") && (
                    <Link to={`/client/brand/${brand.id}`}>
                      <Button className="w-full" variant="outline">
                        <Sparkles className="w-4 h-4 ml-2" />
                        إدارة البراند
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !showForm && (
          <div className="text-center py-16">
            <Building2 className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">لا توجد براندات بعد</h3>
            <p className="text-muted-foreground mb-6">أنشئ براند لشركتك لتسهيل العمل معنا</p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 ml-2" />
              إنشاء براند جديد
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
