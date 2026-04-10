import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DynamicNavbar } from "@/components/layout/DynamicNavbar";
import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Briefcase, Calendar, Layers, ArrowLeft } from "lucide-react";
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

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["marketplace-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("requests")
        .select("id, title, description, category_id, size, created_at, credits_cost, deadline")
        .eq("publish_mode", "marketplace")
        .eq("status", "submitted")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
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
      micro: "مهمة صغيرة جداً",
      small: "مهمة صغيرة",
      medium: "مهمة متوسطة",
      large: "مشروع كبير",
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
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="الماركت بلايس - مشاريع متاحة للتقديم"
        description="تصفح المشاريع المتاحة وقدّم عرضك كفريلانسر محترف"
        path="/marketplace"
      />
      <DynamicNavbar />

      <main className="py-10 md:py-16">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center max-w-2xl mx-auto mb-8 md:mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
              الماركت بلايس
            </h1>
            <p className="text-muted-foreground text-base md:text-lg">
              تصفح المشاريع المتاحة وقدّم عرضك على المشاريع التي تناسب خبراتك
            </p>
          </div>

          {/* Filters */}
          <div className="max-w-2xl mx-auto mb-8 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="ابحث عن مشروع..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-48">
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
          </div>

          {/* Results */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-5 w-3/4" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                    <div className="flex gap-2">
                      <Skeleton className="h-6 w-20" />
                      <Skeleton className="h-6 w-20" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <Briefcase className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground text-lg mb-2">لا توجد مشاريع متاحة حالياً</p>
              <p className="text-sm text-muted-foreground">تحقق لاحقاً أو غيّر معايير البحث</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {filtered.map((request: any) => (
                <Card
                  key={request.id}
                  className="hover:shadow-lg transition-shadow flex flex-col"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base line-clamp-2">
                        {request.title}
                      </CardTitle>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        {getCategoryName(request.category_id)}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        <Layers className="w-3 h-3 ml-1" />
                        {getSizeName(request.size)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    {request.description && (
                      <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                        {request.description}
                      </p>
                    )}
                    <div className="mt-auto space-y-3">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>
                            {formatDistanceToNow(new Date(request.created_at), {
                              addSuffix: true,
                              locale: ar,
                            })}
                          </span>
                        </div>
                        {request.deadline && (
                          <span>
                            التسليم:{" "}
                            {new Date(request.deadline).toLocaleDateString("ar-EG")}
                          </span>
                        )}
                      </div>
                      <Button size="sm" className="w-full" asChild>
                        <Link to={`/marketplace/${request.id}`}>
                          قدّم عرضك
                          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <DynamicFooter />
    </div>
  );
}
