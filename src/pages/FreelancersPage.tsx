import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DynamicNavbar } from "@/components/layout/DynamicNavbar";
import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Star, Search, CheckCircle2, Briefcase, ExternalLink, Send, Image as ImageIcon } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { SEO } from "@/components/seo/SEO";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function FreelancersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [ratingFilter, setRatingFilter] = useState("all");

  const { data: freelancers = [], isLoading } = useQuery({
    queryKey: ["public-freelancers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("freelancer_public_profiles")
        .select("*")
        .eq("is_verified", true)
        .eq("is_available", true);

      if (error) throw error;
      return data || [];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories-for-freelancers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("id, name_ar")
        .eq("is_active", true);
      return data || [];
    },
  });

  // Fetch portfolio data (slug, project counts)
  const freelancerIds = freelancers.map((f: any) => f.user_id).filter(Boolean);
  const { data: portfolios = [] } = useQuery({
    queryKey: ["freelancer-portfolios-public", freelancerIds],
    queryFn: async () => {
      if (freelancerIds.length === 0) return [];
      const { data } = await supabase
        .from("freelancer_portfolios")
        .select("user_id, slug, cover_image")
        .eq("status", "published")
        .eq("is_public", true)
        .in("user_id", freelancerIds);
      return data || [];
    },
    enabled: freelancerIds.length > 0,
  });

  const getPortfolio = (userId: string) =>
    portfolios.find((p: any) => p.user_id === userId);

  const getCategoryName = (categoryId: string) => {
    const cat = categories.find((c: any) => c.id === categoryId);
    return cat?.name_ar || "غير محدد";
  };

  const filteredFreelancers = freelancers.filter((f: any) => {
    const name = f.full_name || "";
    const bio = f.bio || "";
    const skills = JSON.stringify(f.skills || []);
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      name.toLowerCase().includes(term) ||
      bio.toLowerCase().includes(term) ||
      skills.toLowerCase().includes(term);

    const matchesCategory =
      categoryFilter === "all" ||
      (f.categories && f.categories.includes(categoryFilter));

    const matchesRating =
      ratingFilter === "all" ||
      (ratingFilter === "4+" && (f.rating || 0) >= 4) ||
      (ratingFilter === "3+" && (f.rating || 0) >= 3);

    return matchesSearch && matchesCategory && matchesRating;
  });

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="فريق الخبراء - المحترفون المتاحون"
        description="تصفح فريق الخبراء المتميزين واختر المحترف المناسب لمشروعك"
        path="/freelancers"
      />
      <DynamicNavbar />

      <main className="py-10 md:py-16">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center max-w-2xl mx-auto mb-8 md:mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3 md:mb-4">فريق الخبراء</h1>
            <p className="text-muted-foreground text-base md:text-lg">
              تصفح قائمة المحترفين المتميزين واختر الأنسب لمشروعك
            </p>
          </div>

          {/* Filters */}
          <div className="max-w-3xl mx-auto mb-8 md:mb-12 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="ابحث عن اسم، مهارة أو تخصص..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="كل التصنيفات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل التصنيفات</SelectItem>
                {categories.map((cat: any) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name_ar}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={ratingFilter} onValueChange={setRatingFilter}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="التقييم" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل التقييمات</SelectItem>
                <SelectItem value="4+">4+ نجوم</SelectItem>
                <SelectItem value="3+">3+ نجوم</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Freelancers Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="h-32 w-full" />
                  <div className="p-5">
                    <Skeleton className="w-16 h-16 rounded-full mx-auto -mt-12 mb-3" />
                    <Skeleton className="h-5 w-28 mx-auto mb-2" />
                    <Skeleton className="h-4 w-full mb-4" />
                    <div className="flex gap-2 justify-center">
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-6 w-16" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : filteredFreelancers.length === 0 ? (
            <div className="text-center py-16">
              <Briefcase className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">لا يوجد خبراء متاحون حالياً</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {filteredFreelancers.map((freelancer: any) => {
                const portfolio = getPortfolio(freelancer.user_id);
                return (
                  <Card key={freelancer.id} className="overflow-hidden hover:shadow-lg transition-shadow flex flex-col">
                    {/* Cover Image */}
                    <div className="h-28 md:h-32 bg-gradient-to-br from-primary/20 to-primary/5 relative">
                      {portfolio?.cover_image ? (
                        <img
                          src={portfolio.cover_image}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>

                    <div className="p-5 pt-0 flex flex-col flex-1">
                      {/* Avatar */}
                      <Avatar className="w-16 h-16 mx-auto -mt-8 border-4 border-background">
                        {freelancer.avatar_url ? (
                          <AvatarImage src={freelancer.avatar_url} alt={freelancer.full_name || "خبير"} />
                        ) : null}
                        <AvatarFallback className="text-xl font-bold bg-primary/10 text-primary">
                          {(freelancer.full_name || "X").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      {/* Name */}
                      {freelancer.full_name && (
                        <h3 className="text-center font-semibold text-foreground mt-2 mb-1 text-sm md:text-base">
                          {freelancer.full_name}
                        </h3>
                      )}

                      {/* Verified Badge */}
                      <div className="flex items-center justify-center gap-1 text-emerald-600 mb-2">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span className="text-xs font-medium">خبير موثق</span>
                      </div>

                      {/* Bio */}
                      <p className="text-center text-muted-foreground text-xs md:text-sm mb-3 line-clamp-2">
                        {freelancer.bio || "خبير محترف"}
                      </p>

                      {/* Stats */}
                      <div className="flex items-center justify-center gap-4 mb-3 text-xs md:text-sm">
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                          <span className="font-medium">{freelancer.rating || 0}</span>
                        </div>
                        <div className="text-muted-foreground">
                          {freelancer.completed_tasks || 0} مهمة مكتملة
                        </div>
                      </div>

                      {/* Categories */}
                      {freelancer.categories && freelancer.categories.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-1.5 mb-3">
                          {freelancer.categories.slice(0, 3).map((catId: string) => (
                            <Badge key={catId} variant="secondary" className="text-[10px] md:text-xs">
                              {getCategoryName(catId)}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Skills */}
                      {freelancer.skills && Array.isArray(freelancer.skills) && freelancer.skills.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-1 mb-4">
                          {(freelancer.skills as string[]).slice(0, 4).map((skill: string, i: number) => (
                            <Badge key={i} variant="outline" className="text-[10px] md:text-xs">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="mt-auto flex flex-col sm:flex-row gap-2 pt-2">
                        {portfolio?.slug ? (
                          <Button variant="outline" size="sm" className="flex-1 text-xs" asChild>
                            <Link to={`/u/${portfolio.slug}`}>
                              <ExternalLink className="w-3.5 h-3.5 ml-1" />
                              عرض البورتفوليو
                            </Link>
                          </Button>
                        ) : freelancer.portfolio_slug ? (
                          <Button variant="outline" size="sm" className="flex-1 text-xs" asChild>
                            <Link to={`/u/${freelancer.portfolio_slug}`}>
                              <ExternalLink className="w-3.5 h-3.5 ml-1" />
                              عرض البورتفوليو
                            </Link>
                          </Button>
                        ) : null}
                        <Button size="sm" className="flex-1 text-xs" asChild>
                          <Link to="/client/create-request">
                            <Send className="w-3.5 h-3.5 ml-1" />
                            اطلب خدمة
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <DynamicFooter />
    </div>
  );
}
