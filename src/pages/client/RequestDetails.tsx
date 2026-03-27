import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMessages } from "@/hooks/useMessages";
import { useRequestInfo } from "@/hooks/useRequestInfo";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ClientSidebar } from "@/components/layout/ClientSidebar";
import { ChatBox } from "@/components/chat/ChatBox";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Timeline } from "@/components/ui/Timeline";
import { FilePreview } from "@/components/files/FilePreview";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { FileUploadAdvanced } from "@/components/ui/FileUploadAdvanced";
import { RequestBriefDialog } from "@/components/requests/RequestBriefDialog";
import { RequestBriefCard, type RequestBrief } from "@/components/requests/RequestBriefCard";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowRight, 
  Calendar, 
  Clock, 
  CreditCard, 
  Download, 
  FileText, 
  Loader2, 
  MessageCircle, 
  Package,
  User,
  CheckCircle2,
  AlertCircle,
  Eye,
  Star,
  Link2,
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { getPublicAppOrigin } from "@/lib/getPublicAppOrigin";

const statusMap: Record<string, { label: string; variant: "success" | "warning" | "error" | "info" | "default"; description: string }> = {
  submitted: { label: "مُقدَّم", variant: "info", description: "تم استلام طلبك وقيد المراجعة" },
  needs_info: { label: "يحتاج معلومات", variant: "warning", description: "نحتاج معلومات إضافية منك" },
  approved: { label: "مُوافَق", variant: "success", description: "تمت الموافقة على طلبك" },
  assigned: { label: "تم التعيين", variant: "info", description: "تم تعيين فريلانسر لطلبك" },
  in_progress: { label: "قيد التنفيذ", variant: "warning", description: "جاري العمل على طلبك" },
  ready_for_qc: { label: "جاهز للمراجعة", variant: "info", description: "الطلب جاهز ويتم مراجعته" },
  qc_rejected: { label: "مرفوض من QC", variant: "error", description: "يتم إعادة العمل على الطلب" },
  delivered_to_client: { label: "تم التسليم", variant: "success", description: "تم تسليم طلبك - يرجى المراجعة" },
  revision_requested: { label: "طلب تعديل", variant: "warning", description: "جاري العمل على التعديلات" },
  completed: { label: "مكتمل", variant: "success", description: "تم إكمال طلبك بنجاح" },
  cancelled: { label: "ملغي", variant: "error", description: "تم إلغاء الطلب" },
};

