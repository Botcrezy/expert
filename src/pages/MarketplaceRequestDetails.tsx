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
import { Calendar, Layers, ArrowRight, Send, Loader2, CheckCircle2, Users, DollarSign, Clock, AlertCircle, Link as LinkIcon } from "lucide-react";
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
    experience_summary: "",
    portfolio_link: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: request, isLoading } = useQuery({
    queryKey: ["marketplace-request", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("requests")
        .select("id, title, description, category_id, size, created_at, credits_cost, deadline, estimated_budget")
        .eq("id", id!)
        .eq("publish_mode", "marketplace")
        .eq("status", "submitted")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: proposalsCount = 0 } = useQuery({
    queryKey: ["proposals-count", id],
    queryFn: async () => {
      const { count } = await supabase
        .from("marketplace_proposals")
        .select("id", { count: "exact", head: true })
        .eq("request_id", id!);
      return count || 0;
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

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!proposalData.proposed_price || Number(proposalData.proposed_price) <= 0) {
      newErrors.proposed_price = "السعر المقترح مطلوب";
    }
    if (!proposalData.proposed_days || Number(proposalData.proposed_days) <= 0) {
      newErrors.proposed_days = "مدة التنفيذ مطلوبة";
    }
    if (!proposalData.cover_letter || proposalData.cover_letter.trim().length < 50) {
      newErrors.cover_letter = "خطاب التقديم يجب أن يكون 50 حرف على الأقل";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const submitProposal = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("يجب تسجيل الدخول");
      if (!validateForm()) throw new Error("يرجى تصحيح الأخطاء");
      const { error } = await supabase.from("marketplace_proposals").insert({
        request_id: id!,
        freelancer_id: user.id,
        cover_letter: proposalData.cover_letter,
        proposed_price: Number(proposalData.proposed_price),
        proposed_days: Number(proposalData.proposed_days),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "تم إرسال عرضك بنجاح! 🎉" });
      setShowProposalDialog(false);
      queryClient.invalidateQueries({ queryKey: ["my-proposal", id] });
      queryClient.invalidateQueries({ queryKey: ["proposals-count", id] });
    },
    onError: (err: any) => {
      if (err.message !== "يرجى تصحيح الأخطاء") {
        toast({ title: "خطأ", description: err.message, variant: "destructive" });
      }
    },
  });

  const getCategoryName = (categoryId: string) =>
    categories.find((c: any) => c.id === categoryId)?.name_ar || "غير محدد";

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

      <main className="py-8 md:py-14">
        <div className="container mx-auto px-4 max-w-3xl">
          <Button variant="ghost" size="sm" className="mb-4" asChild>
            <Link to="/marketplace">
              <ArrowRight className="w-4 h-4 ml-1" />
              العودة للماركت بلايس
            </Link>
          </Button>

          <Card className="border-border/60">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg md:text-2xl leading-tight">{request.title}</CardTitle>
              <div className="flex flex-wrap gap-1.5 mt-3">
                <Badge variant="secondary" className="text-xs">
                  {getCategoryName(request.category_id)}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <Layers className="w-3 h-3 ml-1" />
                  {getSizeName(request.size)}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <Calendar className="w-3 h-3 ml-1" />
                  {formatDistanceToNow(new Date(request.created_at), { addSuffix: true, locale: ar })}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <Users className="w-3 h-3 ml-1" />
                  {proposalsCount} عرض
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Budget & Deadline info cards */}
              <div className="grid grid-cols-2 gap-3">
                {request.estimated_budget && (
                  <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3 text-center">
                    <DollarSign className="w-5 h-5 mx-auto text-emerald-600 mb-1" />
                    <p className="text-xs text-muted-foreground">الميزانية التقديرية</p>
                    <p className="font-bold text-emerald-700 dark:text-emerald-400">{Number(request.estimated_budget).toLocaleString("ar-EG")} ج.م</p>
                  </div>
                )}
                {request.deadline && (
                  <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 text-center">
                    <Clock className="w-5 h-5 mx-auto text-blue-600 mb-1" />
                    <p className="text-xs text-muted-foreground">موعد التسليم</p>
                    <p className="font-bold text-blue-700 dark:text-blue-400 text-sm">
                      {new Date(request.deadline).toLocaleDateString("ar-EG", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                )}
              </div>

              {request.description && (
                <div>
                  <h3 className="font-semibold mb-2 text-sm">وصف المشروع</h3>
                  <p className="text-muted-foreground text-sm whitespace-pre-wrap leading-relaxed">
                    {request.description}
                  </p>
                </div>
              )}

              {/* Action */}
              <div className="border-t pt-5">
                {existingProposal ? (
                  <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 p-4 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <span className="font-medium text-sm">لقد قدّمت عرضك على هذا المشروع بالفعل</span>
                  </div>
                ) : isFreelancer ? (
                  <Button size="lg" className="w-full" onClick={() => setShowProposalDialog(true)}>
                    <Send className="w-4 h-4 ml-2" />
                    قدّم عرضك على هذا المشروع
                  </Button>
                ) : user ? (
                  <p className="text-sm text-muted-foreground">التقديم متاح للفريلانسرز فقط</p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">سجّل دخولك كفريلانسر للتقديم</p>
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>قدّم عرضك</DialogTitle>
            <DialogDescription>اكتب عرضك التفصيلي على مشروع: {request.title}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Cover letter */}
            <div className="space-y-1.5">
              <Label className="text-sm">خطاب التقديم <span className="text-destructive">*</span></Label>
              <Textarea
                placeholder="اشرح لماذا أنت الأنسب لهذا المشروع، وما هي خبرتك المتعلقة... (50 حرف على الأقل)"
                value={proposalData.cover_letter}
                onChange={(e) => {
                  setProposalData((p) => ({ ...p, cover_letter: e.target.value }));
                  if (errors.cover_letter) setErrors((e) => ({ ...e, cover_letter: "" }));
                }}
                rows={5}
                className="text-sm"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{errors.cover_letter && <span className="text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.cover_letter}</span>}</span>
                <span>{proposalData.cover_letter.length}/50+</span>
              </div>
            </div>

            {/* Experience summary */}
            <div className="space-y-1.5">
              <Label className="text-sm">ملخص خبرتك المتعلقة</Label>
              <Textarea
                placeholder="اذكر مشاريع سابقة مشابهة أو خبرتك في هذا المجال..."
                value={proposalData.experience_summary}
                onChange={(e) => setProposalData((p) => ({ ...p, experience_summary: e.target.value }))}
                rows={3}
                className="text-sm"
              />
            </div>

            {/* Portfolio link */}
            <div className="space-y-1.5">
              <Label className="text-sm flex items-center gap-1">
                <LinkIcon className="w-3 h-3" />
                رابط مشروع سابق مشابه
              </Label>
              <Input
                placeholder="https://..."
                value={proposalData.portfolio_link}
                onChange={(e) => setProposalData((p) => ({ ...p, portfolio_link: e.target.value }))}
                className="text-sm"
                dir="ltr"
              />
            </div>

            {/* Price & Days */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">السعر المقترح (ج.م) <span className="text-destructive">*</span></Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={proposalData.proposed_price}
                  onChange={(e) => {
                    setProposalData((p) => ({ ...p, proposed_price: e.target.value }));
                    if (errors.proposed_price) setErrors((er) => ({ ...er, proposed_price: "" }));
                  }}
                  className="text-sm"
                />
                {errors.proposed_price && (
                  <p className="text-[10px] text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.proposed_price}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">مدة التنفيذ (أيام) <span className="text-destructive">*</span></Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={proposalData.proposed_days}
                  onChange={(e) => {
                    setProposalData((p) => ({ ...p, proposed_days: e.target.value }));
                    if (errors.proposed_days) setErrors((er) => ({ ...er, proposed_days: "" }));
                  }}
                  className="text-sm"
                />
                {errors.proposed_days && (
                  <p className="text-[10px] text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.proposed_days}</p>
                )}
              </div>
            </div>

            {request.estimated_budget && (
              <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                💡 الميزانية التقديرية للعميل: {Number(request.estimated_budget).toLocaleString("ar-EG")} ج.م
              </p>
            )}
          </div>
          <DialogFooter className="gap-2">
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
