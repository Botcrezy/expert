import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { telegramClient } from "@/integrations/telegramClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  MessageCircle, 
  Link2, 
  Link2Off, 
  Loader2, 
  Copy, 
  Check,
  ExternalLink,
  RefreshCw
} from "lucide-react";

interface TelegramLink {
  id: string;
  user_id: string;
  user_type: string;
  telegram_chat_id: string;
  telegram_user_id: string | null;
  telegram_username: string | null;
  is_active: boolean;
  created_at: string;
}

interface TelegramLinkCardProps {
  userType?: 'client' | 'freelancer' | 'admin';
}

export function TelegramLinkCard({ userType = 'client' }: TelegramLinkCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch telegram link status using raw query to bypass type issues
  const { data: telegramLink, isLoading } = useQuery({
    queryKey: ["telegram-link", user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      // Use from with type assertion for new tables
      const { data, error } = await (telegramClient as any)
        .from("telegram_links")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();
      
      if (error) throw error;
      return data as TelegramLink | null;
    },
    enabled: !!user,
  });

  // Generate link code mutation
  const generateCodeMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("غير مسجل الدخول");
      
      // Use rpc with type assertion
      const { data, error } = await (telegramClient as any).rpc("generate_telegram_link_code", {
        p_user_id: user.id,
        p_user_type: userType,
      });
      
      if (error) throw error;
      return data as string;
    },
    onSuccess: (code) => {
      setLinkCode(code);
      setShowLinkDialog(true);
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Unlink mutation
  const unlinkMutation = useMutation({
    mutationFn: async () => {
      if (!user || !telegramLink) throw new Error("غير مرتبط");

      // Use RPC to avoid client-side update constraints/RLS edge cases
      const { data, error } = await (telegramClient as any).rpc(
        "unlink_telegram_account",
        {
          p_user_id: user.id,
        }
      );

      if (error) throw error;

      const result = data?.[0];
      if (result && result.success === false) {
        throw new Error(result.message || "غير مرتبط");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["telegram-link", user?.id] });
      toast({
        title: "تم فصل الربط ✅",
        description: "لن تصلك إشعارات على تليجرام بعد الآن",
      });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const copyCode = async () => {
    if (!linkCode) return;
    await navigator.clipboard.writeText(`/link ${linkCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "تم النسخ ✅",
      description: "الأمر جاهز للصق في البوت",
    });
  };

  const openBot = () => {
    window.open("https://t.me/sitycloudexp_bot", "_blank");
  };

  if (isLoading) {
    return (
      <div className="card-elevated p-6">
        <div className="flex items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>جاري التحميل...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="card-elevated p-6">
        <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-primary" />
          ربط تليجرام
        </h3>

        {telegramLink ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <Check className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-green-700 dark:text-green-300">
                  حسابك مربوط بتليجرام ✅
                </p>
                <p className="text-sm text-green-600 dark:text-green-400">
                  {telegramLink.telegram_username
                    ? `@${telegramLink.telegram_username}`
                    : "ستصلك إشعارات فورية"}
                </p>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                مفعّل
              </Badge>
            </div>

            <p className="text-sm text-muted-foreground">
              ستصلك إشعارات فورية على تليجرام عند:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 mr-4 list-disc">
              <li>وصول مهام جديدة</li>
              <li>تحديثات الطلبات</li>
              <li>إضافة رصيد للمحفظة</li>
              <li>رسائل من المنصة</li>
            </ul>

            <Button
              variant="outline"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => unlinkMutation.mutate()}
              disabled={unlinkMutation.isPending}
            >
              {unlinkMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Link2Off className="w-4 h-4" />
              )}
              فصل الربط
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-muted-foreground">
              اربط حسابك بتليجرام لتصلك إشعارات فورية على هاتفك.
            </p>

            <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <MessageCircle className="w-4 h-4 text-primary" />
              </div>
              <div className="text-sm">
                <p className="font-medium text-foreground mb-1">مميزات الربط:</p>
                <ul className="text-muted-foreground space-y-1">
                  <li>• إشعارات فورية للمهام الجديدة</li>
                  <li>• تنبيهات تحديثات الطلبات</li>
                  <li>• إشعارات المدفوعات</li>
                  <li>• رسائل مهمة من المنصة</li>
                </ul>
              </div>
            </div>

            <Button
              onClick={() => generateCodeMutation.mutate()}
              disabled={generateCodeMutation.isPending}
              className="bg-primary hover:bg-primary/90"
            >
              {generateCodeMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Link2 className="w-4 h-4" />
              )}
              ربط تليجرام
            </Button>
          </div>
        )}
      </div>

      {/* Link Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-primary" />
              ربط حسابك بتليجرام
            </DialogTitle>
            <DialogDescription>
              اتبع الخطوات التالية لإتمام الربط
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Step 1 */}
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">
                1
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground mb-2">افتح بوت Sity Expert</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openBot}
                  className="text-primary border-primary hover:bg-primary/10"
                >
                  <ExternalLink className="w-4 h-4" />
                  فتح البوت
                </Button>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">
                2
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground mb-2">أرسل الأمر التالي للبوت:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted px-4 py-2 rounded-lg font-mono text-sm">
                    /link {linkCode}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyCode}
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  الكود صالح لمدة 10 دقائق
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">
                3
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground mb-2">تأكيد الربط</p>
                <p className="text-sm text-muted-foreground">
                  بعد إرسال الأمر، ستتلقى رسالة تأكيد من البوت
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                generateCodeMutation.mutate();
              }}
              disabled={generateCodeMutation.isPending}
            >
              <RefreshCw className="w-4 h-4" />
              كود جديد
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setShowLinkDialog(false);
                queryClient.invalidateQueries({ queryKey: ["telegram-link", user?.id] });
              }}
            >
              تم الربط
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
