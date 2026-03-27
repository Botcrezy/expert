import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { 
  Users, 
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Star,
  ExternalLink
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useState } from "react";

export default function AdminFreelancers() {
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: freelancers, isLoading } = useQuery({
    queryKey: ["admin-freelancers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("freelancer_profiles")
        .select("*, profiles!freelancer_profiles_user_id_fkey(full_name, email, phone)")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ id, verified }: { id: string; verified: boolean }) => {
      const { error } = await supabase
        .from("freelancer_profiles")
        .update({ 
          is_verified: verified,
          verification_status: verified ? "approved" : "rejected"
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { verified }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-freelancers"] });
      toast({
        title: verified ? "تم قبول الفريلانسر ✅" : "تم رفض الفريلانسر",
      });
    },
  });

  const filteredFreelancers = freelancers?.filter(f => {
    const profile = f.profiles as any;
    return profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           profile?.email?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getStatusBadge = (status: string, isVerified: boolean) => {
    if (isVerified) {
      return { label: "مفعّل", class: "bg-success/10 text-success", icon: CheckCircle2 };
    }
    if (status === "rejected") {
      return { label: "مرفوض", class: "bg-destructive/10 text-destructive", icon: XCircle };
    }
    return { label: "قيد المراجعة", class: "bg-warning/10 text-warning", icon: Clock };
  };

  return (
    <DashboardLayout
      sidebar={<AdminSidebar />}
      title="إدارة الفريلانسرز"
      subtitle="مراجعة وإدارة حسابات الفريلانسرز"
    >
      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="بحث بالاسم أو البريد..."
            className="pr-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Freelancers Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array(6).fill(0).map((_, i) => (
            <div key={i} className="card-elevated p-6 animate-pulse">
              <div className="h-12 bg-muted rounded mb-4" />
              <div className="h-4 bg-muted rounded w-3/4 mb-2" />
              <div className="h-4 bg-muted rounded w-1/2" />
            </div>
          ))
        ) : filteredFreelancers && filteredFreelancers.length > 0 ? (
          filteredFreelancers.map((freelancer) => {
            const profile = freelancer.profiles as any;
            const status = getStatusBadge(freelancer.verification_status || "pending", freelancer.is_verified);
            const StatusIcon = status.icon;

            return (
              <div key={freelancer.id} className="card-elevated p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-lg font-semibold">
                      {profile?.full_name?.charAt(0) || "F"}
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">{profile?.full_name}</h4>
                      <p className="text-sm text-muted-foreground">{profile?.email}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.class}`}>
                    <StatusIcon className="w-3 h-3" />
                    {status.label}
                  </span>
                </div>

                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">المهام المكتملة</span>
                    <span className="font-medium">{freelancer.completed_tasks}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">التقييم</span>
                    <span className="font-medium flex items-center gap-1">
                      <Star className="w-4 h-4 text-warning fill-warning" />
                      {freelancer.rating || "0.0"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">السعر/ساعة</span>
                    <span className="font-medium">{freelancer.hourly_rate || "-"} ج.م</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">تاريخ التسجيل</span>
                    <span className="font-medium">
                      {format(new Date(freelancer.created_at), "dd MMM yyyy", { locale: ar })}
                    </span>
                  </div>
                </div>

                {freelancer.username && (
                  <a 
                    href={`/@${freelancer.username}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1 mb-4"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Portfolio
                  </a>
                )}

                <div className="flex gap-2">
                  <Button size="sm" variant="outline" asChild className="flex-1">
                    <Link to={`/admin/freelancers/${freelancer.user_id}`}>
                      عرض التفاصيل
                    </Link>
                  </Button>
                  {!freelancer.is_verified && freelancer.verification_status === "pending" && (
                    <>
                      <Button 
                        size="sm"
                        onClick={() => verifyMutation.mutate({ id: freelancer.id, verified: true })}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => verifyMutation.mutate({ id: freelancer.id, verified: false })}
                      >
                        <XCircle className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full text-center py-12">
            <Users className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground">لا يوجد فريلانسرز</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
