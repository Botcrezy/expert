import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Send,
  Loader2,
  MessageCircle,
  Shield,
  Image as ImageIcon,
  File,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface AdminChatBoxProps {
  requestId: string;
  className?: string;
}

export function AdminChatBox({ requestId, className }: AdminChatBoxProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Fetch messages
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["admin-chat-messages", requestId],
    queryFn: async () => {
      const { data: messagesData, error } = await supabase
        .from("messages")
        .select("*")
        .eq("request_id", requestId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      
      // Fetch sender profiles separately
      if (messagesData && messagesData.length > 0) {
        const senderIds = [...new Set(messagesData.map(m => m.sender_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url")
          .in("user_id", senderIds);
        
        return messagesData.map(msg => ({
          ...msg,
          profiles: profiles?.find(p => p.user_id === msg.sender_id)
        }));
      }
      
      return messagesData || [];
    },
    enabled: !!requestId,
    refetchInterval: 5000, // Poll every 5 seconds
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`admin-chat-${requestId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `request_id=eq.${requestId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-chat-messages", requestId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [requestId, queryClient]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      const { error } = await supabase.from("messages").insert({
        request_id: requestId,
        sender_id: user?.id,
        message,
        is_system: false
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ["admin-chat-messages", requestId] });
    },
    onError: (error: any) => {
      toast({ title: "خطأ في إرسال الرسالة", description: error.message, variant: "destructive" });
    }
  });

  const handleSend = () => {
    if (!newMessage.trim() || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate(newMessage.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return format(date, "h:mm a", { locale: ar });
    }
    return format(date, "d MMM, h:mm a", { locale: ar });
  };

  if (isLoading) {
    return (
      <div className={cn("card-elevated flex flex-col h-[400px]", className)}>
        <div className="flex items-center justify-center flex-1">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("card-elevated flex flex-col h-[400px]", className)}>
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Shield className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">محادثة الأدمن</h3>
          <p className="text-xs text-muted-foreground">
            {messages.length} رسالة
          </p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <MessageCircle className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">لا توجد رسائل بعد</p>
            <p className="text-sm text-muted-foreground/60">أرسل رسالة للتواصل</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message: any) => {
              const isOwn = message.sender_id === user?.id;
              const isSystem = message.is_system;
              
              if (isSystem) {
                return (
                  <div key={message.id} className="flex justify-center">
                    <div className="bg-muted/50 text-muted-foreground text-xs px-3 py-1.5 rounded-full">
                      {message.message}
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    isOwn ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  <Avatar className="w-8 h-8 shrink-0">
                    <AvatarImage src={message.profiles?.avatar_url || ""} />
                    <AvatarFallback className="text-xs">
                      {getInitials(message.profiles?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className={cn(
                    "flex flex-col max-w-[75%]",
                    isOwn ? "items-end" : "items-start"
                  )}>
                    <div className={cn(
                      "flex items-center gap-2 mb-1",
                      isOwn ? "flex-row-reverse" : "flex-row"
                    )}>
                      <span className="text-xs font-medium text-foreground">
                        {message.profiles?.full_name || "مستخدم"}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatMessageTime(message.created_at)}
                      </span>
                    </div>
                    
                    <div className={cn(
                      "px-4 py-2.5 rounded-2xl",
                      isOwn 
                        ? "bg-primary text-primary-foreground rounded-tr-sm" 
                        : "bg-muted text-foreground rounded-tl-sm"
                    )}>
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {message.message}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <div className="flex items-end gap-2">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="اكتب رسالتك هنا..."
            className="min-h-[44px] max-h-[120px] resize-none"
            rows={1}
          />
          <Button 
            onClick={handleSend} 
            disabled={!newMessage.trim() || sendMessageMutation.isPending}
            size="icon"
            className="shrink-0 h-11 w-11"
          >
            {sendMessageMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
