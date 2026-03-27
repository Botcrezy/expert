import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMessages, Message } from "@/hooks/useMessages";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Send, 
  Paperclip, 
  Image as ImageIcon, 
  File, 
  Loader2, 
  MessageCircle,
  X,
  Download
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface ChatBoxProps {
  requestId: string;
  className?: string;
  title?: string;
  disabled?: boolean;
  disabledMessage?: string;
}

export function ChatBox({
  requestId,
  className,
  title = "المحادثة",
  disabled = false,
  disabledMessage = "تم إغلاق المحادثة لهذه المهمة بعد اكتمالها.",
}: ChatBoxProps) {
  const { user } = useAuth();
  const { messages, loading, sending, sendMessage } = useMessages({ requestId, enabled: !disabled });
  const [newMessage, setNewMessage] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  const handleSend = async () => {
    if (disabled) return;
    if (!newMessage.trim() || sending) return;

    const messageText = newMessage;
    setNewMessage("");

    try {
      await sendMessage(messageText);
    } catch (error) {
      // Restore message on error
      setNewMessage(messageText);
    }
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

  const renderAttachments = (attachments: any) => {
    if (!attachments || !Array.isArray(attachments)) return null;
    
    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {attachments.map((file: any, index: number) => {
          const isImage = file.type?.startsWith("image/");
          
          return (
            <a
              key={index}
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "flex items-center gap-2 p-2 rounded-lg transition-colors",
                "bg-background/50 hover:bg-background border border-border/50"
              )}
            >
              {isImage ? (
                <ImageIcon className="w-4 h-4 text-primary" />
              ) : (
                <File className="w-4 h-4 text-muted-foreground" />
              )}
              <span className="text-xs truncate max-w-[120px]">{file.name}</span>
              <Download className="w-3 h-3 text-muted-foreground" />
            </a>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className={cn("card-elevated flex flex-col h-[500px]", className)}>
        <div className="flex items-center justify-center flex-1">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("card-elevated flex flex-col h-[500px]", className)}>
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <MessageCircle className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground">
            {messages.length} رسالة • المحادثة مع فريق المنصة
          </p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <MessageCircle className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">لا توجد رسائل بعد</p>
            <p className="text-sm text-muted-foreground/60">ابدأ المحادثة الآن</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => {
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
                    <AvatarImage src={message.sender?.avatar_url || ""} />
                    <AvatarFallback className="text-xs">
                      {getInitials(message.sender?.full_name)}
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
                        {message.sender?.full_name || "مستخدم"}
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
                      {renderAttachments(message.attachments)}
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
        {disabled ? (
          <div className="rounded-xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
            {disabledMessage}
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <Textarea
              ref={textareaRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="اكتب رسالتك هنا..."
              className="min-h-[44px] max-h-[120px] resize-none"
              rows={1}
            />
            <Button
              onClick={handleSend}
              disabled={!newMessage.trim() || sending}
              size="icon"
              className="shrink-0 h-11 w-11"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
