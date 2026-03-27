import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Send, Paperclip, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { FileUploadAdvanced } from "@/components/ui/FileUploadAdvanced";

interface Message {
  id: string;
  sender_id: string;
  sender_type: "client" | "freelancer" | "admin";
  message: string;
  attachments: any[] | null;
  created_at: string;
  is_read: boolean;
  sender?: {
    full_name: string;
  };
}

interface SupportChatBoxProps {
  conversationId: string;
  onClose?: () => void;
}

export function SupportChatBox({ conversationId, onClose }: SupportChatBoxProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [attachments, setAttachments] = useState<any[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
    
    // Subscribe to new messages
    const channel = supabase
      .channel(`support-conversation-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          fetchSenderProfile(payload.new as Message);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("support_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Fetch sender profiles
      const userIds = [...new Set(data.map(m => m.sender_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      const profilesMap = (profiles || []).reduce((acc, p) => {
        acc[p.user_id] = p;
        return acc;
      }, {} as Record<string, any>);

      setMessages(data.map(m => ({
        ...m,
        sender_type: (m.sender_type || "client") as "client" | "freelancer" | "admin",
        attachments: Array.isArray(m.attachments) ? m.attachments : (m.attachments ? [m.attachments] : []),
        sender: profilesMap[m.sender_id] || { full_name: "مستخدم" },
      })));
    } catch (error: any) {
      toast({
        title: "خطأ في تحميل الرسائل",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSenderProfile = async (message: Message) => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .eq("user_id", message.sender_id)
      .single();

    setMessages(prev => [
      ...prev,
      {
        ...message,
        sender_type: (message.sender_type || "client") as "client" | "freelancer" | "admin",
        attachments: Array.isArray(message.attachments) ? message.attachments : (message.attachments ? [message.attachments] : []),
        sender: profile || { full_name: "مستخدم" },
      },
    ]);
  };

  const handleSend = async () => {
    if (!newMessage.trim() && attachments.length === 0) return;
    if (!user) return;

    setSending(true);
    try {
      const senderType = user.app_metadata?.role || "client";

      const { error } = await supabase.from("support_messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        sender_type: senderType,
        message: newMessage.trim(),
        attachments: attachments.length > 0 ? attachments : null,
      });

      if (error) throw error;

      setNewMessage("");
      setAttachments([]);
      setShowUpload(false);
    } catch (error: any) {
      toast({
        title: "خطأ في إرسال الرسالة",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTime = (dateString: string) => {
    try {
      return format(new Date(dateString), "h:mm a", { locale: ar });
    } catch {
      return "";
    }
  };

  if (loading) {
    return (
      <Card className="h-[600px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </Card>
    );
  }

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="flex-shrink-0 border-b">
        <div className="flex items-center justify-between">
          <CardTitle>محادثة الدعم</CardTitle>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                لا توجد رسائل بعد. ابدأ المحادثة!
              </p>
            ) : (
              messages.map((msg) => {
                const isOwn = msg.sender_id === user?.id;
                const isAdmin = msg.sender_type === "admin";

                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${isOwn ? "flex-row-reverse" : ""}`}
                  >
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarFallback className={isAdmin ? "bg-primary text-primary-foreground" : ""}>
                        {getInitials(msg.sender?.full_name || "?")}
                      </AvatarFallback>
                    </Avatar>

                    <div className={`flex-1 ${isOwn ? "text-right" : ""}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-sm font-medium ${isAdmin ? "text-primary" : ""}`}>
                          {msg.sender?.full_name || "مستخدم"}
                        </span>
                        {isAdmin && (
                          <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                            إدارة
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatTime(msg.created_at)}
                        </span>
                      </div>

                      <div
                        className={`rounded-lg p-3 ${
                          isOwn
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {msg.message}
                        </p>
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {msg.attachments.map((file: any, idx: number) => (
                              <a
                                key={idx}
                                href={file.url || file.path}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs underline block"
                              >
                                📎 {file.name}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        <div className="flex-shrink-0 border-t p-4 space-y-2">
          {showUpload && (
            <div className="mb-2">
              <FileUploadAdvanced
                onFilesChange={(files) => setAttachments(files)}
                maxFiles={3}
                accept="image/*,.pdf,.doc,.docx"
                bucket="request-files"
              />
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowUpload(!showUpload)}
              disabled={sending}
            >
              <Paperclip className="w-4 h-4" />
            </Button>

            <Textarea
              placeholder="اكتب رسالتك..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              className="flex-1 min-h-[60px] max-h-[120px]"
              disabled={sending}
            />

            <Button onClick={handleSend} disabled={sending || (!newMessage.trim() && attachments.length === 0)}>
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
