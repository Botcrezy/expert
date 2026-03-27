import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FilePreview } from "@/components/files/FilePreview";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { 
  ClipboardCheck, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Star,
  Loader2,
  User,
  Award,
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
} from "lucide-react";

export default function AdminTrainingQC() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [feedback, setFeedback] = useState("");
  const [starsToAward, setStarsToAward] = useState(1);

  // Realtime subscriptions
  useRealtimeSubscription([
    { table: "training_assignments", queryKeys: [["training-qc-assignments"]] },
    { table: "freelancer_profiles", queryKeys: [["training-qc-profiles"]] },
  ]);

  // Fetch submitted training assignments
  const { data: assignments, isLoading } = useQuery({
    queryKey: ["training-qc-assignments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_assignments")
        .select("*, training_tasks(title, description, requirements, stars_reward, difficulty)")
        .in("status", ["submitted", "approved", "rejected"])
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      
      if (data && data.length > 0) {
        const freelancerIds = [...new Set(data.map(a => a.freelancer_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, email, avatar_url")
          .in("user_id", freelancerIds);
        
        const { data: freelancerProfiles } = await supabase
          .from("freelancer_profiles")
          .select("user_id, stars")
          .in("user_id", freelancerIds);
        
        return data.map(assignment => ({
          ...assignment,
          profile: profiles?.find(p => p.user_id === assignment.freelancer_id),
          freelancer_profile: freelancerProfiles?.find(p => p.user_id === assignment.freelancer_id),
        }));
      }
      
      return data || [];
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status, feedback, stars }: { 
      id: string; 
      status: "approved" | "rejected"; 
      feedback: string;
      stars: number;
    }) => {
      const assignment = assignments?.find(a => a.id === id);
      if (!assignment) throw new Error("Assignment not found");

      // Update assignment
      const { error } = await supabase
        .from("training_assignments")
        .update({ 
          status, 
          admin_feedback: feedback,
          stars_earned: status === "approved" ? stars : 0,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id
        })
        .eq("id", id);
      if (error) throw error;

      // If approved, update freelancer profile stars
      if (status === "approved") {
        const { data: profile } = await supabase
          .from("freelancer_profiles")
          .select("stars, training_completed")
          .eq("user_id", assignment.freelancer_id)
          .single();
        
        if (profile) {
          await supabase
            .from("freelancer_profiles")
            .update({ 
              stars: (profile.stars || 0) + stars,
              training_completed: (profile.training_completed || 0) + 1
            })
            .eq("user_id", assignment.freelancer_id);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-qc-assignments"] });
      toast({ title: "تم تقييم المهمة بنجاح! ✅" });
      setSelectedAssignment(null);
      setFeedback("");
    },
    onError: (error: any) => {
      toast({ title: "حدث خطأ", description: error.message, variant: "destructive" });
    },
  });

  const handleApprove = () => {
    if (!selectedAssignment) return;
    reviewMutation.mutate({
      id: selectedAssignment.id,
      status: "approved",
      feedback,
      stars: starsToAward,
    });
  };

  const handleReject = () => {
    if (!selectedAssignment) return;
    if (!feedback.trim()) {
      toast({ title: "يرجى إدخال سبب الرفض", variant: "destructive" });
      return;
    }
    reviewMutation.mutate({
      id: selectedAssignment.id,
      status: "rejected",
      feedback,
      stars: 0,
    });
  };

  const pendingReview = assignments?.filter(a => a.status === "submitted") || [];
  const approvedAssignments = assignments?.filter(a => a.status === "approved") || [];
  const rejectedAssignments = assignments?.filter(a => a.status === "rejected") || [];

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case "easy": return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">سهلة</Badge>;
      case "medium": return <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">متوسطة</Badge>;
      case "hard": return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">صعبة</Badge>;
      default: return <Badge variant="outline">{difficulty}</Badge>;
    }
  };

  const renderAssignmentCard = (assignment: any, showActions = true) => (
    <Card key={assignment.id} className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium">{assignment.profile?.full_name || "فريلانسر"}</h4>
              <p className="text-sm text-muted-foreground">{assignment.training_tasks?.title}</p>
              <div className="flex items-center gap-2 mt-2">
                {getDifficultyBadge(assignment.training_tasks?.difficulty)}
                <span className="flex items-center gap-1 text-sm">
                  <Star className="w-4 h-4 text-yellow-500" />
                  {assignment.training_tasks?.stars_reward}
                </span>
                {assignment.stars_earned > 0 && (
                  <Badge className="bg-yellow-100 text-yellow-700">
                    حصل على {assignment.stars_earned} نجمة
                  </Badge>
                )}
              </div>
              {assignment.submitted_at && (
                <p className="text-xs text-muted-foreground mt-2">
                  {format(new Date(assignment.submitted_at), "dd MMM yyyy HH:mm", { locale: ar })}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {assignment.status === "approved" && (
              <Badge className="bg-success/10 text-success"><CheckCircle2 className="w-3 h-3 mr-1" />مقبول</Badge>
            )}
            {assignment.status === "rejected" && (
              <Badge className="bg-destructive/10 text-destructive"><XCircle className="w-3 h-3 mr-1" />مرفوض</Badge>
            )}
            {showActions && assignment.status === "submitted" && (
              <Button 
                size="sm"
                onClick={() => {
                  setSelectedAssignment(assignment);
                  setFeedback("");
                  setStarsToAward(assignment.training_tasks?.stars_reward || 1);
                }}
              >
                <Award className="w-4 h-4" />
                تقييم
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <DashboardLayout sidebar={<AdminSidebar />} title="مراجعة المهام التدريبية">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      sidebar={<AdminSidebar />}
      title="مراجعة المهام التدريبية (QC)"
      subtitle="تقييم تسليمات الفريلانسرز ومنح النجوم"
    >
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="bg-warning/5 border-warning/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
              <Clock className="w-6 h-6 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingReview.length}</p>
              <p className="text-sm text-muted-foreground">في انتظار التقييم</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-success/5 border-success/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{approvedAssignments.length}</p>
              <p className="text-sm text-muted-foreground">مقبولة</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-destructive/5 border-destructive/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
              <XCircle className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">{rejectedAssignments.length}</p>
              <p className="text-sm text-muted-foreground">مرفوضة</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="w-4 h-4" />
            في الانتظار
            {pendingReview.length > 0 && (
              <Badge variant="destructive" className="mr-1">{pendingReview.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved" className="gap-2">
            <ThumbsUp className="w-4 h-4" />
            مقبولة ({approvedAssignments.length})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="gap-2">
            <ThumbsDown className="w-4 h-4" />
            مرفوضة ({rejectedAssignments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingReview.length > 0 ? (
            pendingReview.map(assignment => renderAssignmentCard(assignment))
          ) : (
            <div className="text-center py-16 border rounded-lg">
              <ClipboardCheck className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">لا توجد تسليمات في الانتظار</h3>
              <p className="text-muted-foreground">ستظهر هنا تسليمات الفريلانسرز للتقييم</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="approved" className="space-y-4">
          {approvedAssignments.length > 0 ? (
            approvedAssignments.map(assignment => renderAssignmentCard(assignment, false))
          ) : (
            <div className="text-center py-16 border rounded-lg">
              <CheckCircle2 className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">لا توجد تسليمات مقبولة</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4">
          {rejectedAssignments.length > 0 ? (
            rejectedAssignments.map(assignment => renderAssignmentCard(assignment, false))
          ) : (
            <div className="text-center py-16 border rounded-lg">
              <XCircle className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">لا توجد تسليمات مرفوضة</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      <Dialog open={!!selectedAssignment} onOpenChange={() => setSelectedAssignment(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>تقييم المهمة التدريبية</DialogTitle>
          </DialogHeader>
          {selectedAssignment && (
            <div className="space-y-6">
              {/* Assignment Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">الفريلانسر</p>
                  <p className="font-medium">{selectedAssignment.profile?.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">المهمة</p>
                  <p className="font-medium">{selectedAssignment.training_tasks?.title}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">النجوم الحالية</p>
                  <p className="font-medium flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500" />
                    {selectedAssignment.freelancer_profile?.stars || 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">تاريخ التسليم</p>
                  <p className="font-medium">
                    {selectedAssignment.submitted_at && format(new Date(selectedAssignment.submitted_at), "dd MMM yyyy HH:mm", { locale: ar })}
                  </p>
                </div>
              </div>

              {/* Task Requirements */}
              {selectedAssignment.training_tasks?.requirements && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">متطلبات المهمة</p>
                  <div className="p-3 bg-muted/30 rounded-lg text-sm">
                    {selectedAssignment.training_tasks.requirements}
                  </div>
                </div>
              )}

              {/* Freelancer Notes */}
              {selectedAssignment.delivery_notes && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">ملاحظات الفريلانسر</p>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    {selectedAssignment.delivery_notes}
                  </div>
                </div>
              )}

              {/* Files */}
              {(selectedAssignment.delivery_files as any[])?.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">الملفات المرفقة</p>
                  <FilePreview 
                    files={(selectedAssignment.delivery_files as any[]).map((f: any) => ({
                      name: f.name || 'ملف',
                      size: f.size,
                      type: f.type,
                      path: f.path || f.url
                    }))} 
                    bucket="training-files"
                    title="ملفات التسليم"
                  />
                </div>
              )}

              {/* Delivery Links (Google Drive) */}
              {(selectedAssignment.delivery_links as any[])?.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">روابط التسليم</p>
                  <div className="flex flex-wrap gap-2">
                    {(selectedAssignment.delivery_links as any[]).map((link: any, idx: number) => (
                      <a
                        key={idx}
                        href={String(link)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-background hover:bg-muted/50 text-sm"
                      >
                        <ExternalLink className="w-4 h-4" />
                        فتح الرابط
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Stars to Award */}
              <div className="flex items-center gap-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <Star className="w-8 h-8 text-yellow-500" />
                <div className="flex-1">
                  <Label>عدد النجوم المُمنوحة</Label>
                  <p className="text-sm text-muted-foreground">الحد الأقصى: {selectedAssignment.training_tasks?.stars_reward}</p>
                </div>
                <Input
                  type="number"
                  value={starsToAward}
                  onChange={(e) => setStarsToAward(Math.min(parseInt(e.target.value) || 0, selectedAssignment.training_tasks?.stars_reward || 1))}
                  className="w-24"
                  min={0}
                  max={selectedAssignment.training_tasks?.stars_reward}
                />
              </div>

              {/* Feedback */}
              <div>
                <Label>ملاحظات التقييم</Label>
                <Textarea
                  placeholder="أدخل ملاحظاتك هنا (مطلوب في حالة الرفض)..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={3}
                  className="mt-2"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  onClick={handleReject}
                  disabled={reviewMutation.isPending}
                >
                  <XCircle className="w-4 h-4" />
                  رفض
                </Button>
                <Button
                  className="flex-1 bg-success hover:bg-success/90"
                  onClick={handleApprove}
                  disabled={reviewMutation.isPending}
                >
                  {reviewMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  قبول ومنح {starsToAward} نجمة
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
