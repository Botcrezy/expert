import { supabase } from "@/integrations/supabase/client";
import { getPublicAppOrigin } from "@/lib/getPublicAppOrigin";

type TelegramAdminReference = {
  type: string;
  id: string;
};

type NotifyTelegramAdminParams = {
  eventKey:
    | "admin_user_registered_client"
    | "admin_user_registered_freelancer"
    | "admin_identity_submitted_client"
    | "admin_identity_submitted_freelancer"
    | "admin_withdrawal_requested"
    | "admin_delivery_pending_qc"
    | "admin_request_created";
  reference: TelegramAdminReference;
  /** Relative admin route like "/admin/requests/uuid" */
  adminPath: string;
  data?: Record<string, any>;
};

function buildAdminUrl(adminPath: string): string {
  const origin = getPublicAppOrigin();
  const path = adminPath.startsWith("/") ? adminPath : `/${adminPath}`;
  return `${origin}${path}`;
}

export async function notifyTelegramAdmin(params: NotifyTelegramAdminParams) {
  const admin_url = buildAdminUrl(params.adminPath);

  // Best-effort: do not break UX if telegram fails
  try {
    await supabase.functions.invoke("telegram-send", {
      body: {
        to_admin: true,
        message_type: params.eventKey,
        data: {
          ...(params.data || {}),
          admin_url,
        },
        reference_type: params.reference.type,
        reference_id: params.reference.id,
        buttons: [{ text: "Open", url: admin_url }],
      },
    });
  } catch (e) {
    console.error("notifyTelegramAdmin failed:", e);
  }
}
