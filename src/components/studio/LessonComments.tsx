import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { MessageCircle, Send, Heart, HeartOff, Reply, Trash2, Loader2 } from "lucide-react";

interface LessonCommentsProps {
  lessonId: string;
  userType: "client" | "freelancer";
}

export function LessonComments({ lessonId, userType }: LessonCommentsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");

  // Fetch comments
  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["lesson-comments", lessonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lesson_comments")
        .select("*")
        .eq("lesson_id", lessonId)
        .order("created_at", { ascending: true });
      if (error) throw error;

      // Fetch user names
      const userIds = [...new Set(data.map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);
      
      return data.map(comment => ({
        ...comment,
        user_name: profileMap.get(comment.user_id) || "مستخدم",
      }));
    },
    enabled: !!lessonId,
  });

  // Fetch likes
  const { data: likes = [] } = useQuery({
    queryKey: ["lesson-likes", lessonId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lesson_likes")
        .select("*")
        .eq("lesson_id", lessonId);
      if (error) throw error;
      return data;
    },
    enabled: !!lessonId,
  });

  const userLiked = likes.some(l => l.user_id === user?.id);
  const likesCount = likes.length;

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async ({ content, parentId }: { content: string; parentId?: string }) => {
      const { error } = await supabase.from("lesson_comments").insert({
        lesson_id: lessonId,
        user_id: user?.id,
        user_type: userType,
        content,
        parent_id: parentId || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lesson-comments", lessonId] });
      setNewComment("");
      setReplyTo(null);
      setReplyContent("");
      toast({ title: "تم إضافة التعليق ✅" });
    },
    onError: () => {
      toast({ title: "حدث خطأ", variant: "destructive" });
    },
  });

  // Toggle like mutation
  const toggleLikeMutation = useMutation({
    mutationFn: async () => {
      if (userLiked) {
        const { error } = await supabase
          .from("lesson_likes")
          .delete()
          .eq("lesson_id", lessonId)
          .eq("user_id", user?.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("lesson_likes").insert({
          lesson_id: lessonId,
          user_id: user?.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lesson-likes", lessonId] });
    },
  });

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase.from("lesson_comments").delete().eq("id", commentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lesson-comments", lessonId] });
      toast({ title: "تم حذف التعليق" });
    },
  });

  const handleSubmitComment = () => {
    if (!newComment.trim()) return;
    addCommentMutation.mutate({ content: newComment.trim() });
  };

  const handleSubmitReply = (parentId: string) => {
    if (!replyContent.trim()) return;
    addCommentMutation.mutate({ content: replyContent.trim(), parentId });
  };

  // Group comments by parent
  const topLevelComments = comments.filter(c => !c.parent_id);
  const getReplies = (parentId: string) => comments.filter(c => c.parent_id === parentId);

  return (
    <div className="space-y-6">
      {/* Like Button */}
      <div className="flex items-center gap-4">
        <Button
          variant={userLiked ? "default" : "outline"}
          size="sm"
          onClick={() => toggleLikeMutation.mutate()}
          disabled={toggleLikeMutation.isPending}
          className="gap-2"
        >
          {userLiked ? <HeartOff className="w-4 h-4" /> : <Heart className="w-4 h-4" />}
          {userLiked ? "إلغاء الإعجاب" : "أعجبني"}
          <Badge variant="secondary" className="mr-1">{likesCount}</Badge>
        </Button>
      </div>

      {/* Add Comment */}
      <div className="flex gap-3">
        <Avatar className="w-10 h-10">
          <AvatarFallback>{user?.email?.[0]?.toUpperCase() || "U"}</AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-2">
          <Textarea
            placeholder="أضف تعليقك..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={2}
            className="resize-none"
          />
          <Button
            size="sm"
            onClick={handleSubmitComment}
            disabled={!newComment.trim() || addCommentMutation.isPending}
          >
            <Send className="w-4 h-4 ml-2" />
            إرسال
          </Button>
        </div>
      </div>

      {/* Comments List */}
      <div className="space-y-4">
        <h4 className="font-semibold flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          التعليقات ({comments.length})
        </h4>

        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : topLevelComments.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">لا توجد تعليقات بعد</p>
        ) : (
          topLevelComments.map((comment) => {
            const replies = getReplies(comment.id);
            
            return (
              <div key={comment.id} className="space-y-3">
                <div className="flex gap-3 p-4 bg-muted/50 rounded-xl">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback>
                      {comment.user_name?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{comment.user_name}</span>
                      {comment.is_admin_reply && (
                        <Badge variant="default" className="text-xs">الإدارة</Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(comment.created_at), "d MMM yyyy", { locale: ar })}
                      </span>
                    </div>
                    <p className="text-sm">{comment.content}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                      >
                        <Reply className="w-3 h-3 ml-1" />
                        رد
                      </Button>
                      {comment.user_id === user?.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-destructive"
                          onClick={() => deleteCommentMutation.mutate(comment.id)}
                        >
                          <Trash2 className="w-3 h-3 ml-1" />
                          حذف
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Reply Input */}
                {replyTo === comment.id && (
                  <div className="mr-12 flex gap-2">
                    <Textarea
                      placeholder="اكتب ردك..."
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      rows={2}
                      className="resize-none flex-1"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleSubmitReply(comment.id)}
                      disabled={!replyContent.trim()}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                {/* Replies */}
                {replies.length > 0 && (
                  <div className="mr-12 space-y-2">
                    {replies.map((reply) => (
                      <div key={reply.id} className="flex gap-3 p-3 bg-card rounded-lg border">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="text-xs">
                            {reply.user_name?.[0]?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{reply.user_name}</span>
                            {reply.is_admin_reply && (
                              <Badge variant="default" className="text-xs">الإدارة</Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(reply.created_at), "d MMM", { locale: ar })}
                            </span>
                          </div>
                          <p className="text-sm">{reply.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
