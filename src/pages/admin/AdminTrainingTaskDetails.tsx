import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  ArrowRight,
  Loader2,
  Star,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Download,
  Mail,
  Phone,
  ExternalLink,
  Calendar,
  Award,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { getSignedUrlOrUrl } from "@/lib/storageFileAccess";

export default function AdminTrainingTaskDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [feedback, setFeedback] = useState("");
  const [starsAwarded, setStarsAwarded] = useState(0);

  const { data: task, isLoading: taskLoading } = useQuery({
    queryKey: ["training-task-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_tasks")
        .select("*, categories(name_ar)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: submissions, isLoading: submissionsLoading } = useQuery({
    queryKey: ["training-submissions", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_assignments")
        .select("*")
        .eq("task_id", id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Fetch profiles separately
      const freelancerIds = data.map((s) => s.freelancer_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", freelancerIds);

      const { data: freelancerProfiles } = await supabase
        .from("freelancer_profiles")
        .select("*")
        .in("user_id", freelancerIds);

      return data.map((s) => ({
        ...s,
        profile: profiles?.find((p) => p.user_id === s.freelancer_id),
        freelancerProfile: freelancerProfiles?.find((f) => f.user_id === s.freelancer_id),
      }));
    },
    enabled: !!id,
  });

  const reviewMutation = useMutation({
    mutationFn: async ({
      submissionId,
      approved,
      feedback,
      stars,
      freelancerId,
    }: {
      submissionId: string;
      approved: boolean;
      feedback: string;
      stars: number;
      freelancerId: string;
    }) => {
      // Update assignment
      const { error: updateError } = await supabase
        .from("training_assignments")
        .update({
          status: approved ? "approved" : "rejected",
          admin_feedback: feedback,
          stars_earned: approved ? stars : 0,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", submissionId);

      if (updateError) throw updateError;

      // Update freelancer profile
      if (approved && stars > 0) {
        const { data: currentProfile } = await supabase
          .from("freelancer_profiles")
          .select("stars, training_completed")
          .eq("user_id", freelancerId)
          .single();

        await supabase
          .from("freelancer_profiles")
          .update({
            stars: (currentProfile?.stars || 0) + stars,
            training_completed: (currentProfile?.training_completed || 0) + 1,
          })
          .eq("user_id", freelancerId);
      }
    },
    onSuccess: (_, { approved }) => {
      queryClient.invalidateQueries({ queryKey: ["training-submissions", id] });
      queryClient.invalidateQueries({ queryKey: ["training-task-detail", id] });
      toast({ title: approved ? "تمت الموافقة ✅" : "تم الرفض" });
      setSelectedSubmission(null);
      setFeedback("");
      setStarsAwarded(0);
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    },
  });

  const openAttachment = async (file: any) => {
    try {
      const bucket = (file?.bucket as string | undefined) || "training-files";
      const pathOrUrl = (file?.path as string | undefined) || (file?.url as string | undefined);
      if (!pathOrUrl) throw new Error("لا يوجد مسار/رابط للملف");

      // Important: don't trust stored signed URLs (they expire). Always resolve a fresh URL.
      const url = await getSignedUrlOrUrl({ bucket, pathOrUrl, expiresInSeconds: 60 * 60 });
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      toast({
        title: "تعذر فتح الملف",
        description: e.message,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "accepted":
        return <Badge className="bg-blue-100 text-blue-700">جاري العمل</Badge>;
      case "submitted":
        return <Badge className="bg-purple-100 text-purple-700">قيد المراجعة</Badge>;
      case "approved":
        return <Badge className="bg-green-100 text-green-700">معتمد</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-700">مرفوض</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return <Badge className="bg-green-100 text-green-700">سهلة</Badge>;
      case "medium":
        return <Badge className="bg-yellow-100 text-yellow-700">متوسطة</Badge>;
      case "hard":
        return <Badge className="bg-red-100 text-red-700">صعبة</Badge>;
      default:
        return <Badge variant="outline">{difficulty}</Badge>;
    }
  };

  const pendingSubmissions = submissions?.filter((s) => s.status === "submitted") || [];
  const reviewedSubmissions = submissions?.filter((s) => ["approved", "rejected"].includes(s.status)) || [];
  const inProgressSubmissions = submissions?.filter((s) => s.status === "accepted") || [];

  if (taskLoading) {
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
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/training")}>
            <ArrowRight className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{task?.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              {getDifficultyBadge(task?.difficulty)}
              <Badge variant="outline">
                <Star className="w-3 h-3 ml-1 text-yellow-500" />
                {task?.stars_reward} نجمة
              </Badge>
              <Badge variant={task?.is_active ? "secondary" : "outline"}>
                {task?.is_active ? "نشطة" : "معطلة"}
              </Badge>
            </div>
          </div>
        </div>

        {/* Task Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              تفاصيل المهمة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-1">الوصف</h4>
              <p className="text-muted-foreground">{task?.description}</p>
            </div>
            {task?.requirements && (
              <div>
                <h4 className="font-medium mb-1">المتطلبات</h4>
                <p className="text-muted-foreground whitespace-pre-wrap">{task?.requirements}</p>
              </div>
            )}
            <div className="flex items-center gap-6 text-sm">
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                المدة: {task?.deadline_hours} ساعة
              </span>
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                أنشئت: {task?.created_at && format(new Date(task.created_at), "dd MMM yyyy", { locale: ar })}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{submissions?.length || 0}</p>
              <p className="text-sm text-muted-foreground">إجمالي الطلبات</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-purple-600">{pendingSubmissions.length}</p>
              <p className="text-sm text-muted-foreground">قيد المراجعة</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">
                {reviewedSubmissions.filter((s) => s.status === "approved").length}
              </p>
              <p className="text-sm text-muted-foreground">معتمد</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{inProgressSubmissions.length}</p>
              <p className="text-sm text-muted-foreground">جاري العمل</p>
            </CardContent>
          </Card>
        </div>

        {/* Pending Reviews */}
        {pendingSubmissions.length > 0 && (
          <Card className="border-purple-200 bg-purple-50/50 dark:bg-purple-900/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-400">
                <AlertCircle className="w-5 h-5" />
                تسليمات في انتظار المراجعة ({pendingSubmissions.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {pendingSubmissions.map((submission: any) => (
                <div key={submission.id} className="p-4 bg-background rounded-lg border">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={submission.profile?.avatar_url} />
                        <AvatarFallback>{submission.profile?.full_name?.charAt(0) || "F"}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{submission.profile?.full_name}</p>
                        <p className="text-sm text-muted-foreground">{submission.profile?.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {getStatusBadge(submission.status)}
                          <span className="text-xs text-muted-foreground">
                            {submission.submitted_at &&
                              format(new Date(submission.submitted_at), "dd MMM yyyy HH:mm", { locale: ar })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button onClick={() => {
                      setSelectedSubmission(submission);
                      setStarsAwarded(task?.stars_reward || 0);
                    }}>
                      مراجعة
                    </Button>
                  </div>

                  {/* Delivery Content */}
                  {submission.delivery_notes && (
                    <div className="mt-4 p-3 bg-muted rounded-lg">
                      <p className="text-sm font-medium mb-1">ملاحظات التسليم:</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{submission.delivery_notes}</p>
                    </div>
                  )}

                  {/* Delivery Files */}
                  {submission.delivery_files && (submission.delivery_files as any[]).length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium mb-2">الملفات المرفقة:</p>
                      <div className="flex flex-wrap gap-2">
                        {(submission.delivery_files as any[]).map((file: any, idx: number) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => openAttachment(file)}
                            className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors text-sm"
                          >
                            <Download className="w-4 h-4" />
                            {file.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Delivery Links (Google Drive) */}
                  {(submission.delivery_links as any[])?.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium mb-2">روابط التسليم:</p>
                      <div className="flex flex-wrap gap-2">
                        {(submission.delivery_links as any[]).map((link: any, idx: number) => (
                          <a
                            key={idx}
                            href={String(link)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors text-sm"
                          >
                            <ExternalLink className="w-4 h-4" />
                            فتح الرابط
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* All Submissions */}
        <Card>
          <CardHeader>
            <CardTitle>جميع التسليمات</CardTitle>
            <CardDescription>عرض جميع تسليمات الفريلانسرز لهذه المهمة</CardDescription>
          </CardHeader>
          <CardContent>
            {submissionsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : submissions && submissions.length > 0 ? (
              <div className="space-y-4">
                {submissions.map((submission: any) => (
                  <div key={submission.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <Avatar>
                          <AvatarImage src={submission.profile?.avatar_url} />
                          <AvatarFallback>{submission.profile?.full_name?.charAt(0) || "F"}</AvatarFallback>
                        </Avatar>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{submission.profile?.full_name}</p>
                            {getStatusBadge(submission.status)}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {submission.profile?.email}
                            </span>
                            {submission.profile?.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {submission.profile?.phone}
                              </span>
                            )}
                          </div>
                          {submission.freelancerProfile && (
                            <div className="flex items-center gap-2 text-sm">
                              <Star className="w-4 h-4 text-yellow-500" />
                              <span>{submission.freelancerProfile.stars || 0} نجمة</span>
                              <span className="text-muted-foreground">•</span>
                              <span>{submission.freelancerProfile.completed_tasks || 0} مهمة</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-left">
                        {submission.status === "approved" && (
                          <div className="text-green-600 flex items-center gap-1">
                            <Award className="w-4 h-4" />
                            +{submission.stars_earned} نجوم
                          </div>
                        )}
                        {submission.status === "submitted" && (
                          <Button size="sm" onClick={() => {
                            setSelectedSubmission(submission);
                            setStarsAwarded(task?.stars_reward || 0);
                          }}>
                            مراجعة
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Show feedback for reviewed */}
                    {submission.admin_feedback && (
                      <div className="mt-3 p-3 bg-muted rounded-lg">
                        <p className="text-sm font-medium mb-1">ملاحظات المراجعة:</p>
                        <p className="text-sm text-muted-foreground">{submission.admin_feedback}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">لا توجد تسليمات بعد</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Review Dialog */}
      <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>مراجعة التسليم</DialogTitle>
          </DialogHeader>

          {selectedSubmission && (
            <div className="space-y-6">
              {/* Freelancer Info */}
              <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={selectedSubmission.profile?.avatar_url} />
                  <AvatarFallback className="text-lg">
                    {selectedSubmission.profile?.full_name?.charAt(0) || "F"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-lg">{selectedSubmission.profile?.full_name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedSubmission.profile?.email}</p>
                  {selectedSubmission.freelancerProfile && (
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-500" />
                        {selectedSubmission.freelancerProfile.stars || 0} نجمة
                      </Badge>
                    </div>
                  )}
                </div>
              </div>

              {/* Delivery Content */}
              {selectedSubmission.delivery_notes && (
                <div>
                  <h4 className="font-medium mb-2">ملاحظات التسليم</h4>
                  <p className="p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap">
                    {selectedSubmission.delivery_notes}
                  </p>
                </div>
              )}

              {/* Files */}
              {selectedSubmission.delivery_files && (selectedSubmission.delivery_files as any[]).length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">الملفات المرفقة</h4>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {(selectedSubmission.delivery_files as any[]).map((file: any, idx: number) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => openAttachment(file)}
                          className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted transition-colors text-left"
                        >
                          <Download className="w-5 h-5 text-primary" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{file.name}</p>
                            {typeof file.size === "number" && (
                              <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                            )}
                          </div>
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      ))}
                    </div>
                </div>
              )}

              <Separator />

              {/* Review Form */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">النجوم الممنوحة</label>
                  <Input
                    type="number"
                    min={0}
                    max={task?.stars_reward || 10}
                    value={starsAwarded}
                    onChange={(e) => setStarsAwarded(Number(e.target.value))}
                    className="w-32"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    الحد الأقصى: {task?.stars_reward} نجمة
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">ملاحظات للفريلانسر</label>
                  <Textarea
                    placeholder="اكتب ملاحظاتك هنا..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={4}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedSubmission(null)}>
                  إلغاء
                </Button>
                <Button
                  variant="destructive"
                  onClick={() =>
                    reviewMutation.mutate({
                      submissionId: selectedSubmission.id,
                      approved: false,
                      feedback,
                      stars: 0,
                      freelancerId: selectedSubmission.freelancer_id,
                    })
                  }
                  disabled={reviewMutation.isPending}
                >
                  <XCircle className="w-4 h-4 ml-2" />
                  رفض
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() =>
                    reviewMutation.mutate({
                      submissionId: selectedSubmission.id,
                      approved: true,
                      feedback,
                      stars: starsAwarded,
                      freelancerId: selectedSubmission.freelancer_id,
                    })
                  }
                  disabled={reviewMutation.isPending}
                >
                  {reviewMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin ml-2" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 ml-2" />
                  )}
                  موافقة ومنح {starsAwarded} نجمة
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
