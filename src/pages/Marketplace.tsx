import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DynamicNavbar, FloatingNavBar } from "@/components/layout/DynamicNavbar";
import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Briefcase, Calendar, Layers, ArrowLeft, Users, DollarSign, Sparkles } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { SEO } from "@/components/seo/SEO";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Marketplace() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sizeFilter, setSizeFilter] = useState("all");

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["marketplace-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("requests")
        .select("id, title, description, category_id, size, created_at, credits_cost, deadline, estimated_budget")
        .eq("publish_mode", "marketplace")
        .eq("status", "submitted")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch proposal counts for all requests
  const requestIds = requests.map((r: any) => r.id);
  const { data: proposalCounts = {} } = useQuery({
    queryKey: ["marketplace-proposal-counts", requestIds],
    queryFn: async () => {
      if (requestIds.length === 0) return {};
      const { data } = await supabase
        .from("marketplace_proposals")
        .select("request_id")
        .in("request_id", requestIds);
      const counts: Record<string, number> = {};
      (data || []).forEach((p: any) => {
        counts[p.request_id] = (counts[p.request_id] || 0) + 1;
      });
      return counts;
    },
    enabled: requestIds.length > 0,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories-marketplace"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("id, name_ar, icon")
        .eq("is_active", true);
      return data || [];
    },
  });

  const getCategoryName = (categoryId: string) => {
    const cat = categories.find((c: any) => c.id === categoryId);
    return cat?.name_ar || "غير محدد";
  };

  const getSizeName = (size: string) => {
    const sizes: Record<string, string> = {
      micro: "صغيرة جداً",
      small: "صغيرة",
      medium: "متوسطة",
      large: "كبير",
    };
    return sizes[size] || size;
  };

  const filtered = requests.filter((r: any) => {
    const matchesSearch =
      !searchTerm ||
      r.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || r.category_id === categoryFilter;
    const matchesSize =
      sizeFilter === "all" || r.size === sizeFilter;
    return matchesSearch && matchesCategory && matchesSize;
  });

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="سوق المشاريع - مشاريع متاحة للتقديم"
        description="تصفح المشاريع المتاحة وقدّم عرضك كفريلانسر محترف"
        path="/marketplace"
      />
      <DynamicNavbar />
      <FloatingNavBar />

      <main className="py-8 md:py-14">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center max-w-2xl mx-auto mb-6 md:mb-10">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4" />
              مشاريع متاحة للتقديم
            </div>
            <h1 className="text-2xl md:text-4xl font-bold text-foreground mb-2">
              سوق المشاريع
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              تصفح المشاريع المتاحة وقدّم عرضك على ما يناسب خبراتك
            </p>
          </div>

          {/* Filters */}
          <div className="max-w-3xl mx-auto mb-6 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="ابحث عن مشروع..."
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
              <Select value={sizeFilter} onValueChange={setSizeFilter}>
                <SelectTrigger className="w-full sm:w-36 text-sm">
                  <SelectValue placeholder="الحجم" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الأحجام</SelectItem>
                  <SelectItem value="micro">صغيرة جداً</SelectItem>
                  <SelectItem value="small">صغيرة</SelectItem>
                  <SelectItem value="medium">متوسطة</SelectItem>
                  <SelectItem value="large">كبير</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {!isLoading && (
              <p className="text-xs text-muted-foreground text-center">
                {filtered.length} مشروع متاح
              </p>
            )}
          </div>

          {/* Results */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i}>
                  <CardHeader className="pb-3">
                    <Skeleton className="h-5 w-3/4" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                    <div className="flex gap-2">
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-5 w-16" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <Briefcase className="w-14 h-14 mx-auto mb-3 text-muted-foreground opacity-40" />
              <p className="text-muted-foreground text-sm mb-1">لا توجد مشاريع متاحة حالياً</p>
              <p className="text-xs text-muted-foreground">تحقق لاحقاً أو غيّر معايير البحث</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((request: any) => {
                const pCount = (proposalCounts as Record<string, number>)[request.id] || 0;
                return (
                  <Card
                    key={request.id}
                    className="hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex flex-col border-border/60"
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm line-clamp-2 leading-relaxed">
                        {request.title}
                      </CardTitle>
                      <div className="flex flex-wrap gap-1 mt-2">
                        <Badge variant="secondary" className="text-[10px]">
                          {getCategoryName(request.category_id)}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          <Layers className="w-2.5 h-2.5 ml-0.5" />
                          {getSizeName(request.size)}
                        </Badge>
                        {pCount > 0 && (
                          <Badge variant="outline" className="text-[10px]">
                            <Users className="w-2.5 h-2.5 ml-0.5" />
                            {pCount} عرض
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col pt-0">
                      {request.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
                          {request.description}
                        </p>
                      )}

                      {request.estimated_budget && (
                        <div className="flex items-center gap-1 text-xs text-emerald-600 font-semibold mb-2">
                          <DollarSign className="w-3 h-3" />
                          {Number(request.estimated_budget).toLocaleString("ar-EG")} ج.م
                        </div>
                      )}

                      <div className="mt-auto space-y-2">
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>
                              {formatDistanceToNow(new Date(request.created_at), {
                                addSuffix: true,
                                locale: ar,
                              })}
                            </span>
                          </div>
                          {request.deadline && (
                            <span>
                              التسليم: {new Date(request.deadline).toLocaleDateString("ar-EG")}
                            </span>
                          )}
                        </div>
                        <Button size="sm" className="w-full text-xs h-8" asChild>
                          <Link to={`/marketplace/${request.id}`}>
                            قدّم عرضك
                            <ArrowLeft className="w-3 h-3 mr-1" />
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
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
