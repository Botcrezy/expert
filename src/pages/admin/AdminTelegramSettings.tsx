import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { TelegramLinkCard } from "@/components/telegram/TelegramLinkCard";
import { TemplateVariablesTable } from "@/components/telegram/TemplateVariablesTable";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { telegramClient } from "@/integrations/telegramClient";
import { useToast } from "@/hooks/use-toast";
import { 
  MessageCircle,
  Settings,
  Link2,
  CheckCircle2,
  XCircle,
  Loader2,
  Send,
  Users,
  RefreshCw,
  AlertTriangle,
  ExternalLink,
  Bot,
  Zap,
  Activity,
  BarChart3,
  Trash2,
  Clock,
  Shield,
  Globe,
  Hash,
  Copy,
  Check,
  BellRing,
  UserCheck,
  UserX,
  Radio,
  FileText,
  Save,
  Edit3,
  Table,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function AdminTelegramSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const envBaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || "";
  const [testMessage, setTestMessage] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastTarget, setBroadcastTarget] = useState("all");
  const [copied, setCopied] = useState<string | null>(null);
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editedTemplate, setEditedTemplate] = useState("");
  const [showNewMessageDialog, setShowNewMessageDialog] = useState(false);
  const [newMessageKey, setNewMessageKey] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newAudience, setNewAudience] = useState<string>("client");
  const [newVariables, setNewVariables] = useState("");
  const [newTemplate, setNewTemplate] = useState("");

  // Resend failed message (admin manual retry)
  const resendMutation = useMutation({
    mutationFn: async (log: any) => {
      const { data, error } = await telegramClient.functions.invoke("telegram-send", {
        body: {
          chat_id: log.telegram_chat_id,
          user_id: log.user_id || undefined,
          message_type: "custom",
          message: log.message_text,
          reference_type: log.reference_type || undefined,
          reference_id: log.reference_id || undefined,
          force: true,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "تمت إعادة الإرسال ✅" });
      queryClient.invalidateQueries({ queryKey: ["telegram-message-logs"] });
      queryClient.invalidateQueries({ queryKey: ["telegram-stats"] });
    },
    onError: (error: any) => {
      toast({
        title: "فشل إعادة الإرسال",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Realtime subscription for live updates
  useEffect(() => {
    const channel = telegramClient
      .channel('telegram-admin-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'telegram_links' },
        () => {
          queryClient.invalidateQueries({ queryKey: ["telegram-linked-users"] });
          queryClient.invalidateQueries({ queryKey: ["telegram-stats"] });
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'telegram_messages_log' },
        () => {
          queryClient.invalidateQueries({ queryKey: ["telegram-message-logs"] });
          queryClient.invalidateQueries({ queryKey: ["telegram-stats"] });
        }
      )
      .subscribe();

    return () => {
      telegramClient.removeChannel(channel);
    };
  }, [queryClient]);

  // Fetch telegram stats
  const { data: telegramStats, isLoading: loadingStats } = useQuery({
    queryKey: ["telegram-stats"],
    queryFn: async () => {
      const [linksResult, logsResult, recentLogsResult] = await Promise.all([
        (telegramClient as any).from("telegram_links").select("*", { count: "exact" }),
        (telegramClient as any).from("telegram_messages_log").select("*", { count: "exact" }),
        (telegramClient as any)
          .from("telegram_messages_log")
          .select("status")
          .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      ]);

      const activeLinks = linksResult.data?.filter((l: any) => l.is_active) || [];
      const recentLogs = recentLogsResult.data || [];
      const deliveredCount = recentLogs.filter((l: any) => l.status === 'sent').length;
      const failedCount = recentLogs.filter((l: any) => l.status === 'failed').length;

      return {
        totalLinks: linksResult.count || 0,
        activeLinks: activeLinks.length,
        inactiveLinks: (linksResult.count || 0) - activeLinks.length,
        totalMessages: logsResult.count || 0,
        messagesLast24h: recentLogs.length,
        deliveredLast24h: deliveredCount,
        failedLast24h: failedCount,
        deliveryRate: recentLogs.length > 0 
          ? Math.round((deliveredCount / recentLogs.length) * 100) 
          : 100,
      };
    },
    refetchInterval: 30000,
  });

  // Fetch linked users (avoid broken embedded join if no FK relationship exists)
  const { data: linkedUsers, isLoading: loadingUsers, refetch: refetchUsers } = useQuery({
    queryKey: ["telegram-linked-users"],
    queryFn: async () => {
      const { data: links, error: linksError } = await (telegramClient as any)
        .from("telegram_links")
        .select("*")
        .order("created_at", { ascending: false });

      if (linksError) throw linksError;

      const userIds = Array.from(
        new Set((links || []).map((l: any) => l.user_id).filter(Boolean))
      );

      let profilesByUserId: Record<string, { full_name?: string; email?: string }> = {};

      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await (telegramClient as any)
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", userIds);

        if (profilesError) throw profilesError;

        profilesByUserId = (profiles || []).reduce((acc: any, p: any) => {
          acc[p.user_id] = { full_name: p.full_name, email: p.email };
          return acc;
        }, {});
      }

      return (links || []).map((l: any) => ({
        ...l,
        profile: profilesByUserId[l.user_id] || null,
      }));
    },
  });

  // Fetch message logs
  const { data: messageLogs, isLoading: loadingLogs, refetch: refetchLogs } = useQuery({
    queryKey: ["telegram-message-logs"],
    queryFn: async () => {
      const { data, error } = await (telegramClient as any)
        .from("telegram_messages_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data || [];
    },
  });

  const { data: botMessages, isLoading: loadingBotMessages, refetch: refetchBotMessages } = useQuery({
    queryKey: ["telegram-bot-messages"],
    queryFn: async () => {
      const { data, error } = await (telegramClient as any)
        .from("telegram_bot_messages")
        .select("*")
        .order("message_key", { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch template variables table (grouped by audience)
  const { data: templateVariables, isLoading: loadingTemplateVariables } = useQuery({
    queryKey: ["telegram-template-variables"],
    queryFn: async () => {
      const { data, error } = await (telegramClient as any)
        .from("telegram_template_variables")
        .select("*")
        .order("audience", { ascending: true })
        .order("message_key", { ascending: true })
        .order("variable_name", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  // Get webhook info
  const { data: webhookInfo, isLoading: loadingWebhook, refetch: refetchWebhook } = useQuery({
    queryKey: ["telegram-webhook-info"],
    queryFn: async () => {
      const { data, error } = await telegramClient.functions.invoke("telegram-setup", {
        body: { action: "getWebhookInfo" },
      });
      
      if (error) throw error;
      return data?.result || data;
    },
  });

  // Get bot info
  const { data: botInfo, isLoading: loadingBotInfo } = useQuery({
    queryKey: ["telegram-bot-info"],
    queryFn: async () => {
      const { data, error } = await telegramClient.functions.invoke("telegram-setup", {
        body: { action: "getMe" },
      });
      
      if (error) throw error;
      return data?.result || data;
    },
  });

  // Setup webhook mutation
  const setupWebhookMutation = useMutation({
    mutationFn: async () => {
      // Use env base URL so it's flexible per project/environment
      if (!envBaseUrl) {
        throw new Error("VITE_SUPABASE_URL غير مُعدّ. لا يمكن توليد رابط الـ Webhook.");
      }

      const webhookUrl = `${envBaseUrl}/functions/v1/telegram-webhook`;
      const { data, error } = await telegramClient.functions.invoke("telegram-setup", {
        body: { action: "setWebhook", webhook_url: webhookUrl }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "تم ضبط Webhook بنجاح ✅" });
      refetchWebhook();
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في ضبط Webhook",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete webhook mutation
  const deleteWebhookMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await telegramClient.functions.invoke("telegram-setup", {
        body: { action: "deleteWebhook" },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "تم حذف Webhook ✅" });
      refetchWebhook();
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في حذف Webhook",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Send test message
  const sendTestMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await telegramClient.functions.invoke("telegram-send", {
        body: { 
          to_admin: true,
          message_type: "custom",
          message: testMessage || "🔔 رسالة اختبار من لوحة التحكم"
        }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "تم إرسال رسالة الاختبار ✅" });
      setTestMessage("");
      refetchLogs();
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في الإرسال",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Broadcast message mutation
  const broadcastMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await telegramClient.functions.invoke("telegram-send", {
        body: { 
          broadcast: true,
          target: broadcastTarget,
          message_type: "custom",
          message: broadcastMessage
        }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      toast({ 
        title: "تم بث الرسالة ✅",
        description: `تم إرسال ${data?.sent || 0} رسالة` 
      });
      setBroadcastMessage("");
      refetchLogs();
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في البث",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Unlink user mutation
  const unlinkUserMutation = useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await (telegramClient as any)
        .from("telegram_links")
        .update({ is_active: false })
        .eq("id", linkId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "تم فصل الربط ✅" });
      refetchUsers();
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update bot message mutation
  const updateBotMessageMutation = useMutation({
    mutationFn: async ({ messageKey, template }: { messageKey: string; template: string }) => {
      const { error } = await (telegramClient as any)
        .from("telegram_bot_messages")
        .update({ message_template: template, updated_at: new Date().toISOString() })
        .eq("message_key", messageKey);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "تم حفظ الرسالة ✅" });
      setEditingMessage(null);
      setEditedTemplate("");
      refetchBotMessages();
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في الحفظ",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create new bot message mutation
  const createBotMessageMutation = useMutation({
    mutationFn: async () => {
      const variablesArray = newVariables
        .split(",")
        .map((v) => v.trim())
        .filter((v) => v.length > 0);

      const { error } = await (telegramClient as any)
        .from("telegram_bot_messages")
        .insert({
          message_key: newMessageKey.trim(),
          description: newDescription.trim() || null,
          audience: newAudience,
          variables: variablesArray.length > 0 ? variablesArray : null,
          message_template: newTemplate,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "تم إضافة الرسالة الجديدة ✅" });
      setShowNewMessageDialog(false);
      setNewMessageKey("");
      setNewDescription("");
      setNewAudience("client");
      setNewVariables("");
      setNewTemplate("");
      refetchBotMessages();
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في الإضافة",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
    toast({ title: "تم النسخ ✅" });
  };

  const expectedWebhookUrl = envBaseUrl
    ? `${envBaseUrl}/functions/v1/telegram-webhook`
    : "";
  const isWebhookActive = Boolean((webhookInfo as any)?.url) && String((webhookInfo as any)?.url).includes("telegram-webhook");
  const isWebhookCorrect = String((webhookInfo as any)?.url || "") === expectedWebhookUrl;
  const activeUsersCount = linkedUsers?.filter((u: any) => u.is_active).length || 0;

  return (
    <DashboardLayout
      sidebar={<AdminSidebar />}
      title="إدارة بوت تليجرام"
      subtitle="تحكم كامل في بوت Telegram والإشعارات"
    >
      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="flex-wrap gap-1">
          <TabsTrigger value="dashboard" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            لوحة التحكم
          </TabsTrigger>
          <TabsTrigger value="webhook" className="gap-2">
            <Zap className="w-4 h-4" />
            Webhook
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="w-4 h-4" />
            المستخدمين ({activeUsersCount})
          </TabsTrigger>
          <TabsTrigger value="broadcast" className="gap-2">
            <BellRing className="w-4 h-4" />
            البث
          </TabsTrigger>
          <TabsTrigger value="messages" className="gap-2">
            <FileText className="w-4 h-4" />
            الرسائل
          </TabsTrigger>
          <TabsTrigger value="variables" className="gap-2">
            <Table className="w-4 h-4" />
            متغيرات الرسائل
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <MessageCircle className="w-4 h-4" />
            السجل
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="w-4 h-4" />
            الإعدادات
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard">
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="card-elevated p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {loadingStats ? "-" : telegramStats?.activeLinks}
                    </p>
                    <p className="text-sm text-muted-foreground">مستخدم مربوط</p>
                  </div>
                </div>
              </div>

              <div className="card-elevated p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <Send className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {loadingStats ? "-" : telegramStats?.messagesLast24h}
                    </p>
                    <p className="text-sm text-muted-foreground">رسالة (24 ساعة)</p>
                  </div>
                </div>
              </div>

              <div className="card-elevated p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <Activity className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {loadingStats ? "-" : `${telegramStats?.deliveryRate}%`}
                    </p>
                    <p className="text-sm text-muted-foreground">نسبة التوصيل</p>
                  </div>
                </div>
              </div>

              <div className="card-elevated p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    isWebhookActive 
                      ? "bg-green-100 dark:bg-green-900/30" 
                      : "bg-red-100 dark:bg-red-900/30"
                  }`}>
                    <Radio className={`w-5 h-5 ${isWebhookActive ? "text-green-600" : "text-red-600"}`} />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-foreground">
                      {isWebhookActive ? "متصل" : "غير متصل"}
                    </p>
                    <p className="text-sm text-muted-foreground">حالة البوت</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bot Info Card */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="card-elevated p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Bot className="w-5 h-5 text-[#0088cc]" />
                  معلومات البوت
                </h3>

                {loadingBotInfo ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>جاري التحميل...</span>
                  </div>
                ) : botInfo ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="text-muted-foreground">اسم البوت</span>
                      <span className="font-medium">{(botInfo as any)?.first_name || "غير محدد"}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="text-muted-foreground">Username</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[#0088cc]">@{(botInfo as any)?.username}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(`@${(botInfo as any)?.username}`, "username")}
                        >
                          {copied === "username" ? (
                            <Check className="w-3 h-3 text-green-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="text-muted-foreground">Bot ID</span>
                      <span className="font-mono text-sm">{(botInfo as any)?.id}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="text-muted-foreground">يدعم المجموعات</span>
                      <Badge variant={(botInfo as any)?.can_join_groups ? "default" : "secondary"}>
                        {(botInfo as any)?.can_join_groups ? "نعم" : "لا"}
                      </Badge>
                    </div>

                    <Button
                      variant="outline"
                      onClick={() => window.open(`https://t.me/${(botInfo as any)?.username}`, "_blank")}
                      className="w-full"
                    >
                      <ExternalLink className="w-4 h-4" />
                      فتح البوت
                    </Button>
                  </div>
                ) : (
                  <p className="text-muted-foreground">تعذر تحميل معلومات البوت</p>
                )}
              </div>

              {/* Quick Test */}
              <div className="card-elevated p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Send className="w-5 h-5" />
                  اختبار سريع
                </h3>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>رسالة اختبار للأدمن</Label>
                    <Input
                      value={testMessage}
                      onChange={(e) => setTestMessage(e.target.value)}
                      placeholder="اكتب رسالة اختبار..."
                    />
                  </div>

                  <Button
                    onClick={() => sendTestMutation.mutate()}
                    disabled={sendTestMutation.isPending}
                    className="w-full"
                  >
                    {sendTestMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    إرسال اختبار
                  </Button>

                  <p className="text-xs text-muted-foreground text-center">
                    سيتم إرسال الرسالة لحساب الأدمن على تليجرام
                  </p>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="card-elevated p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  آخر النشاطات
                </h3>
                <Button variant="ghost" size="sm" onClick={() => refetchLogs()}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>

              {loadingLogs ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : messageLogs && messageLogs.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {messageLogs.slice(0, 10).map((log: any) => (
                    <div key={log.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                      <div className={`w-2 h-2 rounded-full ${log.status === 'sent' ? "bg-green-500" : "bg-red-500"}`} />
                      <div className="flex-1 min-w-0">
                        <Badge variant="outline" className="text-xs mb-1">
                          {log.message_type}
                        </Badge>
                        <p className="text-sm text-muted-foreground truncate">{log.message_text}</p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {new Date(log.created_at).toLocaleTimeString("ar-EG")}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">لا توجد نشاطات حديثة</p>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Webhook Tab */}
        <TabsContent value="webhook">
          <div className="space-y-6">
            <div className="card-elevated p-6">
              <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
                <Link2 className="w-5 h-5" />
                حالة Webhook
              </h3>

              {loadingWebhook ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>جاري التحقق...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className={`flex items-center gap-3 p-4 rounded-lg border ${
                    isWebhookActive 
                      ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                      : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
                  }`}>
                    {isWebhookActive ? (
                      <CheckCircle2 className="w-6 h-6 text-green-600" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-600" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium">
                        {!isWebhookActive
                          ? "Webhook غير متصل ❌"
                          : isWebhookCorrect
                            ? "Webhook متصل وصحيح ✅"
                            : "Webhook متصل لكن غير صحيح ⚠️"}
                      </p>
                      {(webhookInfo as any)?.url && (
                        <p className="text-sm text-muted-foreground truncate max-w-lg font-mono">
                          {(webhookInfo as any).url}
                        </p>
                      )}
                      {isWebhookActive && !isWebhookCorrect && (
                        <p className="text-xs text-muted-foreground mt-1">
                          المتوقع: <span className="font-mono">{expectedWebhookUrl}</span>
                        </p>
                      )}
                    </div>
                    <Badge variant={!isWebhookActive ? "destructive" : isWebhookCorrect ? "default" : "secondary"}>
                      {!isWebhookActive ? "غير نشط" : isWebhookCorrect ? "صحيح" : "غير صحيح"}
                    </Badge>
                  </div>

                  {/* Webhook Details */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">رسائل معلقة</p>
                      <p className="text-xl font-bold">{(webhookInfo as any)?.pending_update_count || 0}</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">آخر خطأ</p>
                      <p className="text-sm font-medium truncate">
                        {(webhookInfo as any)?.last_error_message || "لا يوجد"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button
                      onClick={() => setupWebhookMutation.mutate()}
                      disabled={setupWebhookMutation.isPending}
                    >
                      {setupWebhookMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Link2 className="w-4 h-4" />
                      )}
                      {isWebhookActive ? "إعادة ضبط" : "ضبط Webhook"}
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => copyToClipboard(expectedWebhookUrl, "expected-webhook")}
                    >
                      <Copy className="w-4 h-4" />
                      نسخ الرابط الصحيح
                    </Button>
                    
                    {isWebhookActive && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive">
                            <Trash2 className="w-4 h-4" />
                            حذف Webhook
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>حذف Webhook؟</AlertDialogTitle>
                            <AlertDialogDescription>
                              سيتم إيقاف استقبال الرسائل من تليجرام. هل أنت متأكد؟
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteWebhookMutation.mutate()}>
                              حذف
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}

                    <Button variant="outline" onClick={() => refetchWebhook()}>
                      <RefreshCw className="w-4 h-4" />
                      تحديث
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Webhook URL Info */}
            <div className="card-elevated p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Globe className="w-5 h-5" />
                رابط Webhook
              </h3>

              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <code className="flex-1 text-sm font-mono break-all">
                    {(telegramClient as any).supabaseUrl}/functions/v1/telegram-webhook
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(
                      `${(telegramClient as any).supabaseUrl}/functions/v1/telegram-webhook`,
                      "webhook"
                    )}
                  >
                    {copied === "webhook" ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                <p className="text-sm text-muted-foreground">
                  هذا الرابط يُستخدم لاستقبال التحديثات من Telegram. يتم ضبطه تلقائياً عند الضغط على "ضبط Webhook".
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users">
          <div className="card-elevated p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Users className="w-5 h-5" />
                المستخدمين المربوطين
              </h3>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {activeUsersCount} نشط
                </Badge>
                <Button variant="outline" size="sm" onClick={() => refetchUsers()}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {loadingUsers ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : linkedUsers && linkedUsers.length > 0 ? (
              <div className="space-y-3">
                {linkedUsers.map((link: any) => (
                  <div key={link.id} className={`flex items-center justify-between p-4 rounded-lg border ${
                    link.is_active 
                      ? "bg-muted/50 border-border" 
                      : "bg-muted/20 border-dashed opacity-60"
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        link.is_active 
                          ? "bg-green-100 dark:bg-green-900/30" 
                          : "bg-gray-100 dark:bg-gray-800"
                      }`}>
                        {link.is_active ? (
                          <UserCheck className="w-5 h-5 text-green-600" />
                        ) : (
                          <UserX className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {link.profile?.full_name || "مستخدم"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {link.profile?.email || link.user_id}
                        </p>
                        {link.telegram_username && (
                          <p className="text-sm text-[#0088cc]">@{link.telegram_username}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-left">
                        <Badge variant={link.is_active ? "default" : "secondary"}>
                          {link.is_active ? "نشط" : "غير نشط"}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(link.created_at).toLocaleDateString("ar-EG")}
                        </p>
                      </div>
                      {link.is_active && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>فصل ربط المستخدم؟</AlertDialogTitle>
                              <AlertDialogDescription>
                                سيتم إيقاف إرسال الإشعارات لهذا المستخدم على تليجرام.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>إلغاء</AlertDialogCancel>
                              <AlertDialogAction onClick={() => unlinkUserMutation.mutate(link.id)}>
                                فصل الربط
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>لا يوجد مستخدمين مربوطين بعد</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Broadcast Tab */}
        <TabsContent value="broadcast">
          <div className="card-elevated p-6">
            <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
              <BellRing className="w-5 h-5" />
              بث رسالة جماعية
            </h3>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>الفئة المستهدفة</Label>
                <Select value={broadcastTarget} onValueChange={setBroadcastTarget}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع المستخدمين</SelectItem>
                    <SelectItem value="clients">العملاء فقط</SelectItem>
                    <SelectItem value="freelancers">الفريلانسرز فقط</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>نص الرسالة</Label>
                <Textarea
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="اكتب رسالة البث هنا..."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  يدعم تنسيق HTML: &lt;b&gt;عريض&lt;/b&gt;, &lt;i&gt;مائل&lt;/i&gt;, &lt;code&gt;كود&lt;/code&gt;
                </p>
              </div>

              <div className="flex items-center gap-4 p-4 bg-warning/10 border border-warning/30 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-warning">تحذير</p>
                  <p className="text-muted-foreground">
                    سيتم إرسال الرسالة لـ <strong>{activeUsersCount}</strong> مستخدم مربوط. تأكد من محتوى الرسالة.
                  </p>
                </div>
              </div>

              <Button
                onClick={() => broadcastMutation.mutate()}
                disabled={broadcastMutation.isPending || !broadcastMessage.trim()}
                className="w-full"
              >
                {broadcastMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                بث الرسالة
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs">
          <div className="card-elevated p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                سجل الرسائل
              </h3>
              <Button variant="outline" size="sm" onClick={() => refetchLogs()}>
                <RefreshCw className="w-4 h-4" />
                تحديث
              </Button>
            </div>

            {loadingLogs ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : messageLogs && messageLogs.length > 0 ? (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {messageLogs.map((log: any) => (
                  <div key={log.id} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg text-sm">
                    <div
                      className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
                        log.status === 'sent' ? "bg-green-500" : "bg-red-500"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {log.message_type || "notification"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.created_at).toLocaleString("ar-EG")}
                        </span>
                      </div>
                      <p className="text-muted-foreground whitespace-pre-wrap break-words">
                        {log.message_text}
                      </p>
                      {log.error_message && (
                        <p className="text-xs text-red-500 mt-1">خطأ: {log.error_message}</p>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <Badge
                        variant={log.status === 'sent' ? "default" : "destructive"}
                        className="shrink-0"
                      >
                        {log.status === 'sent' ? "تم" : "فشل"}
                      </Badge>

                      {log.status !== 'sent' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => resendMutation.mutate(log)}
                          disabled={resendMutation.isPending}
                        >
                          {resendMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                          إعادة الإرسال
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>لا يوجد رسائل مسجلة</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Messages Customization Tab */}
        <TabsContent value="messages">
          <div className="card-elevated p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <FileText className="w-5 h-5" />
                تخصيص رسائل البوت
              </h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewMessageDialog(true)}
                >
                  + إضافة رسالة جديدة
                </Button>
                <Button variant="outline" size="sm" onClick={() => refetchBotMessages()}>
                  <RefreshCw className="w-4 h-4" />
                  تحديث
                </Button>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-6">
              يمكنك تعديل نصوص رسائل البوت المختلفة. استخدم المتغيرات بين أقواس مثل <code className="bg-muted px-1 rounded">{'{name}'}</code> لإضافة بيانات ديناميكية.
            </p>

            {loadingBotMessages ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : botMessages && botMessages.length > 0 ? (
              <div className="space-y-4">
                {botMessages.map((msg: any) => (
                  <div key={msg.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3 gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <code className="bg-primary/10 text-primary px-2 py-0.5 rounded text-sm font-mono">
                            {msg.message_key}
                          </code>
                          {msg.audience && (
                            <Badge variant="secondary" className="text-xs">
                              {msg.audience === "client" && "العميل"}
                              {msg.audience === "freelancer" && "الفريلانسر"}
                              {msg.audience === "admin" && "الأدمن"}
                              {msg.audience === "all" && "الجميع"}
                            </Badge>
                          )}
                          {msg.is_active ? (
                            <Badge variant="default" className="text-xs">نشط</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">معطل</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{msg.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            sendTestMutation.mutate({
                              messageKey: msg.message_key,
                            } as any)
                          }
                        >
                          <Send className="w-4 h-4" />
                          اختبار
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (editingMessage === msg.message_key) {
                              setEditingMessage(null);
                              setEditedTemplate("");
                            } else {
                              setEditingMessage(msg.message_key);
                              setEditedTemplate(msg.message_template);
                            }
                          }}
                        >
                          <Edit3 className="w-4 h-4" />
                          {editingMessage === msg.message_key ? "إلغاء" : "تعديل"}
                        </Button>
                      </div>
                    </div>

                    {editingMessage === msg.message_key ? (
                      <div className="space-y-3">
                        <Textarea
                          value={editedTemplate}
                          onChange={(e) => setEditedTemplate(e.target.value)}
                          rows={6}
                          className="font-mono text-sm"
                          dir="auto"
                        />
                        {msg.variables && msg.variables.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            <span className="text-xs text-muted-foreground">المتغيرات المتاحة:</span>
                            {msg.variables.map((v: string) => (
                              <Badge key={v} variant="outline" className="font-mono text-xs">
                                {'{' + v + '}'}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <Button
                          onClick={() => updateBotMessageMutation.mutate({
                            messageKey: msg.message_key,
                            template: editedTemplate,
                          })}
                          disabled={updateBotMessageMutation.isPending}
                        >
                          {updateBotMessageMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                          حفظ التغييرات
                        </Button>
                      </div>
                    ) : (
                      <div className="bg-muted/50 rounded-lg p-3 max-h-32 overflow-y-auto">
                        <pre className="text-sm whitespace-pre-wrap font-mono" dir="auto">
                          {msg.message_template}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>لا توجد رسائل للتخصيص</p>
              </div>
            )}

            {/* New message dialog */}
            {showNewMessageDialog && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                <div className="w-full max-w-lg card-elevated p-6 space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold">إضافة رسالة جديدة</h3>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowNewMessageDialog(false)}
                    >
                      ×
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label>مفتاح الرسالة (message_key)</Label>
                      <Input
                        value={newMessageKey}
                        onChange={(e) => setNewMessageKey(e.target.value)}
                        placeholder="مثال: request_created_client, order_paid_client"
                      />
                      <p className="text-xs text-muted-foreground">
                        هذا المفتاح يتم استدعاؤه من الأكشن في النظام (إنشاء طلب، تعيين مهمة، دفع، إلخ) لربط الرسالة بالحدث.
                      </p>
                    </div>

                    <div className="space-y-1">
                      <Label>وصف مختصر</Label>
                      <Input
                        value={newDescription}
                        onChange={(e) => setNewDescription(e.target.value)}
                        placeholder="مثال: رسالة للعميل عند إنشاء طلب جديد"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label>الجهة المستهدفة</Label>
                      <Select value={newAudience} onValueChange={setNewAudience}>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الجهة" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="client">العميل</SelectItem>
                          <SelectItem value="freelancer">الفريلانسر</SelectItem>
                          <SelectItem value="admin">الأدمن</SelectItem>
                          <SelectItem value="all">الجميع</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label>المتغيرات (اختياري) مفصولة بفاصلة</Label>
                      <Input
                        value={newVariables}
                        onChange={(e) => setNewVariables(e.target.value)}
                        placeholder="مثال: client_name,request_number,request_title,order_total"
                      />
                      <p className="text-xs text-muted-foreground">
                        اكتب أسماء المتغيرات كما سيتم تمريرها من الأكشن، ويمكنك استخدامها داخل النص بين أقواس {'{'}{'}'} مثل {'{client_name}'}.
                      </p>
                    </div>

                    <div className="space-y-1">
                      <Label>نص الرسالة</Label>
                      <Textarea
                        value={newTemplate}
                        onChange={(e) => setNewTemplate(e.target.value)}
                        rows={6}
                        className="font-mono text-sm"
                        dir="auto"
                        placeholder="مثال: مرحباً {client_name}، تم استلام طلبك رقم {request_number} بقيمة {order_total} ج.م"
                      />
                      <p className="text-xs text-muted-foreground">
                        يدعم تنسيق HTML والمتغيرات الديناميكية باستخدام الأقواس {'{...}'}. يمكنك دمج أي بيانات من النظام يتم تمريرها من الأكشن.
                      </p>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowNewMessageDialog(false)}
                      >
                        إلغاء
                      </Button>
                      <Button
                        onClick={() => createBotMessageMutation.mutate()}
                        disabled={
                          createBotMessageMutation.isPending ||
                          !newMessageKey.trim() ||
                          !newTemplate.trim()
                        }
                      >
                        {createBotMessageMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        حفظ الرسالة
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Variables Tab */}
        <TabsContent value="variables">
          <div className="card-elevated p-6 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Table className="w-5 h-5" />
                جدول المتغيرات المتاحة
              </h3>
            </div>
            <p className="text-sm text-muted-foreground">
              هذا الجدول يوضح جميع المتغيرات التي يمكن استخدامها داخل تمبلت رسائل البوت،
              مقسمة حسب نوع المستخدم (عميل، فريلانسر، أدمن، أو للجميع).
            </p>
            {loadingTemplateVariables ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : (
              <TemplateVariablesTable variables={templateVariables || []} />
            )}
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <div className="space-y-6">
            {/* Admin Telegram Link */}
            <TelegramLinkCard userType="admin" />

            {/* Required Secrets */}
            <div className="card-elevated p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                المفاتيح المطلوبة
              </h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4 text-muted-foreground" />
                    <code className="text-sm">TELEGRAM_BOT_TOKEN</code>
                  </div>
                  <Badge variant={botInfo ? "default" : "destructive"}>
                    {botInfo ? "مُضاف" : "مطلوب"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4 text-muted-foreground" />
                    <code className="text-sm">TELEGRAM_ADMIN_USER_ID</code>
                  </div>
                  <Badge variant="default">مُضاف ✓</Badge>
                </div>
              </div>

              <p className="text-sm text-muted-foreground mt-4">
                احصل على توكن البوت من <a href="https://t.me/BotFather" target="_blank" className="text-primary hover:underline">@BotFather</a> على تليجرام.
              </p>
            </div>

            {/* Bot Commands */}
            <div className="card-elevated p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                أوامر البوت
              </h3>

              <div className="space-y-2">
                {[
                  { cmd: "/start", desc: "بدء المحادثة وعرض التعليمات" },
                  { cmd: "/link الكود", desc: "ربط الحساب بالمنصة" },
                  { cmd: "/unlink", desc: "فصل ربط الحساب" },
                  { cmd: "/status", desc: "عرض حالة الربط" },
                  { cmd: "/help", desc: "عرض المساعدة" },
                  { cmd: "/stats", desc: "إحصائيات المنصة (للأدمن)" },
                  { cmd: "/pending", desc: "الطلبات المعلقة (للأدمن)" },
                  { cmd: "/findorder", desc: "البحث عن طلب (للأدمن)" },
                ].map((item) => (
                  <div key={item.cmd} className="flex items-center gap-3 p-2 rounded">
                    <code className="bg-muted px-2 py-1 rounded text-sm font-mono min-w-[120px]">
                      {item.cmd}
                    </code>
                    <span className="text-sm text-muted-foreground">{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}