export default function RequestDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("details");
  const [clientReplyText, setClientReplyText] = useState("");
  const [clientReplyFiles, setClientReplyFiles] = useState<any[]>([]);
  const [fileSourceFilter, setFileSourceFilter] = useState<string>("all");
  const [fileTypeFilter, setFileTypeFilter] = useState<string>("all");
  const [fileDateFilter, setFileDateFilter] = useState<string>("all");

  const { data: existingRating } = useQuery({
    queryKey: ["request-rating", id],
    queryFn: async () => {
      if (!id || !user) return null;
      const { data, error } = await supabase
        .from("request_ratings")
        .select("*")
        .eq("request_id", id)
        .eq("client_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  const [ratingValues, setRatingValues] = useState({
    quality: (existingRating as any)?.quality || 5,
    speed: (existingRating as any)?.speed || 5,
    communication: (existingRating as any)?.communication || 5,
    comment: (existingRating as any)?.comment || "",
  });

  useEffect(() => {
    if (existingRating) {
      setRatingValues({
        quality: (existingRating as any).quality,
        speed: (existingRating as any).speed,
        communication: (existingRating as any).communication,
        comment: (existingRating as any).comment || "",
      });
    }
  }, [existingRating]);

  const ratingMutation = useMutation({
    mutationFn: async (payload: {
      quality: number;
      speed: number;
      communication: number;
      comment?: string;
    }) => {
      if (!id || !user) throw new Error("المستخدم غير مسجل");

      if (existingRating) {
        const { error } = await supabase
          .from("request_ratings")
          .update({
            quality: payload.quality,
            speed: payload.speed,
            communication: payload.communication,
            comment: payload.comment || null,
          })
          .eq("id", (existingRating as any).id);
        if (error) throw error;
        return;
      }

      const { error } = await supabase.from("request_ratings").insert({
        request_id: id,
        client_id: user.id,
        quality: payload.quality,
        speed: payload.speed,
        communication: payload.communication,
        comment: payload.comment || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["request-rating", id] });
      toast({ title: "تم حفظ تقييمك للطلب" });
    },
    onError: (error: any) => {
      console.error("request rating error:", error);
      toast({
        title: "فشل حفظ التقييم",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleShareLink = async () => {
    try {
      if (!id || !user) return;

      const { data: existing } = await supabase
        .from("request_public_links")
        .select("token, is_active, expires_at")
        .eq("request_id", id)
        .eq("created_by", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let token = existing?.token as string | undefined;
      if (!token) {
        token = (window.crypto?.randomUUID?.() || Math.random().toString(36).slice(2));
        const { error } = await supabase.from("request_public_links").insert({
          request_id: id,
          token,
          created_by: user.id,
        });
        if (error) throw error;
      }

      const url = `${getPublicAppOrigin()}/share/request/${token}`;
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        toast({ title: "تم نسخ رابط العرض فقط", description: url });
      } else {
        toast({ title: "رابط العرض", description: url });
      }
    } catch (error: any) {
      console.error("share link error:", error);
      toast({
        title: "تعذر إنشاء رابط العرض",
        description: error.message,
        variant: "destructive",
      });
    }
  };
  // Fetch request with all related data
  const { data: request, isLoading, error: requestError } = useQuery({
    queryKey: ["request", id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("requests")
        .select(
          `
          *,
          category:categories(id, name, name_ar, icon)
        `
        )
        .eq("id", id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching request:", error);
        throw new Error(error.message);
      }

      if (!data) return null;

      // Fetch assignment info
      const { data: assignment } = await supabase
        .from("assignments")
        .select("*")
        .eq("request_id", id)
        .eq("is_active", true)
        .maybeSingle();

      return { ...data, assignment };
    },
    enabled: !!id,
  });

  const { data: requestBrief } = useQuery({
    queryKey: ["request-brief", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("request_briefs")
        .select("*")
        .eq("request_id", id)
        .maybeSingle();
      if (error) throw error;
      return (data as RequestBrief) || null;
    },
    enabled: !!id && !!user,
  });

  const isFixedAgreementPurchase = request?.source === "portfolio_purchase";
  const isClientOwner = !!user && (request as any)?.user_id === user?.id;
  const mustFillBrief = isFixedAgreementPurchase && isClientOwner && !requestBrief;

  // Log error for debugging
  if (requestError) {
    console.error("Request details error:", requestError);
  }

  // Fetch deliveries
  const { data: deliveries = [] } = useQuery({
    queryKey: ["deliveries", id],
    queryFn: async () => {
      if (!id) return [];
      
      const { data, error } = await supabase
        .from("deliveries")
        .select("*")
        .eq("request_id", id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  // عدد الرسائل في تبويب المحادثة
  const { data: messagesCount = 0 } = useQuery({
    queryKey: ["messages-count", id],
    queryFn: async () => {
      if (!id) return 0;
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("request_id", id);
      return count || 0;
    },
    enabled: !!id,
  });

  // طلبات المعلومات بين الفريق والعميل
  const { infoRequests, isLoading: infoLoading } = useRequestInfo(id);

  const { sendMessage } = useMessages({ requestId: id!, enabled: false });

  if (isLoading) {
    return (
      <DashboardLayout sidebar={<ClientSidebar />} title="تفاصيل الطلب">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!request) {
    return (
      <DashboardLayout sidebar={<ClientSidebar />} title="الطلب غير موجود">
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-muted-foreground">الطلب غير موجود أو ليس لديك صلاحية الوصول</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/client/requests")}>
            <ArrowRight className="w-4 h-4 ml-2" />
            العودة للطلبات
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const status = statusMap[request.status] || { label: request.status, variant: "default" as const, description: "" };
  const files = (request.files as Array<{ name: string; size: number; type: string; url?: string; path?: string }>) || [];

  const hubFiles = [
    ...files.map((f) => ({
      id: `request-${request.id}-${f.name}-${f.path}`,
      name: f.name,
      type: f.type,
      size: f.size,
      url: f.url || f.path,
      source: "client" as const,
      createdAt: request.created_at,
    })),
    ...infoRequests.flatMap((info) => {
      const adminAtt = Array.isArray(info.attachments) ? (info.attachments as any[]) : [];
      const clientAtt = info.reply && Array.isArray(info.reply.attachments) ? (info.reply.attachments as any[]) : [];
      return [
        ...adminAtt.map((f: any, idx: number) => ({
          id: `info-admin-${info.id}-${idx}`,
          name: f.name,
          type: f.type,
          size: f.size,
          url: f.url || f.path,
          source: "admin_info" as const,
          createdAt: info.created_at,
        })),
        ...clientAtt.map((f: any, idx: number) => ({
          id: `info-client-${info.id}-${idx}`,
          name: f.name,
          type: f.type,
          size: f.size,
          url: f.url || f.path,
          source: "client_info" as const,
          createdAt: info.reply!.created_at,
        })),
      ];
    }),
    // Hide delivery files from client until QC approves them
    ...deliveries
      .filter((delivery: any) => delivery.status === "approved")
      .flatMap((delivery: any) => {
        const dFiles = Array.isArray(delivery.files) ? (delivery.files as any[]) : [];
        return dFiles.map((f: any, idx: number) => ({
          id: `delivery-${delivery.id}-${idx}`,
          name: f.name,
          type: f.type,
          size: f.size,
          url: f.url || f.path,
          source: "delivery" as const,
          createdAt: delivery.created_at,
        }));
      }),
  ];

  const filteredHubFiles = hubFiles
    .filter((f) => {
      const matchSource =
        fileSourceFilter === "all" ||
        (fileSourceFilter === "client" && f.source === "client") ||
        (fileSourceFilter === "admin_info" && f.source === "admin_info") ||
        (fileSourceFilter === "client_info" && f.source === "client_info") ||
        (fileSourceFilter === "delivery" && f.source === "delivery");

      const matchType =
        fileTypeFilter === "all" ||
        (fileTypeFilter === "image" && f.type?.startsWith("image/")) ||
        (fileTypeFilter === "video" && f.type?.startsWith("video/")) ||
        (fileTypeFilter === "doc" && !f.type?.startsWith("image/") && !f.type?.startsWith("video/"));

      const created = new Date(f.createdAt).getTime();
      const now = Date.now();
      const diffDays = (now - created) / (1000 * 60 * 60 * 24);
      const matchDate =
        fileDateFilter === "all" ||
        (fileDateFilter === "7d" && diffDays <= 7) ||
        (fileDateFilter === "30d" && diffDays <= 30);

      return matchSource && matchType && matchDate;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const timelineItems = [
    {
      id: "1",
      title: "تم إنشاء الطلب",
      description: `رقم الطلب: ${request.request_number}`,
      date: request.created_at,
      status: "completed" as const,
    },
    ...(["approved", "assigned", "in_progress", "ready_for_qc", "delivered_to_client", "completed"].includes(request.status)
      ? [
          {
            id: "2",
            title: "تمت الموافقة",
            description: "تمت الموافقة على طلبك",
            date: request.updated_at,
            status: "completed" as const,
          },
        ]
      : []),
    ...(["assigned", "in_progress", "ready_for_qc", "delivered_to_client", "completed"].includes(request.status)
      ? [
          {
            id: "3",
            title: "تم التعيين",
            description: "تم تعيين فريلانسر للعمل على طلبك",
            date: request.updated_at,
            status: "completed" as const,
          },
        ]
      : []),
    ...(["in_progress", "ready_for_qc", "delivered_to_client", "completed"].includes(request.status)
      ? [
          {
            id: "4",
            title: "جاري العمل",
            description: "الفريلانسر يعمل على طلبك",
            date: request.updated_at,
            status: "completed" as const,
          },
        ]
      : []),
    ...(["delivered_to_client", "completed"].includes(request.status)
      ? [
          {
            id: "5",
            title: "تم التسليم",
            description: "تم تسليم العمل المطلوب",
            date: request.updated_at,
            status: "completed" as const,
          },
        ]
      : []),
    ...(request.status === "completed"
      ? [
          {
            id: "6",
            title: "مكتمل",
            description: "تم إكمال الطلب بنجاح",
            date: request.updated_at,
            status: "completed" as const,
          },
        ]
      : []),
    ...(request.status === "needs_info"
      ? [
          {
            id: "info",
            title: "مطلوب معلومات إضافية",
            description: "يرجى الرد على استفسارات الفريق",
            date: request.updated_at,
            status: "current" as const,
          },
        ]
      : []),
    ...(request.status === "cancelled"
      ? [
          {
            id: "cancelled",
            title: "تم الإلغاء",
            description: "تم إلغاء هذا الطلب",
            date: request.updated_at,
            status: "completed" as const,
          },
        ]
      : []),
  ];
  return (
    <DashboardLayout
      sidebar={<ClientSidebar />}
      title={request.title}
      subtitle={`طلب رقم ${request.request_number}`}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate("/client/requests")}>
            <ArrowRight className="w-4 h-4 ml-2" />
            العودة
          </Button>
          <Button variant="outline" onClick={handleShareLink}>
            <Link2 className="w-4 h-4 ml-2" />
            رابط عرض فقط
          </Button>
        </div>
      }
    >
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full justify-start">
              <TabsTrigger value="details" className="flex items-center gap-2">
                التفاصيل
              </TabsTrigger>
              <TabsTrigger value="files" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                الملفات
                {filteredHubFiles.length > 0 && (
                  <Badge variant="secondary" className="h-5 px-1.5">
                    {filteredHubFiles.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="chat" className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                المحادثة
                {messagesCount > 0 && (
                  <Badge variant="secondary" className="h-5 px-1.5">
                    {messagesCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="deliveries" className="flex items-center gap-2">
                التسليمات
                {deliveries.length > 0 && (
                  <Badge variant="secondary" className="h-5 px-1.5">
                    {deliveries.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="mt-6 space-y-6">
              {/* Mandatory brief for fixed agreement */}
              {mustFillBrief && user && id && (
                <RequestBriefDialog
                  requestId={id}
                  clientId={user.id}
                  open={true}
                  onSubmitted={() => {
                    queryClient.invalidateQueries({ queryKey: ["request-brief", id] });
                  }}
                />
              )}

              {requestBrief && <RequestBriefCard brief={requestBrief} />}

              {/* Status Alert */}
              <div
                className={`p-4 rounded-xl border ${
                  status.variant === "error"
                    ? "bg-destructive/5 border-destructive/20"
                    : status.variant === "warning"
                      ? "bg-yellow-50 border-yellow-200"
                      : status.variant === "success"
                        ? "bg-green-50 border-green-200"
                        : "bg-primary/5 border-primary/20"
                }`}
              >
                <div className="flex items-center gap-3">
                  {status.variant === "success" ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : status.variant === "warning" ? (
                    <Clock className="w-5 h-5 text-yellow-600" />
                  ) : status.variant === "error" ? (
                    <AlertCircle className="w-5 h-5 text-destructive" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-primary" />
                  )}
                  <div>
                    <p className="font-medium">{status.label}</p>
                    <p className="text-sm text-muted-foreground">{status.description}</p>
                  </div>
                </div>
              </div>

              {/* بطاقات طلبات المعلومات الجديدة */}
              {request.status === "needs_info" && !infoLoading && infoRequests.length > 0 && (
                <div className="space-y-4">
                  {infoRequests.map((info) => {
                    const hasReply = !!info.reply;
                    const isPending = info.status === "pending" && !hasReply;

                    return (
                      <Card
                        key={info.id}
                        className="border-amber-200 bg-amber-50/60"
                      >
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-amber-900">
                            <MessageCircle className="w-5 h-5" />
                            {info.title || "الفريق يطلب معلومات إضافية لإكمال طلبك"}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* رسالة الأدمن */}
                          <div className="p-3 rounded-lg bg-white/60 border border-amber-100">
                            <p className="text-sm text-foreground whitespace-pre-wrap">
                              {info.message}
                            </p>
                          </div>

                          {/* مرفقات الأدمن */}
                          {Array.isArray(info.attachments) &&
                            (info.attachments as any[]).length > 0 && (
                              <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">
                                  مرفقات من الفريق
                                </p>
                                <div className="space-y-2">
                                  {(info.attachments as any[]).map(
                                    (file: any, idx: number) => (
                                      <div
                                        key={idx}
                                        className="flex items-center gap-3 p-2 rounded-md bg-white/70 border border-amber-100"
                                      >
                                        <FileText className="w-4 h-4 text-primary" />
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium truncate">
                                            {file.name}
                                          </p>
                                          {file.size && (
                                            <p className="text-xs text-muted-foreground">
                                              {Math.round(file.size / 1024)} KB
                                            </p>
                                          )}
                                        </div>
                                        {file.url && (
                                          <Button asChild size="sm" variant="outline">
                                            <a
                                              href={file.url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                            >
                                              <Download className="w-4 h-4 ml-1" />
                                              فتح
                                            </a>
                                          </Button>
                                        )}
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            )}

                          {/* رد العميل إن وجد */}
                          {hasReply && info.reply && (
                            <div className="space-y-3 border-t border-amber-100 pt-4 mt-2">
                              <p className="text-sm font-medium text-amber-900">
                                ردّك على طلب المعلومات
                              </p>
                              <div className="p-3 rounded-lg bg-white/60 border border-amber-100">
                                <p className="text-sm text-foreground whitespace-pre-wrap">
                                  {info.reply.message}
                                </p>
                              </div>
                              {Array.isArray(info.reply.attachments) &&
                                (info.reply.attachments as any[]).length > 0 && (
                                  <div className="space-y-2">
                                    <p className="text-sm text-muted-foreground">
                                      مرفقات قمت بإرسالها
                                    </p>
                                    <div className="space-y-2">
                                      {(info.reply.attachments as any[]).map(
                                        (file: any, idx: number) => (
                                          <div
                                            key={idx}
                                            className="flex items-center gap-3 p-2 rounded-md bg-white/70 border border-amber-100"
                                          >
                                            <FileText className="w-4 h-4 text-primary" />
                                            <div className="flex-1 min-w-0">
                                              <p className="text-sm font-medium truncate">
                                                {file.name}
                                              </p>
                                              {file.size && (
                                                <p className="text-xs text-muted-foreground">
                                                  {Math.round(file.size / 1024)} KB
                                                </p>
                                              )}
                                            </div>
                                            {file.url && (
                                              <Button asChild size="sm" variant="outline">
                                                <a
                                                  href={file.url}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                >
                                                  <Download className="w-4 h-4 ml-1" />
                                                  فتح
                                                </a>
                                              </Button>
                                            )}
                                          </div>
                                        )
                                      )}
                                    </div>
                                  </div>
                                )}
                            </div>
                          )}

                          {/* فورم رد العميل على الطلبات المعلقة فقط */}
                          {user && isPending && (
                            <ClientInfoReplyForm
                              requestId={id!}
                              infoRequestId={info.id}
                            />
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {/* Request Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    معلومات الطلب
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">الوصف</p>
                    <p className="text-foreground whitespace-pre-wrap">
                      {request.description || "لا يوجد وصف"}
                    </p>
                  </div>
                  
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">التصنيف</p>
                      <p className="text-foreground font-medium">
                        {request.category?.name_ar || "غير محدد"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">حجم المهمة</p>
                      <p className="text-foreground font-medium capitalize">
                        {request.size === "micro" ? "صغيرة جداً" :
                         request.size === "small" ? "صغيرة" :
                         request.size === "medium" ? "متوسطة" : "كبيرة"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">الأولوية</p>
                      <p className="text-foreground font-medium">
                        {request.priority === "high" ? "عالية" :
                         request.priority === "urgent" ? "عاجلة" : "عادية"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">تاريخ الإنشاء</p>
                      <p className="text-foreground">
                        {format(new Date(request.created_at), "d MMMM yyyy", { locale: ar })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Files (original request attachments) */}
              {files.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      الملفات المرفقة عند إنشاء الطلب ({files.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FilePreview files={files} bucket="request-files" />
                  </CardContent>
                </Card>
              )}

              {/* Rating Section */}
              {request.status === "completed" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Star className="w-5 h-5 text-yellow-500" />
                      تقييمك لهذا الطلب
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid sm:grid-cols-3 gap-4">
                      {(["quality", "speed", "communication"] as const).map((key) => (
                        <div key={key} className="space-y-2">
                          <p className="text-sm font-medium">
                            {key === "quality" && "جودة العمل"}
                            {key === "speed" && "سرعة التنفيذ"}
                            {key === "communication" && "وضوح التواصل"}
                          </p>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((value) => (
                              <button
                                key={value}
                                type="button"
                                onClick={() =>
                                  setRatingValues((prev) => ({
                                    ...prev,
                                    [key]: value,
                                  }))
                                }
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs border transition-colors ${
                                  ratingValues[key] >= value
                                    ? "bg-yellow-400 text-yellow-950 border-yellow-500"
                                    : "bg-background text-muted-foreground border-border"
                                }`}
                              >
                                {value}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">تعليق (اختياري)</p>
                      <Textarea
                        rows={3}
                        value={ratingValues.comment}
                        onChange={(e) =>
                          setRatingValues((prev) => ({ ...prev, comment: e.target.value }))
                        }
                        placeholder="اكتب ملاحظاتك عن التجربة العامة..."
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button
                        disabled={ratingMutation.isPending}
                        onClick={() =>
                          ratingMutation.mutate({
                            quality: ratingValues.quality,
                            speed: ratingValues.speed,
                            communication: ratingValues.communication,
                            comment: ratingValues.comment,
                          })
                        }
                      >
                        {ratingMutation.isPending && (
                          <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                        )}
                        حفظ التقييم
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Unified Files Hub */}
            <TabsContent value="files" className="mt-6 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    مركز الملفات للطلب
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-3 items-center text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">المصدر:</span>
                      {[
                        { key: "all", label: "الكل" },
                        { key: "client", label: "العميل" },
                        { key: "admin_info", label: "طلبات المعلومات (الأدمن)" },
                        { key: "client_info", label: "ردود العميل" },
                        { key: "delivery", label: "التسليمات" },
                      ].map((opt) => (
                        <Button
                          key={opt.key}
                          size="sm"
                          variant={fileSourceFilter === opt.key ? "default" : "outline"}
                          onClick={() => setFileSourceFilter(opt.key)}
                        >
                          {opt.label}
                        </Button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">النوع:</span>
                      {[
                        { key: "all", label: "الكل" },
                        { key: "image", label: "صور" },
                        { key: "video", label: "فيديو" },
                        { key: "doc", label: "مستندات" },
                      ].map((opt) => (
                        <Button
                          key={opt.key}
                          size="sm"
                          variant={fileTypeFilter === opt.key ? "default" : "outline"}
                          onClick={() => setFileTypeFilter(opt.key)}
                        >
                          {opt.label}
                        </Button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">الفترة:</span>
                      {[
                        { key: "all", label: "كل الفترات" },
                        { key: "7d", label: "آخر 7 أيام" },
                        { key: "30d", label: "آخر 30 يوم" },
                      ].map((opt) => (
                        <Button
                          key={opt.key}
                          size="sm"
                          variant={fileDateFilter === opt.key ? "default" : "outline"}
                          onClick={() => setFileDateFilter(opt.key)}
                        >
                          {opt.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {filteredHubFiles.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      لا توجد ملفات مطابقة للفلاتر الحالية.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {filteredHubFiles.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/40"
                        >
                          <FileText className="w-5 h-5 text-primary" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{file.name}</p>
                            <p className="text-xs text-muted-foreground flex flex-wrap gap-2">
                              <span>
                                {file.source === "client" && "من العميل (إنشاء الطلب)"}
                                {file.source === "admin_info" && "من الأدمن (طلب معلومات)"}
                                {file.source === "client_info" && "من العميل (رد على طلب المعلومات)"}
                                {file.source === "delivery" && "من الفريلانسر (التسليمات)"}
                              </span>
                              {file.size && (
                                <span>
                                  • {Math.round(file.size / 1024)} KB
                                </span>
                              )}
                              <span>
                                • {new Date(file.createdAt).toLocaleString("ar-EG")}
                              </span>
                            </p>
                          </div>
                          {file.url && (
                            <Button asChild size="sm" variant="outline">
                              <a
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Eye className="w-4 h-4 ml-1" />
                                عرض
                              </a>
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="deliveries" className="mt-6">
              {deliveries && deliveries.length > 0 ? (
                <div className="space-y-4">
                  {deliveries.map((delivery) => {
                    const deliveryFiles = (delivery.files as Array<{ name: string; size: number; type: string; url?: string }>) || [];
                    
                    return (
                      <Card key={delivery.id}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-lg">
                                تسليم #{delivery.revision_number}
                              </CardTitle>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(delivery.created_at), "d MMMM yyyy, h:mm a", { locale: ar })}
                              </p>
                            </div>
                            <Badge className={
                              delivery.status === "approved" ? "bg-green-100 text-green-700" :
                              delivery.status === "rejected" ? "bg-red-100 text-red-700" :
                              "bg-yellow-100 text-yellow-700"
                            }>
                              {delivery.status === "approved" ? "مقبول" :
                               delivery.status === "rejected" ? "مرفوض" : "قيد المراجعة"}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {delivery.notes && (
                            <div>
                              <p className="text-sm text-muted-foreground mb-1">ملاحظات الفريلانسر</p>
                              <p className="text-foreground">{delivery.notes}</p>
                            </div>
                          )}
                          
                          {deliveryFiles.length > 0 && (
                            <div>
                              <p className="text-sm text-muted-foreground mb-2">ملفات التسليم</p>
                              <div className="space-y-2">
                                {deliveryFiles.map((file, idx) => (
                                  <div key={idx} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                                    <FileText className="w-5 h-5 text-primary" />
                                    <div className="flex-1">
                                      <p className="text-sm font-medium">{file.name}</p>
                                    </div>
                                    {file.url && (
                                      <Button variant="ghost" size="sm" asChild>
                                        <a href={file.url} download={file.name}>
                                          <Download className="w-4 h-4" />
                                        </a>
                                      </Button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {delivery.status === "approved" && (
                            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                                <p className="text-sm font-medium text-green-700">
                                  تم قبول هذا التسليم
                                </p>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Package className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                    <p className="text-muted-foreground">لا توجد تسليمات بعد</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      سيتم إشعارك عند استلام التسليم
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>الحالة</CardTitle>
                <StatusBadge status={request.status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">تاريخ الإنشاء:</span>
                <span className="text-foreground">
                  {format(new Date(request.created_at), "d MMMM yyyy", { locale: ar })}
                </span>
              </div>
              
              {request.deadline && (
                <div className="flex items-center gap-3 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">الموعد النهائي:</span>
                  <span className="text-foreground">
                    {format(new Date(request.deadline), "d MMMM yyyy", { locale: ar })}
                  </span>
                </div>
              )}
              
              <div className="flex items-center gap-3 text-sm">
                <CreditCard className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">التكلفة:</span>
                <span className="text-primary font-semibold">{request.credits_cost} كريديت</span>
              </div>

              {request.assignment && (
                <div className="flex items-center gap-3 text-sm">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">الحالة:</span>
                  <span className="text-foreground">تم تعيين فريلانسر</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>مراحل التقدم</CardTitle>
            </CardHeader>
            <CardContent>
              <Timeline items={timelineItems} />
            </CardContent>
          </Card>

          {/* Actions removed from client view as requested */}
        </div>
      </div>
    </DashboardLayout>
  );
}

// نموذج رد العميل على طلب معلومات واحد
function ClientInfoReplyForm({
  requestId,
  infoRequestId,
}: {
  requestId: string;
  infoRequestId: string;
}) {
  const { replyToInfoRequest } = useRequestInfo(requestId);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [files, setFiles] = useState<any[]>([]);

  const handleSend = async () => {
    if (!text.trim()) return;
    try {
      const attachments = (files || []).map((f: any) => ({
        name: f.name,
        size: f.size,
        type: f.type,
        url: f.url ?? undefined,
        path: f.path ?? undefined,
      }));
      await replyToInfoRequest.mutateAsync({
        infoRequestId,
        message: text,
        attachments,
      });
      setText("");
      setFiles([]);
      toast({ title: "تم إرسال ردك إلى فريق المنصة" });
      queryClient.invalidateQueries({ queryKey: ["messages-count", requestId] });
    } catch (error: any) {
      console.error("Error sending info reply:", error);
      toast({
        title: "تعذر إرسال الرد",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-3 border-t border-amber-100 pt-4 mt-2">
      <p className="text-sm font-medium text-amber-900">
        اكتب ردك على طلب المعلومات وأرفق أي ملفات مطلوبة
      </p>
      <Textarea
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="اكتب هنا المعلومات أو التوضيحات التي يطلبها الفريق..."
      />
      <div>
        <p className="text-xs text-muted-foreground mb-1">مرفقات (اختياري)</p>
        <FileUploadAdvanced
          folder={`request-${requestId}-info-reply-${infoRequestId}`}
          bucket="request-files"
          maxFiles={5}
          onFilesChange={(newFiles) => setFiles(newFiles as any[])}
        />
      </div>
      <div className="flex justify-end">
        <Button disabled={!text.trim() || replyToInfoRequest.isPending} onClick={handleSend}>
          {replyToInfoRequest.isPending && (
            <Loader2 className="w-4 h-4 ml-2 animate-spin" />
          )}
          إرسال الرد المطلوب
        </Button>
      </div>
    </div>
  );
}

