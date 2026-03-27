import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Mail,
  Phone,
  Globe,
  Briefcase,
  Eye,
} from "lucide-react";

export default function AdminPendingFreelancers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFreelancer, setSelectedFreelancer] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const queryClient = useQueryClient();

  // Fetch categories for mapping
  const { data: categories } = useQuery({
    queryKey: ["all-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*");
      return data || [];
    },
  });

  const getCategoryName = (categoryId: string) => {
    const category = categories?.find((c: any) => c.id === categoryId);
    return category?.name_ar || categoryId;
  };

  const { data: freelancers, isLoading } = useQuery({
    queryKey: ["pending-freelancers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("freelancer_profiles")
        .select(`*`)
        .eq("verification_status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) return [];

      // Fetch profiles separately
      const userIds = data.map((f) => f.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", userIds);

      return data.map((f) => ({
        ...f,
        profile: profiles?.find((p) => p.user_id === f.user_id) || {
          full_name: "غير معروف",
          email: "غير متاح",
          phone: null,
          avatar_url: null,
        },
      }));
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ freelancerId, approved }: { freelancerId: string; approved: boolean }) => {
      const { error } = await supabase
        .from("freelancer_profiles")
        .update({
          is_verified: approved,
          verification_status: approved ? "approved" : "rejected",
        })
        .eq("id", freelancerId);

      if (error) throw error;
    },
    onSuccess: (_, { approved }) => {
      queryClient.invalidateQueries({ queryKey: ["pending-freelancers"] });
      toast({
        title: approved ? "تم القبول" : "تم الرفض",
        description: approved
          ? "تم قبول الفريلانسر بنجاح"
          : "تم رفض طلب الفريلانسر",
      });
      setSelectedFreelancer(null);
      setShowRejectDialog(false);
      setRejectReason("");
    },
  });

  const filteredFreelancers = freelancers?.filter((f: any) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      f.profile?.full_name?.toLowerCase().includes(searchLower) ||
      f.profile?.email?.toLowerCase().includes(searchLower)
    );
  });

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout sidebar={<AdminSidebar />}>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout sidebar={<AdminSidebar />}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">طلبات التحقق المعلقة</h1>
            <p className="text-muted-foreground">
              {filteredFreelancers?.length || 0} طلب في انتظار المراجعة
            </p>
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث بالاسم أو البريد..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
          </div>
        </div>

        {!filteredFreelancers?.length ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Clock className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">لا توجد طلبات معلقة</h3>
              <p className="text-muted-foreground">
                جميع طلبات التحقق تمت مراجعتها
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredFreelancers.map((freelancer: any) => (
                <Card key={freelancer.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-4">
                      <Avatar className="w-14 h-14">
                        <AvatarImage src={freelancer.profile?.avatar_url || ""} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {freelancer.profile?.full_name?.charAt(0) || "F"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate">
                          {freelancer.profile?.full_name || "غير معروف"}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground truncate">
                          {freelancer.profile?.email}
                        </p>
                        <Badge variant="secondary" className="mt-2">
                          <Clock className="w-3 h-3 ml-1" />
                          {formatDate(freelancer.created_at)}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {freelancer.bio && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {freelancer.bio}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2">
                      {freelancer.categories?.slice(0, 3).map((cat: string) => (
                        <Badge key={cat} variant="outline" className="text-xs">
                          {getCategoryName(cat)}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => setSelectedFreelancer(freelancer)}
                      >
                        <Eye className="w-4 h-4 ml-1" />
                        عرض
                      </Button>
                      <Button
                        size="sm"
                        variant="success"
                        className="flex-1"
                        onClick={() =>
                          verifyMutation.mutate({
                            freelancerId: freelancer.id,
                            approved: true,
                          })
                        }
                        loading={verifyMutation.isPending}
                      >
                        <CheckCircle2 className="w-4 h-4 ml-1" />
                        قبول
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setSelectedFreelancer(freelancer);
                          setShowRejectDialog(true);
                        }}
                      >
                        <XCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
            ))}
          </div>
        )}
      </div>

      {/* View Details Dialog */}
      <Dialog
        open={!!selectedFreelancer && !showRejectDialog}
        onOpenChange={() => setSelectedFreelancer(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>تفاصيل الفريلانسر</DialogTitle>
          </DialogHeader>

          {selectedFreelancer && (
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={selectedFreelancer.profile?.avatar_url || ""} />
                  <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                    {selectedFreelancer.profile?.full_name?.charAt(0) || "F"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-bold">
                    {selectedFreelancer.profile?.full_name}
                  </h3>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      {selectedFreelancer.profile?.email}
                    </span>
                    {selectedFreelancer.profile?.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-4 h-4" />
                        {selectedFreelancer.profile?.phone}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    نبذة شخصية
                  </h4>
                  <p className="text-muted-foreground text-sm">
                    {selectedFreelancer.bio || "لم يتم إضافة نبذة"}
                  </p>
                </div>

                {selectedFreelancer.portfolio_url && (
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      معرض الأعمال
                    </h4>
                    <a
                      href={selectedFreelancer.portfolio_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-sm"
                    >
                      {selectedFreelancer.portfolio_url}
                    </a>
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-semibold mb-2">التخصصات</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedFreelancer.categories?.length > 0 ? (
                    selectedFreelancer.categories.map((cat: string) => (
                      <Badge key={cat} variant="secondary">
                        {getCategoryName(cat)}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">لم يتم تحديد تخصصات</p>
                  )}
                </div>
              </div>

              {/* Experience */}
              {selectedFreelancer.experience && (
                <div>
                  <h4 className="font-semibold mb-2">الخبرة</h4>
                  <p className="text-muted-foreground text-sm bg-muted p-3 rounded-lg">
                    {selectedFreelancer.experience}
                  </p>
                </div>
              )}

              {/* Skills */}
              {selectedFreelancer.skills && (selectedFreelancer.skills as any)?.skills?.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">المهارات</h4>
                  <div className="flex flex-wrap gap-2">
                    {((selectedFreelancer.skills as any).skills || []).map((skill: string) => (
                      <Badge key={skill} variant="outline">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* LinkedIn */}
              {selectedFreelancer.linkedin_url && (
                <div className="p-3 bg-muted rounded-lg">
                  <span className="text-sm font-medium">LinkedIn</span>
                  <a
                    href={selectedFreelancer.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-sm block mt-1"
                  >
                    {selectedFreelancer.linkedin_url}
                  </a>
                </div>
              )}

              {/* GitHub */}
              {selectedFreelancer.github_url && (
                <div className="p-3 bg-muted rounded-lg">
                  <span className="text-sm font-medium">GitHub</span>
                  <a
                    href={selectedFreelancer.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-sm block mt-1"
                  >
                    {selectedFreelancer.github_url}
                  </a>
                </div>
              )}

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setSelectedFreelancer(null)}
                >
                  إغلاق
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setShowRejectDialog(true)}
                >
                  رفض
                </Button>
                <Button
                  variant="success"
                  onClick={() =>
                    verifyMutation.mutate({
                      freelancerId: selectedFreelancer.id,
                      approved: true,
                    })
                  }
                  loading={verifyMutation.isPending}
                >
                  قبول الفريلانسر
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>رفض طلب الفريلانسر</DialogTitle>
            <DialogDescription>
              يرجى إدخال سبب الرفض (اختياري)
            </DialogDescription>
          </DialogHeader>

          <Textarea
            placeholder="سبب الرفض..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false);
                setRejectReason("");
              }}
            >
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                selectedFreelancer &&
                verifyMutation.mutate({
                  freelancerId: selectedFreelancer.id,
                  approved: false,
                })
              }
              loading={verifyMutation.isPending}
            >
              تأكيد الرفض
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
