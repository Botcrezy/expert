import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DynamicNavbar } from "@/components/layout/DynamicNavbar";
import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, Search, CheckCircle2, Briefcase } from "lucide-react";
import { useState } from "react";
import { SEO } from "@/components/seo/SEO";

export default function FreelancersPage() {
  const [searchTerm, setSearchTerm] = useState("");

  // Use the secure view instead of the table
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

  // Fetch categories for display
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

  const getCategoryName = (categoryId: string) => {
    const cat = categories.find((c: any) => c.id === categoryId);
    return cat?.name_ar || "غير محدد";
  };

  const filteredFreelancers = freelancers.filter((f: any) => {
    const bio = f.bio || "";
    const skills = JSON.stringify(f.skills || []);
    return bio.toLowerCase().includes(searchTerm.toLowerCase()) ||
           skills.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="فريق الخبراء - المحترفون المتاحون"
        description="تصفح فريق الخبراء المتميزين واختر المحترف المناسب لمشروعك"
        path="/freelancers"
      />
      <DynamicNavbar />

      <main className="py-16">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h1 className="text-4xl font-bold text-foreground mb-4">فريق الخبراء</h1>
            <p className="text-muted-foreground text-lg">
              تصفح قائمة المحترفين المتميزين واختر الأنسب لمشروعك
            </p>
          </div>

          {/* Search */}
          <div className="max-w-md mx-auto mb-12">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="ابحث عن مهارة أو تخصص..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
          </div>

          {/* Freelancers Grid */}
          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="p-6">
                  <Skeleton className="w-20 h-20 rounded-full mx-auto mb-4" />
                  <Skeleton className="h-6 w-32 mx-auto mb-2" />
                  <Skeleton className="h-4 w-full mb-4" />
                  <div className="flex gap-2 justify-center">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-16" />
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
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredFreelancers.map((freelancer: any) => (
                <Card key={freelancer.id} className="p-6 hover:shadow-lg transition-shadow">
                  {/* Avatar - using display_id for anonymity */}
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl font-bold text-primary">
                      {freelancer.bio?.charAt(0)?.toUpperCase() || "X"}
                    </span>
                  </div>

                  {/* Verified Badge */}
                  <div className="flex items-center justify-center gap-1 text-emerald-600 mb-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-sm font-medium">خبير موثق</span>
                  </div>

                  {/* Bio - Safe to show */}
                  <p className="text-center text-muted-foreground text-sm mb-4 line-clamp-2">
                    {freelancer.bio || "خبير محترف"}
                  </p>

                  {/* Experience */}
                  {freelancer.experience && (
                    <p className="text-center text-xs text-muted-foreground mb-3">
                      {freelancer.experience}
                    </p>
                  )}

                  {/* Stats - Safe public data */}
                  <div className="flex items-center justify-center gap-4 mb-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">{freelancer.rating || 0}</span>
                    </div>
                    <div className="text-muted-foreground">
                      {freelancer.completed_tasks || 0} مهمة مكتملة
                    </div>
                  </div>

                  {/* Categories */}
                  {freelancer.categories && freelancer.categories.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-2 mb-4">
                      {freelancer.categories.slice(0, 3).map((catId: string) => (
                        <Badge key={catId} variant="secondary" className="text-xs">
                          {getCategoryName(catId)}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Skills - Safe to show */}
                  {freelancer.skills && Array.isArray(freelancer.skills) && freelancer.skills.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-1">
                      {(freelancer.skills as string[]).slice(0, 4).map((skill: string, i: number) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  )}
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