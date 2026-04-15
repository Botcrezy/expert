import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ClientSidebar } from "@/components/layout/ClientSidebar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Heart, Star, Loader2, UserCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { FavoriteButton } from "@/components/favorites/FavoriteButton";

export default function ClientFavorites() {
  const { user } = useAuth();

  const { data: favorites = [], isLoading } = useQuery({
    queryKey: ["client-favorites", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("favorite_freelancers")
        .select("*, profiles:freelancer_id(user_id, full_name, avatar_url, email), freelancer_profiles:freelancer_id(rating, stars, completed_tasks, is_verified, bio)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  return (
    <DashboardLayout
      sidebar={<ClientSidebar />}
      title="فريلانسرز مفضلين"
      subtitle="الفريلانسرز اللي حفظتهم للطلب المباشر"
    >
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : favorites.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Heart className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">لا توجد مفضلات بعد</h3>
            <p className="text-muted-foreground mb-4">
              تصفح الفريلانسرز وأضفهم للمفضلة لطلبهم بسهولة لاحقاً
            </p>
            <Link to="/freelancers">
              <Button>تصفح الفريلانسرز</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {favorites.map((fav: any) => {
            const profile = fav.profiles;
            const fp = fav.freelancer_profiles;
            const name = profile?.full_name || "فريلانسر";
            return (
              <Card key={fav.id} className="relative overflow-hidden">
                <CardContent className="p-5">
                  <div className="absolute top-3 left-3">
                    <FavoriteButton freelancerId={fav.freelancer_id} size="sm" />
                  </div>
                  <div className="flex flex-col items-center text-center">
                    <Avatar className="w-16 h-16 mb-3">
                      <AvatarFallback className="text-lg bg-primary/10 text-primary">
                        {name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <h3 className="font-semibold text-sm">{name}</h3>
                    {fp?.is_verified && (
                      <Badge variant="outline" className="mt-1 text-xs gap-1">
                        <UserCheck className="w-3 h-3" /> موثق
                      </Badge>
                    )}
                    <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                      {fp?.rating && (
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                          {fp.rating}
                        </span>
                      )}
                      <span>{fp?.completed_tasks || 0} مهمة</span>
                    </div>
                    <Link
                      to="/client/create-request"
                      state={{ preferredFreelancerId: fav.freelancer_id, preferredFreelancerName: name }}
                      className="w-full mt-4"
                    >
                      <Button size="sm" className="w-full" variant="outline">
                        طلب مباشر
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
