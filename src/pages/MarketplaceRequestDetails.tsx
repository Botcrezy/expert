import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DynamicNavbar } from "@/components/layout/DynamicNavbar";
import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Layers, ArrowRight, Send, Loader2, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { SEO } from "@/components/seo/SEO";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

export default function MarketplaceRequestDetails() {
  const { id } = useParams();
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showProposalDialog, setShowProposalDialog] = useState(false);
  const [proposalData, setProposalData] = useState({
    cover_letter: "",
    proposed_price: "",
    proposed_days: "",
  });

  const { data: request, isLoading } = useQuery({
    queryKey: ["marketplace-request", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("requests")
        .select("id, title, description, category_id, size, created_at, credits_cost, deadline")
        .eq("id", id!)
        .eq("publish_mode", "marketplace")
        .eq("status", "submitted")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories-marketplace-detail"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("id, name_ar")
        .eq("is_active", true);
      return data || [];
    },
  });

  const { data: existingProposal } = useQuery({
    queryKey: ["my-proposal", id, user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("marketplace_proposals")
        .select("*")
        .eq("request_id", id!)
        .eq("freelancer_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user && !!id,
  });

  const submitProposal = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("يجب تسجيل الدخول");
      const { error } = await supabase.from("marketplace_proposals").insert({
        request_id: id!,
        freelancer_id: user.id,
        cover_letter: proposalData.cover_letter || null,
        proposed_price: proposalData.proposed_price ? Number(proposalData.proposed_price) : null,
        proposed_days: proposalData.proposed_days ? Number(proposalData.proposed_days) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "تم إرسال عرضك بنجاح!" });
      setShowProposalDialog(false);
      queryClient.invalidateQueries({ queryKey: ["my-proposal", id] });
    },
    onError: (err: any) => {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    },
  });

  const getCategoryName = (categoryId: string) => {
    return categories.find((c: any) => c.id === categoryId)?.name_ar || "غير محدد";
  };

  const getSizeName = (size: string) => {
    const sizes: Record<string, string> = {
      micro: "مهمة صغيرة جداً",
      small: "مهمة صغيرة",
      medium: "مهمة متوسطة",
      large: "مشروع كبير",
    };
    return sizes[size] || size;
  };

  const isFreelancer = userRole === "freelancer";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <DynamicNavbar />
        <main className="py-10 container mx-auto px-4 max-w-3xl">
          <Skeleton className="h-8 w-2/3 mb-4" />
          <Skeleton className="h-40 w-full" />
        </main>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-background">
        <DynamicNavbar />
        <main className="py-16 text-center container mx-auto px-4">
          <p className="text-muted-foreground text-lg">المشروع غير متاح أو تم إغلاقه</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link to="/marketplace">
              <ArrowRight className="w-4 h-4 ml-2" />
              العودة للماركت بلايس
            </Link>
          </Button>
        </main>
        <DynamicFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO title={request.title} path={`/marketplace/${request.id}`} />
      <DynamicNavbar />

      <main className="py-10 md:py-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <Button variant="ghost" size="sm" className="mb-6" asChild>
            <Link to="/marketplace">
              <ArrowRight className="w-4 h-4 ml-1" />
              العودة للماركت بلايس
            </Link>
          </Button>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl md:text-2xl">{request.title}</CardTitle>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant="secondary">
                  {getCategoryName(request.category_id)}
                </Badge>
                <Badge variant="outline">
                  <Layers className="w-3 h-3 ml-1" />
                  {getSizeName(request.size)}
                </Badge>
                <Badge variant="outline">
                  <Calendar className="w-3 h-3 ml-1" />
                  {formatDistanceToNow(new Date(request.created_at), {
                    addSuffix: true,
                    locale: ar,
                  })}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {request.description && (
                <div>
                  <h3 className="font-semibold mb-2">وصف المشروع</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {request.description}
                  </p>
                </div>
              )}

              {request.deadline && (
                <div>
                  <h3 className="font-semibold mb-1">الموعد المطلوب للتسليم</h3>
                  <p className="text-muted-foreground">
                    {new Date(request.deadline).toLocaleDateString("ar-EG", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              )}

              {/* Action */}
              <div className="border-t pt-6">
                {existingProposal ? (
                  <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 p-4 rounded-lg">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-medium">لقد قدّمت عرضك على هذا المشروع بالفعل</span>
                  </div>
                ) : isFreelancer ? (
                  <Button size="lg" className="w-full sm:w-auto" onClick={() => setShowProposalDialog(true)}>
                    <Send className="w-4 h-4 ml-2" />
                    قدّم عرضك على هذا المشروع
                  </Button>
                ) : user ? (
                  <p className="text-sm text-muted-foreground">
                    التقديم على المشاريع متاح للفريلانسرز فقط
                  </p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      سجّل دخولك كفريلانسر للتقديم على هذا المشروع
                    </p>
                    <Button asChild>
                      <Link to="/freelancer/login">تسجيل الدخول</Link>
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Proposal Dialog */}
      <Dialog open={showProposalDialog} onOpenChange={setShowProposalDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>قدّم عرضك</DialogTitle>
            <DialogDescription>اكتب عرضك على هذا المشروع</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>خطاب التقديم</Label>
              <Textarea
                placeholder="اشرح لماذا أنت الأنسب لهذا المشروع..."
                value={proposalData.cover_letter}
                onChange={(e) =>
                  setProposalData((p) => ({ ...p, cover_letter: e.target.value }))
                }
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>السعر المقترح (ج.م)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={proposalData.proposed_price}
                  onChange={(e) =>
                    setProposalData((p) => ({ ...p, proposed_price: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>المدة (أيام)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={proposalData.proposed_days}
                  onChange={(e) =>
                    setProposalData((p) => ({ ...p, proposed_days: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProposalDialog(false)}>
              إلغاء
            </Button>
            <Button
              onClick={() => submitProposal.mutate()}
              disabled={submitProposal.isPending}
            >
              {submitProposal.isPending ? (
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 ml-2" />
              )}
              إرسال العرض
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DynamicFooter />
    </div>
  );
}
