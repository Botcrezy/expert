import { useState } from "react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface FavoriteButtonProps {
  freelancerId: string;
  size?: "sm" | "default" | "icon";
  className?: string;
}

export function FavoriteButton({ freelancerId, size = "icon", className }: FavoriteButtonProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: isFavorite = false } = useQuery({
    queryKey: ["is-favorite", user?.id, freelancerId],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from("favorite_freelancers")
        .select("id")
        .eq("user_id", user.id)
        .eq("freelancer_id", freelancerId)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user,
  });

  const toggleMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("يجب تسجيل الدخول");
      if (isFavorite) {
        const { error } = await supabase
          .from("favorite_freelancers")
          .delete()
          .eq("user_id", user.id)
          .eq("freelancer_id", freelancerId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("favorite_freelancers")
          .insert({ user_id: user.id, freelancer_id: freelancerId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["is-favorite", user?.id, freelancerId] });
      queryClient.invalidateQueries({ queryKey: ["client-favorites"] });
      toast({ title: isFavorite ? "تمت الإزالة من المفضلة" : "تمت الإضافة للمفضلة" });
    },
  });

  if (!user) return null;

  return (
    <Button
      variant="ghost"
      size={size}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleMutation.mutate();
      }}
      disabled={toggleMutation.isPending}
      className={cn("hover:bg-red-50 dark:hover:bg-red-950/20", className)}
    >
      <Heart
        className={cn(
          "w-4 h-4 transition-colors",
          isFavorite ? "fill-red-500 text-red-500" : "text-muted-foreground"
        )}
      />
    </Button>
  );
}
