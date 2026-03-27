import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { Json } from "@/integrations/supabase/types";

export interface InfoRequestReply {
  id: string;
  info_request_id: string;
  client_id: string;
  message: string;
  attachments: Json | null;
  created_at: string;
}

export interface InfoRequest {
  id: string;
  request_id: string;
  admin_id: string;
  title: string | null;
  message: string;
  attachments: Json | null;
  status: string;
  created_at: string;
  admin_profile?: { full_name: string; avatar_url: string | null };
  client_profile?: { full_name: string; avatar_url: string | null };
  reply?: InfoRequestReply | null;
}

export function useRequestInfo(requestId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: infoRequests = [], isLoading } = useQuery<InfoRequest[]>({
    queryKey: ["request-info", requestId],
    enabled: !!requestId,
    queryFn: async () => {
      if (!requestId) return [];

      // 1) Fetch info requests for this request
      const { data: infoReqs, error: infoError } = await supabase
        .from("request_info_requests")
        .select("*")
        .eq("request_id", requestId)
        .order("created_at", { ascending: true });

      if (infoError) throw infoError;
      const requests = infoReqs || [];
      if (requests.length === 0) return [];

      const infoRequestIds = requests.map((r) => r.id);

      // 2) Fetch replies
      const { data: replies, error: repliesError } = await supabase
        .from("request_info_replies")
        .select("*")
        .in("info_request_id", infoRequestIds);

      if (repliesError) throw repliesError;

      // 3) Fetch profiles for admins and clients involved
      const adminIds = [...new Set(requests.map((r) => r.admin_id))];
      const clientIds = [
        ...new Set((replies || []).map((r: any) => r.client_id)),
      ];
      const userIds = Array.from(new Set([...adminIds, ...clientIds]));

      let profilesMap: Record<string, { full_name: string; avatar_url: string | null }> = {};

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url")
          .in("user_id", userIds);

        if (profiles) {
          profilesMap = profiles.reduce((acc, p) => {
            acc[p.user_id] = {
              full_name: p.full_name,
              avatar_url: p.avatar_url,
            };
            return acc;
          }, {} as Record<string, { full_name: string; avatar_url: string | null }>);
        }
      }

      const repliesByInfoId: Record<string, any> = {};
      (replies || []).forEach((r: any) => {
        // We only care about the latest reply per info request for now
        repliesByInfoId[r.info_request_id] = r;
      });

      const result: InfoRequest[] = requests.map((req: any) => {
        const reply = repliesByInfoId[req.id];
        return {
          id: req.id,
          request_id: req.request_id,
          admin_id: req.admin_id,
          title: req.title,
          message: req.message,
          attachments: req.attachments,
          status: req.status,
          created_at: req.created_at,
          admin_profile: profilesMap[req.admin_id],
          client_profile: reply ? profilesMap[reply.client_id] : undefined,
          reply: reply
            ? {
                id: reply.id,
                info_request_id: reply.info_request_id,
                client_id: reply.client_id,
                message: reply.message,
                attachments: reply.attachments,
                created_at: reply.created_at,
              }
            : null,
        };
      });

      return result;
    },
  });

  const createInfoRequest = useMutation({
    mutationFn: async (params: {
      requestId: string;
      title?: string;
      message: string;
      attachments?: Array<{
        name: string;
        url: string;
        type: string;
        size: number;
        path?: string;
      }>;
    }) => {
      if (!user) throw new Error("المستخدم غير مسجل");

      const { requestId, title, message, attachments } = params;

      const { error: insertError } = await supabase.from("request_info_requests").insert({
        request_id: requestId,
        admin_id: user.id,
        title: title || null,
        message: message.trim(),
        attachments:
          attachments && attachments.length
            ? (attachments as unknown as Json)
            : null,
        status: "pending",
      });

      if (insertError) throw insertError;

      // Update main request status to needs_info
      const { error: statusError } = await supabase
        .from("requests")
        .update({ status: "needs_info" })
        .eq("id", requestId);

      if (statusError) {
        console.error("Failed to update request status:", statusError);
      }

      // Notify client
      const { data: requestData } = await supabase
        .from("requests")
        .select("user_id, request_number")
        .eq("id", requestId)
        .maybeSingle();

      if (requestData?.user_id) {
        await supabase.from("notifications").insert({
          user_id: requestData.user_id,
          type: "request_needs_info",
          title: "نحتاج معلومات إضافية لطلبك",
          body: `يرجى تزويدنا بالمعلومات المطلوبة لإكمال طلب رقم ${requestData.request_number}`,
          reference_type: "request",
          reference_id: requestId,
        });
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["request-info", variables.requestId],
      });
      queryClient.invalidateQueries({ queryKey: ["request", variables.requestId] });
      toast({ title: "تم إنشاء طلب المعلومات بنجاح" });
    },
    onError: (error: any) => {
      console.error("createInfoRequest error:", error);
      toast({
        title: "فشل إنشاء طلب المعلومات",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const replyToInfoRequest = useMutation({
    mutationFn: async (params: {
      infoRequestId: string;
      message: string;
      attachments?: Array<{
        name: string;
        url: string;
        type: string;
        size: number;
        path?: string;
      }>;
    }) => {
      if (!user) throw new Error("المستخدم غير مسجل");

      const { infoRequestId, message, attachments } = params;

      const { data: infoReq, error: infoErr } = await supabase
        .from("request_info_requests")
        .select("id, request_id, admin_id")
        .eq("id", infoRequestId)
        .maybeSingle();

      if (infoErr) throw infoErr;
      if (!infoReq) throw new Error("طلب المعلومات غير موجود");

      const { error: insertError } = await supabase.from("request_info_replies").insert({
        info_request_id: infoRequestId,
        client_id: user.id,
        message: message.trim(),
        attachments:
          attachments && attachments.length
            ? (attachments as unknown as Json)
            : null,
      });

      if (insertError) throw insertError;

      // Notify admin who created the info request
      if (infoReq.admin_id) {
        const { data: reqData } = await supabase
          .from("requests")
          .select("request_number")
          .eq("id", infoReq.request_id)
          .maybeSingle();

        await supabase.from("notifications").insert({
          user_id: infoReq.admin_id,
          type: "request_info_replied",
          title: "العميل رد على طلب المعلومات",
          body: reqData?.request_number
            ? `تم استلام رد جديد على طلب رقم ${reqData.request_number}`
            : "تم استلام رد جديد على طلب معلومات",
          reference_type: "request",
          reference_id: infoReq.request_id,
        });
      }

      // status of info request is updated by trigger; we just return request id
      return infoReq.request_id as string;
    },
    onSuccess: (requestId) => {
      queryClient.invalidateQueries({ queryKey: ["request-info", requestId] });
      toast({ title: "تم إرسال ردك على طلب المعلومات" });
    },
    onError: (error: any) => {
      console.error("replyToInfoRequest error:", error);
      toast({
        title: "فشل إرسال الرد",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    infoRequests,
    isLoading,
    createInfoRequest,
    replyToInfoRequest,
  };
}
