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
  Paperclip,
  Image as ImageIcon,
  File,
  Download,
  X,
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
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["admin-chat-messages", requestId],
    queryFn: async () => {
      const { data: messagesData, error } = await supabase
        .from("messages")
        .select("*")
        .eq("request_id", requestId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      
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
    refetchInterval: 5000,
  });

  useEffect(() => {
    const channel = supabase
      .channel(`admin-chat-${requestId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `request_id=eq.${requestId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["admin-chat-messages", requestId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [requestId, queryClient]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) scrollElement.scrollTop = scrollElement.scrollHeight;
    }
  }, [messages]);

  const uploadFiles = async (files: File[]) => {
    const uploaded: Array<{ name: string; url: string; type: string; size: number }> = [];
    for (const file of files) {
      const ext = file.name.split(".").pop();
      const path = `chat/${requestId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("request-files").upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("request-files").getPublicUrl(path);
      uploaded.push({ name: file.name, url: urlData.publicUrl, type: file.type, size: file.size });
    }
    return uploaded;
  };

  const sendMessageMutation = useMutation({
    mutationFn: async ({ message, attachments }: { message: string; attachments?: any[] }) => {
      const { error } = await supabase.from("messages").insert({
        request_id: requestId,
        sender_id: user?.id,
        message,
        attachments: attachments || null,
        is_system: false
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewMessage("");
      setPendingFiles([]);
      queryClient.invalidateQueries({ queryKey: ["admin-chat-messages", requestId] });
    },
    onError: (error: any) => {
      toast({ title: "خطأ في إرسال الرسالة", description: error.message, variant: "destructive" });
    }
  });

  const handleSend = async () => {
    if (!newMessage.trim() && pendingFiles.length === 0) return;
    if (sendMessageMutation.isPending || uploading) return;

    const messageText = newMessage || `📎 ${pendingFiles.length} ملف مرفق`;
    const filesToUpload = [...pendingFiles];

    try {
      let attachments: any[] | undefined;
      if (filesToUpload.length > 0) {
        setUploading(true);
        attachments = await uploadFiles(filesToUpload);
        setUploading(false);
      }
      sendMessageMutation.mutate({ message: messageText.trim(), attachments });
    } catch (err) {
      setUploading(false);
      toast({ title: "خطأ في رفع الملفات", variant: "destructive" });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const maxSize = 10 * 1024 * 1024;
    const valid = files.filter(f => {
      if (f.size > maxSize) { toast({ title: `الملف ${f.name} أكبر من 10MB`, variant: "destructive" }); return false; }
      return true;
    });
    setPendingFiles(prev => [...prev, ...valid]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePendingFile = (index: number) => setPendingFiles(prev => prev.filter((_, i) => i !== index));

  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) return format(date, "h:mm a", { locale: ar });
    return format(date, "d MMM, h:mm a", { locale: ar });
  };

  const renderAttachments = (attachments: any) => {
    if (!attachments || !Array.isArray(attachments)) return null;
    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {attachments.map((file: any, index: number) => {
          const isImage = file.type?.startsWith("image/");
          if (isImage) {
            return (
              <a key={index} href={file.url} target="_blank" rel="noopener noreferrer" className="block">
                <img src={file.url} alt={file.name} className="max-w-[200px] max-h-[150px] rounded-lg border border-border/50 object-cover" />
              </a>
            );
          }
          return (
            <a key={index} href={file.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 p-2 rounded-lg bg-background/50 hover:bg-background border border-border/50 transition-colors">
              <File className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs truncate max-w-[120px]">{file.name}</span>
              <Download className="w-3 h-3 text-muted-foreground" />
            </a>
          );
        })}
      </div>
    );
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
      <input ref={fileInputRef} type="file" multiple
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar,.psd,.ai,.fig,.sketch,.mp3,.mp4"
        className="hidden" onChange={handleFileSelect} />

      <div className="flex items-center gap-3 p-4 border-b border-border">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Shield className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">محادثة الأدمن</h3>
          <p className="text-xs text-muted-foreground">{messages.length} رسالة</p>
        </div>
      </div>

      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <MessageCircle className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">لا توجد رسائل بعد</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message: any) => {
              const isOwn = message.sender_id === user?.id;
              const isSystem = message.is_system;
              if (isSystem) {
                return (
                  <div key={message.id} className="flex justify-center">
                    <div className="bg-muted/50 text-muted-foreground text-xs px-3 py-1.5 rounded-full">{message.message}</div>
                  </div>
                );
              }
              return (
                <div key={message.id} className={cn("flex gap-3", isOwn ? "flex-row-reverse" : "flex-row")}>
                  <Avatar className="w-8 h-8 shrink-0">
                    <AvatarImage src={message.profiles?.avatar_url || ""} />
                    <AvatarFallback className="text-xs">{getInitials(message.profiles?.full_name)}</AvatarFallback>
                  </Avatar>
                  <div className={cn("flex flex-col max-w-[75%]", isOwn ? "items-end" : "items-start")}>
                    <div className={cn("flex items-center gap-2 mb-1", isOwn ? "flex-row-reverse" : "flex-row")}>
                      <span className="text-xs font-medium text-foreground">{message.profiles?.full_name || "مستخدم"}</span>
                      <span className="text-[10px] text-muted-foreground">{formatMessageTime(message.created_at)}</span>
                    </div>
                    <div className={cn("px-4 py-2.5 rounded-2xl",
                      isOwn ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted text-foreground rounded-tl-sm")}>
                      <p className="text-sm whitespace-pre-wrap break-words">{message.message}</p>
                      {renderAttachments(message.attachments)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {pendingFiles.length > 0 && (
        <div className="px-4 py-2 border-t border-border bg-muted/30">
          <div className="flex flex-wrap gap-2">
            {pendingFiles.map((file, index) => (
              <div key={index} className="flex items-center gap-1.5 bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs">
                {file.type.startsWith("image/") ? <ImageIcon className="w-3.5 h-3.5 text-primary" /> : <File className="w-3.5 h-3.5 text-muted-foreground" />}
                <span className="truncate max-w-[100px]">{file.name}</span>
                <button onClick={() => removePendingFile(index)} className="text-muted-foreground hover:text-destructive"><X className="w-3 h-3" /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-4 border-t border-border">
        <div className="flex items-end gap-2">
          <Button type="button" variant="ghost" size="icon" className="shrink-0 h-11 w-11"
            onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            <Paperclip className="w-4 h-4" />
          </Button>
          <Textarea value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={handleKeyDown}
            placeholder="اكتب رسالتك هنا..." className="min-h-[44px] max-h-[120px] resize-none" rows={1} />
          <Button onClick={handleSend}
            disabled={(!newMessage.trim() && pendingFiles.length === 0) || sendMessageMutation.isPending || uploading}
            size="icon" className="shrink-0 h-11 w-11">
            {sendMessageMutation.isPending || uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
