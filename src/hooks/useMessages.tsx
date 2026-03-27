import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Json } from "@/integrations/supabase/types";

export interface Message {
  id: string;
  request_id: string;
  sender_id: string;
  message: string;
  attachments: Json | null;
  is_system: boolean;
  created_at: string;
  sender?: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface UseMessagesOptions {
  requestId: string;
  enabled?: boolean;
}

export function useMessages({ requestId, enabled = true }: UseMessagesOptions) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!requestId || !enabled) return;

    try {
      // First get messages
      const { data: messagesData, error: messagesError } = await supabase
        .from("messages")
        .select("*")
        .eq("request_id", requestId)
        .order("created_at", { ascending: true });

      if (messagesError) throw messagesError;

      // Get unique sender IDs
      const senderIds = [...new Set((messagesData || []).map(m => m.sender_id))];
      
      // Fetch profiles for senders
      let profilesMap: Record<string, { full_name: string; avatar_url: string | null }> = {};
      if (senderIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url")
          .in("user_id", senderIds);
        
        if (profilesData) {
          profilesMap = profilesData.reduce((acc, p) => {
            acc[p.user_id] = { full_name: p.full_name, avatar_url: p.avatar_url };
            return acc;
          }, {} as Record<string, { full_name: string; avatar_url: string | null }>);
        }
      }

      // Transform data to match our Message interface
      const transformedMessages: Message[] = (messagesData || []).map(msg => ({
        id: msg.id,
        request_id: msg.request_id,
        sender_id: msg.sender_id,
        message: msg.message,
        attachments: msg.attachments,
        is_system: msg.is_system,
        created_at: msg.created_at,
        sender: profilesMap[msg.sender_id],
      }));

      setMessages(transformedMessages);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  }, [requestId, enabled]);

  // Send message
  const sendMessage = useCallback(async (
    messageText: string, 
    attachments?: Array<{ name: string; url: string; type: string; size: number }>
  ) => {
    if (!user || !requestId || !messageText.trim()) return;

    setSending(true);
    
    try {
      const { data, error } = await supabase
        .from("messages")
        .insert({
          request_id: requestId,
          sender_id: user.id,
          message: messageText.trim(),
          attachments: attachments ? attachments as unknown as Json : null,
          is_system: false,
        })
        .select()
        .single();

      if (error) throw error;

      // Fetch sender profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("user_id", user.id)
        .single();

      // Add to local state immediately
      const newMessage: Message = {
        id: data.id,
        request_id: data.request_id,
        sender_id: data.sender_id,
        message: data.message,
        attachments: data.attachments,
        is_system: data.is_system,
        created_at: data.created_at,
        sender: profileData || undefined,
      };

      setMessages(prev => {
        // Avoid duplicates
        if (prev.some(m => m.id === newMessage.id)) return prev;
        return [...prev, newMessage];
      });

      return newMessage;
    } catch (error: any) {
      toast({
        title: "خطأ في إرسال الرسالة",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setSending(false);
    }
  }, [user, requestId, toast]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!requestId || !enabled) return;

    fetchMessages();

    const channel = supabase
      .channel(`messages-${requestId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `request_id=eq.${requestId}`,
        },
        async (payload) => {
          // Fetch sender profile
          const { data: profileData } = await supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("user_id", payload.new.sender_id)
            .single();

          const newMessage: Message = {
            id: payload.new.id as string,
            request_id: payload.new.request_id as string,
            sender_id: payload.new.sender_id as string,
            message: payload.new.message as string,
            attachments: payload.new.attachments as Json,
            is_system: payload.new.is_system as boolean,
            created_at: payload.new.created_at as string,
            sender: profileData || undefined,
          };

          setMessages(prev => {
            // Avoid duplicates
            if (prev.some(m => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [requestId, enabled, fetchMessages]);

  return {
    messages,
    loading,
    sending,
    sendMessage,
    refetch: fetchMessages,
  };
}
