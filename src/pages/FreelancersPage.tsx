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
import { Star, Search, CheckCircle2, Briefcase, ExternalLink, Send, Image as ImageIcon, Trophy, Sparkles } from "lucide-react";
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
  const [starsFilter, setStarsFilter] = useState("all");

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

  const filteredFreelancers = freelancers
    .filter((f: any) => {
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

      const stars = f.stars || 0;
      const matchesStars =
        starsFilter === "all" ||
        (starsFilter === "2+" && stars >= 2) ||
        (starsFilter === "5+" && stars >= 5) ||
        (starsFilter === "10+" && stars >= 10) ||
        (starsFilter === "20+" && stars >= 20);

      return matchesSearch && matchesCategory && matchesStars;
    })
    .sort((a: any, b: any) => (b.stars || 0) - (a.stars || 0));

  const getStarTier = (stars: number) => {
    if (stars >= 30) return { label: "نخبة", color: "bg-amber-500 text-white" };
    if (stars >= 20) return { label: "خبير", color: "bg-primary text-primary-foreground" };
    if (stars >= 10) return { label: "متميز", color: "bg-emerald-600 text-white" };
    if (stars >= 5) return { label: "محترف", color: "bg-blue-600 text-white" };
    return null;
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="فريق الخبراء - المحترفون المتاحون"
        description="تصفح فريق الخبراء المتميزين واختر المحترف المناسب لمشروعك"
        path="/freelancers"
      />
      <DynamicNavbar />

      <main className="py-8 md:py-14">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center max-w-2xl mx-auto mb-6 md:mb-10">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4" />
              فريق من المحترفين المعتمدين
            </div>
            <h1 className="text-2xl md:text-4xl font-bold text-foreground mb-2 md:mb-3">فريق الخبراء</h1>
            <p className="text-muted-foreground text-sm md:text-base">
              اختر المحترف الأنسب لمشروعك من بين أفضل الخبراء المعتمدين
            </p>
          </div>

          {/* Filters */}
          <div className="max-w-3xl mx-auto mb-6 md:mb-10 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="ابحث عن اسم، مهارة أو تخصص..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-9 text-sm"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-40 text-sm">
                  <SelectValue placeholder="التصنيف" />
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
              <Select value={starsFilter} onValueChange={setStarsFilter}>
                <SelectTrigger className="w-full sm:w-36 text-sm">
                  <SelectValue placeholder="النجوم" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل المستويات</SelectItem>
                  <SelectItem value="2+">2+ ⭐</SelectItem>
                  <SelectItem value="5+">5+ ⭐</SelectItem>
                  <SelectItem value="10+">10+ ⭐</SelectItem>
                  <SelectItem value="20+">20+ ⭐</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Results count */}
            {!isLoading && (
              <p className="text-xs text-muted-foreground text-center">
                {filteredFreelancers.length} خبير متاح
              </p>
            )}
          </div>

          {/* Freelancers Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="h-28 w-full" />
                  <div className="p-4">
                    <Skeleton className="w-14 h-14 rounded-full mx-auto -mt-10 mb-3" />
                    <Skeleton className="h-4 w-24 mx-auto mb-2" />
                    <Skeleton className="h-3 w-full mb-3" />
                    <div className="flex gap-2 justify-center">
                      <Skeleton className="h-5 w-14" />
                      <Skeleton className="h-5 w-14" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : filteredFreelancers.length === 0 ? (
            <div className="text-center py-16">
              <Briefcase className="w-14 h-14 mx-auto mb-3 text-muted-foreground opacity-40" />
              <p className="text-muted-foreground text-sm">لا يوجد خبراء بهذه المعايير</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFreelancers.map((freelancer: any) => {
                const portfolio = getPortfolio(freelancer.user_id);
                const stars = freelancer.stars || 0;
                const tier = getStarTier(stars);
                return (
                  <Card
                    key={freelancer.id}
                    className="overflow-hidden group hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 flex flex-col border-border/60"
                  >
                    {/* Cover */}
                    <div className="h-24 md:h-28 relative overflow-hidden">
                      {portfolio?.cover_image ? (
                        <img
                          src={portfolio.cover_image}
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/25 via-primary/10 to-accent/20 flex items-center justify-center">
                          <ImageIcon className="w-6 h-6 text-muted-foreground/20" />
                        </div>
                      )}
                      {/* Star badge overlay */}
                      {stars > 0 && (
                        <div className="absolute top-2 left-2 flex items-center gap-1 bg-background/90 backdrop-blur-sm rounded-full px-2 py-0.5 text-xs font-bold shadow-sm">
                          <Trophy className="w-3 h-3 text-amber-500" />
                          <span>{stars}</span>
                        </div>
                      )}
                      {tier && (
                        <div className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${tier.color}`}>
                          {tier.label}
                        </div>
                      )}
                    </div>

                    <div className="p-4 pt-0 flex flex-col flex-1">
                      {/* Avatar */}
                      <Avatar className="w-14 h-14 mx-auto -mt-7 border-[3px] border-background shadow-md">
                        {freelancer.avatar_url ? (
                          <AvatarImage src={freelancer.avatar_url} alt={freelancer.full_name || "خبير"} />
                        ) : null}
                        <AvatarFallback className="text-lg font-bold bg-primary/10 text-primary">
                          {(freelancer.full_name || "X").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      {/* Name + Verified */}
                      <div className="text-center mt-1.5 mb-1">
                        <h3 className="font-semibold text-foreground text-sm leading-tight">
                          {freelancer.full_name || "خبير"}
                        </h3>
                        <div className="flex items-center justify-center gap-1 text-emerald-600 mt-0.5">
                          <CheckCircle2 className="w-3 h-3" />
                          <span className="text-[10px] font-medium">موثق</span>
                        </div>
                      </div>

                      {/* Experience */}
                      {freelancer.experience && (
                        <p className="text-center text-[10px] text-muted-foreground mb-1">
                          {freelancer.experience}
                        </p>
                      )}

                      {/* Bio */}
                      <p className="text-center text-muted-foreground text-xs mb-2 line-clamp-2 leading-relaxed">
                        {freelancer.bio || "خبير محترف"}
                      </p>

                      {/* Stats row */}
                      <div className="flex items-center justify-center gap-3 mb-2 text-xs">
                        <div className="flex items-center gap-0.5">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span className="font-semibold">{freelancer.rating || 0}</span>
                        </div>
                        <span className="text-muted-foreground/40">|</span>
                        <span className="text-muted-foreground">
                          {freelancer.completed_tasks || 0} مهمة
                        </span>
                      </div>

                      {/* Categories */}
                      {freelancer.categories && freelancer.categories.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-1 mb-2">
                          {freelancer.categories.slice(0, 2).map((catId: string) => (
                            <Badge key={catId} variant="secondary" className="text-[10px] px-1.5 py-0">
                              {getCategoryName(catId)}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Skills */}
                      {freelancer.skills && Array.isArray(freelancer.skills) && freelancer.skills.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-1 mb-3">
                          {(freelancer.skills as string[]).slice(0, 3).map((skill: string, i: number) => (
                            <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0 border-dashed">
                              {skill}
                            </Badge>
                          ))}
                          {freelancer.skills.length > 3 && (
                            <span className="text-[10px] text-muted-foreground">+{freelancer.skills.length - 3}</span>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="mt-auto flex gap-2 pt-1">
                        {(portfolio?.slug || freelancer.portfolio_slug) && (
                          <Button variant="outline" size="sm" className="flex-1 text-[11px] h-8" asChild>
                            <Link to={`/u/${portfolio?.slug || freelancer.portfolio_slug}`}>
                              <ExternalLink className="w-3 h-3 ml-1" />
                              البورتفوليو
                            </Link>
                          </Button>
                        )}
                        <Button size="sm" className="flex-1 text-[11px] h-8" asChild>
                          <Link to="/client/create-request">
                            <Send className="w-3 h-3 ml-1" />
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
