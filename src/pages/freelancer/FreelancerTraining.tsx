import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { FreelancerSidebar } from "@/components/layout/FreelancerSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { 
  GraduationCap, 
  Loader2, 
  Clock, 
  Star, 
  CheckCircle2, 
  XCircle,
  Play,
  Upload,
  Award,
  Trophy,
  FileText,
  File,
  Trash2,
  ExternalLink
} from "lucide-react";
import { parseGoogleDriveUrl } from "@/lib/googleDrive";

export default function FreelancerTraining() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [deliveryFiles, setDeliveryFiles] = useState<any[]>([]);
  const [driveLinkInput, setDriveLinkInput] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);

  // Fetch freelancer's categories
  const { data: freelancerProfile } = useQuery({
    queryKey: ["freelancer-categories", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("freelancer_profiles")
        .select("categories, stars, training_completed")
        .eq("user_id", user?.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: availableTasks, isLoading: tasksLoading } = useQuery({
    queryKey: ["available-training-tasks", user?.id, freelancerProfile?.categories],
    queryFn: async () => {
      const { data: myAssignments } = await supabase
        .from("training_assignments")
        .select("task_id")
        .eq("freelancer_id", user?.id);
      
      const assignedTaskIds = myAssignments?.map(a => a.task_id) || [];
      
      let query = supabase
        .from("training_tasks")
        .select("*")
        .eq("is_active", true)
         // Backward-compatible: some rows were created with 'freelancer', while the DB default is 'freelancers'
         .in("audience", ["freelancers", "freelancer", "all"])
        .eq("is_category_specific", true)
        .order("created_at", { ascending: false });
      
      if (assignedTaskIds.length > 0) {
        query = query.not("id", "in", `(${assignedTaskIds.join(",")})`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      const freelancerCategories = freelancerProfile?.categories || [];
      
       if (freelancerCategories.length > 0 && data) {
         return data.filter((task: any) => freelancerCategories.includes(task.category_id));
       }
      
      return data || [];
    },
    enabled: !!user && freelancerProfile !== undefined,
  });

  const { data: myAssignments } = useQuery({
    queryKey: ["my-training-assignments", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_assignments")
        .select(`*, training_tasks(*)`)
        .eq("freelancer_id", user?.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const profile = freelancerProfile;

  // File upload removed — all deliveries are now link-based

  const acceptTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from("training_assignments").insert({
        task_id: taskId,
        freelancer_id: user?.id,
        status: "accepted",
        started_at: new Date().toISOString()
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["available-training-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["my-training-assignments"] });
      toast({ title: "تم قبول المهمة! ✅", description: "ابدأ العمل الآن" });
    },
    onError: (error: any) => {
      toast({ title: "حدث خطأ", description: error.message, variant: "destructive" });
    }
  });

  const submitDeliveryMutation = useMutation({
    mutationFn: async ({
      assignmentId,
      notes,
      files,
      links,
    }: {
      assignmentId: string;
      notes: string;
      files: any[];
      links: string[];
    }) => {
      const { error } = await supabase
        .from("training_assignments")
        .update({ 
          status: "submitted",
          delivery_notes: notes,
          delivery_files: files,
          delivery_links: links,
          submitted_at: new Date().toISOString()
        })
        .eq("id", assignmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-training-assignments"] });
      toast({ title: "تم التسليم بنجاح! ✅", description: "سيتم مراجعة عملك قريباً" });
      setSelectedTask(null);
      setDeliveryNotes("");
      setDeliveryFiles([]);
      setDriveLinkInput("");
    },
    onError: (error: any) => {
      toast({ title: "حدث خطأ", description: error.message, variant: "destructive" });
    }
  });

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">سهلة</Badge>;
      case "medium":
        return <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">متوسطة</Badge>;
      case "hard":
        return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">صعبة</Badge>;
      default:
        return <Badge variant="outline">{difficulty}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "accepted":
        return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"><Play className="w-3 h-3 mr-1" />جاري العمل</Badge>;
      case "in_progress":
        return <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">قيد التنفيذ</Badge>;
      case "submitted":
        return <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"><Clock className="w-3 h-3 mr-1" />قيد المراجعة</Badge>;
      case "approved":
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"><CheckCircle2 className="w-3 h-3 mr-1" />معتمدة</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"><XCircle className="w-3 h-3 mr-1" />مرفوضة</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const inProgressAssignments = myAssignments?.filter((a: any) => 
    ["accepted", "in_progress"].includes(a.status)
  ) || [];

  const completedAssignments = myAssignments?.filter((a: any) => 
    ["submitted", "approved", "rejected"].includes(a.status)
  ) || [];

  const totalStars = profile?.stars || 0;
  const maxStars = 100;

  return (
    <DashboardLayout
      sidebar={<FreelancerSidebar />}
      title="المهام التدريبية"
      subtitle="أكمل المهام التدريبية لزيادة نجومك وفرص تعيينك"
    >
      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100/50 dark:from-yellow-900/20 dark:to-yellow-800/10 border-yellow-200 dark:border-yellow-800/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
              <Star className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="flex-1">
              <p className="text-2xl font-bold">{totalStars}</p>
              <p className="text-sm text-muted-foreground">نجومك</p>
              <Progress value={(totalStars / maxStars) * 100} className="h-1.5 mt-2" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/10 border-green-200 dark:border-green-800/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{profile?.training_completed || 0}</p>
              <p className="text-sm text-muted-foreground">مهام مكتملة</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10 border-blue-200 dark:border-blue-800/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{inProgressAssignments.length}</p>
              <p className="text-sm text-muted-foreground">قيد التنفيذ</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="available" className="space-y-6">
        <TabsList>
          <TabsTrigger value="available" className="gap-2">
            <GraduationCap className="w-4 h-4" />
            المتاحة ({availableTasks?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="inprogress" className="gap-2">
            <Play className="w-4 h-4" />
            جاري العمل ({inProgressAssignments.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-2">
            <Award className="w-4 h-4" />
            المكتملة ({completedAssignments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="available">
          {tasksLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : availableTasks && availableTasks.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {availableTasks.map((task: any) => (
                <Card key={task.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{task.title}</CardTitle>
                      {getDifficultyBadge(task.difficulty)}
                    </div>
                    <CardDescription>{task.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500" />
                        {task.stars_reward} نجمة
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        {task.deadline_hours} ساعة
                      </span>
                    </div>
                    <Button 
                      className="w-full"
                      onClick={() => acceptTaskMutation.mutate(task.id)}
                      disabled={acceptTaskMutation.isPending}
                    >
                      {acceptTaskMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin ml-2" />
                      ) : (
                        <Play className="w-4 h-4 ml-2" />
                      )}
                      قبول المهمة
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <GraduationCap className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">لا توجد مهام متاحة حالياً</h3>
              <p className="text-muted-foreground">تحقق لاحقاً للمهام الجديدة</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="inprogress">
          {inProgressAssignments.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {inProgressAssignments.map((assignment: any) => (
                <Card key={assignment.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{assignment.training_tasks?.title}</CardTitle>
                      {getStatusBadge(assignment.status)}
                    </div>
                    <CardDescription>{assignment.training_tasks?.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {assignment.training_tasks?.requirements && (
                      <div className="p-3 bg-muted rounded-lg text-sm">
                        <strong>المتطلبات:</strong>
                        <p className="mt-1">{assignment.training_tasks.requirements}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span>{assignment.training_tasks?.stars_reward} نجمة عند الإكمال</span>
                    </div>
                    <Button 
                      className="w-full"
                      onClick={() => {
                        setSelectedTask(assignment);
                        setDeliveryNotes("");
                        setDeliveryFiles([]);
                      }}
                    >
                      <Upload className="w-4 h-4 ml-2" />
                      تسليم العمل
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Play className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">لا توجد مهام جارية</h3>
              <p className="text-muted-foreground">اقبل مهمة من المتاحة لبدء العمل</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed">
          {completedAssignments.length > 0 ? (
            <div className="space-y-4">
              {completedAssignments.map((assignment: any) => (
                <Card key={assignment.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{assignment.training_tasks?.title}</h4>
                        <div className="mt-1">
                          {assignment.status === "approved" && (
                            <span className="text-green-600 dark:text-green-400 flex items-center gap-1 text-sm">
                              <Star className="w-4 h-4 fill-current" />
                              حصلت على {assignment.stars_earned} نجوم
                            </span>
                          )}
                          {assignment.status === "rejected" && assignment.admin_feedback && (
                            <span className="text-red-600 dark:text-red-400 text-sm">{assignment.admin_feedback}</span>
                          )}
                          {assignment.status === "submitted" && (
                            <span className="text-purple-600 dark:text-purple-400 text-sm">قيد المراجعة...</span>
                          )}
                        </div>
                        {assignment.delivery_files && assignment.delivery_files.length > 0 && (
                          <div className="flex items-center gap-2 mt-2">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {assignment.delivery_files.length} ملفات مرفقة
                            </span>
                          </div>
                        )}
                      </div>
                      {getStatusBadge(assignment.status)}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Award className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">لا توجد مهام مكتملة</h3>
              <p className="text-muted-foreground">أكمل المهام التدريبية لرؤيتها هنا</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Submit Delivery Dialog */}
      <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>تسليم المهمة: {selectedTask?.training_tasks?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {selectedTask?.training_tasks?.requirements && (
              <div className="p-3 bg-muted rounded-lg text-sm">
                <strong>المتطلبات:</strong>
                <p className="mt-1">{selectedTask.training_tasks.requirements}</p>
              </div>
            )}

            {selectedTask?.training_tasks?.submission_method === "gdrive" ? (
              <div className="space-y-2">
                <label className="text-sm font-medium">رابط Google Drive (عام) *</label>
                <Input
                  value={driveLinkInput}
                  onChange={(e) => setDriveLinkInput(e.target.value)}
                  placeholder="https://drive.google.com/file/d/.../view"
                  dir="ltr"
                />
                <p className="text-xs text-muted-foreground">
                  لازم يكون الرابط <strong>Anyone with the link can view</strong> علشان يتم فتحه في المراجعة.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium">روابط التسليم</label>
                <p className="text-xs text-muted-foreground mb-2">
                  أضف روابط Google Drive أو GitHub أو YouTube للتسليم. يجب أن تكون الروابط عامة.
                </p>
                <div className="space-y-3">
                  <Input
                    value={driveLinkInput}
                    onChange={(e) => setDriveLinkInput(e.target.value)}
                    placeholder="https://drive.google.com/... أو https://github.com/..."
                    dir="ltr"
                  />
                  <p className="text-xs text-muted-foreground">
                    ⚠️ يجب أن تكون جميع الروابط عامة أو قابلة للوصول من قبل فريق المراجعة
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">ملاحظات وتقرير التسليم *</label>
              <Textarea
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                placeholder="اشرح ما أنجزته بالتفصيل، الأدوات المستخدمة، والتحديات التي واجهتها..."
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedTask(null)}>
              إلغاء
            </Button>
            <Button 
              onClick={() => submitDeliveryMutation.mutate({
                assignmentId: selectedTask.id,
                notes: deliveryNotes,
                files: selectedTask?.training_tasks?.submission_method === "gdrive" ? [] : deliveryFiles,
                links: (() => {
                  if (selectedTask?.training_tasks?.submission_method !== "gdrive") return [];
                  const parsed = parseGoogleDriveUrl(driveLinkInput);
                  if (!parsed) return [];
                  return [parsed.normalizedUrl];
                })(),
              })}
              disabled={(() => {
                if (!deliveryNotes.trim() || submitDeliveryMutation.isPending) return true;
                if (selectedTask?.training_tasks?.submission_method === "gdrive") {
                  return !parseGoogleDriveUrl(driveLinkInput);
                }
                return false;
              })()}
            >
              {submitDeliveryMutation.isPending && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
              <Upload className="w-4 h-4 ml-2" />
              تسليم
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
