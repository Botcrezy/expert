import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { DataTable } from "@/components/ui/DataTable";
import {
  Eye, EyeOff, Flag, Ban, CheckCircle, XCircle, ExternalLink, Shield
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function AdminPortfolios() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedPortfolio, setSelectedPortfolio] = useState<any>(null);
  const [action, setAction] = useState<"approve" | "reject" | "hide" | "flag" | null>(null);

  // Fetch all portfolios
  const { data: portfolios = [], isLoading: _isLoading } = useQuery({
    queryKey: ["admin-portfolios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("freelancer_portfolios")
        .select(`
          *,
          profile:profiles!left(full_name, email, avatar_url),
          freelancer:freelancer_profiles!left(is_verified, completed_tasks, rating)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Stats
  const stats = {
    total: portfolios.length,
    published: portfolios.filter(p => p.status === "published").length,
    pending: portfolios.filter(p => p.status === "pending_review").length,
    draft: portfolios.filter(p => p.status === "draft").length,
  };

  // Update portfolio status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: string; reason?: string }) => {
      const updates: any = { status };
      
      if (status === "published") {
        updates.reviewed_at = new Date().toISOString();
      } else if (status === "hidden" && reason) {
        updates.rejection_reason = reason;
      }

      const { error } = await supabase
        .from("freelancer_portfolios")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-portfolios"] });
      toast.success("تم تحديث حالة البورتفوليو");
      setAction(null);
      setSelectedPortfolio(null);
    },
    onError: () => {
      toast.error("حدث خطأ أثناء التحديث");
    },
  });

  const handleAction = (portfolio: any, actionType: typeof action) => {
    setSelectedPortfolio(portfolio);
    setAction(actionType);
  };

  const confirmAction = () => {
    if (!selectedPortfolio || !action) return;

    let status = selectedPortfolio.status;
    let reason = "";

    switch (action) {
      case "approve":
        status = "published";
        break;
      case "reject":
        status = "draft";
        reason = "تم الرفض من قبل الإدارة";
        break;
      case "hide":
        status = "hidden";
        reason = "تم الإخفاء من قبل الإدارة";
        break;
    }

    updateStatusMutation.mutate({ id: selectedPortfolio.id, status, reason });
  };

  const columns = [
    {
      key: "profile.full_name",
      header: "الفريلانسر",
      render: (portfolio) => (
        <div className="flex items-center gap-3">
          <img
            src={portfolio.profile?.avatar_url || ""}
            alt=""
            className="w-10 h-10 rounded-full object-cover"
            onError={(e) => {
              e.currentTarget.src = "https://via.placeholder.com/40";
            }}
          />
          <div>
            <div className="font-medium">{portfolio.profile?.full_name}</div>
            <div className="text-sm text-muted-foreground">{portfolio.profile?.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: "slug",
      header: "الرابط",
      render: (portfolio) => (
        <div className="flex items-center gap-2">
          <code className="text-sm bg-muted px-2 py-1 rounded">
            /u/{portfolio.slug}
          </code>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => window.open(`/u/${portfolio.slug}`, "_blank")}
          >
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
    {
      key: "status",
      header: "الحالة",
      render: (portfolio) => {
        const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
          draft: { label: "مسودة", variant: "secondary" },
          pending_review: { label: "قيد المراجعة", variant: "outline" },
          published: { label: "منشور", variant: "default" },
          hidden: { label: "مخفي", variant: "destructive" },
        };
        const config = statusConfig[portfolio.status] || statusConfig.draft;
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      key: "is_public",
      header: "الظهور",
      render: (portfolio) => (
        <div className="flex items-center gap-2">
          {portfolio.is_public ? (
            <Eye className="w-4 h-4 text-green-600" />
          ) : (
            <EyeOff className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      ),
    },
    {
      key: "freelancer.is_verified",
      header: "موثق",
      render: (portfolio) => (
        portfolio.freelancer?.is_verified ? (
          <Shield className="w-5 h-5 text-blue-600" />
        ) : (
          <span className="text-muted-foreground">-</span>
        )
      ),
    },
    {
      key: "actions",
      header: "الإجراءات",
      className: "text-left",
      render: (portfolio) => (
        <div className="flex gap-1">
          {portfolio.status === "pending_review" && (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleAction(portfolio, "approve")}
                title="موافقة"
              >
                <CheckCircle className="w-4 h-4 text-green-600" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleAction(portfolio, "reject")}
                title="رفض"
              >
                <XCircle className="w-4 h-4 text-red-600" />
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleAction(portfolio, "hide")}
            title="إخفاء"
          >
            <Ban className="w-4 h-4 text-orange-600" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleAction(portfolio, "flag")}
            title="وضع علامة"
          >
            <Flag className="w-4 h-4 text-yellow-600" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout sidebar={<AdminSidebar />} title="إدارة البورتفوليوهات">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                الإجمالي
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                منشور
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats.published}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                قيد المراجعة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                مسودات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{stats.draft}</div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>كل البورتفوليوهات</CardTitle>
            <CardDescription>إدارة ومراجعة بورتفوليوهات الفريلانسرز</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Input
                placeholder="ابحث عن فريلانسر..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <DataTable
              columns={columns}
              data={portfolios}
              searchable={false}
              emptyTitle="لا توجد بورتفوليوهات"
              emptyDescription="لم يتم إنشاء أي بورتفوليوهات بعد"
            />
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!action} onOpenChange={() => setAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {action === "approve" && "الموافقة على البورتفوليو"}
              {action === "reject" && "رفض البورتفوليو"}
              {action === "hide" && "إخفاء البورتفوليو"}
              {action === "flag" && "وضع علامة على البورتفوليو"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {action === "approve" && "سيتم نشر البورتفوليو وإتاحته للعامة"}
              {action === "reject" && "سيتم رفض البورتفوليو وإرجاعه لحالة المسودة"}
              {action === "hide" && "سيتم إخفاء البورتفوليو من العرض العام"}
              {action === "flag" && "سيتم وضع علامة على البورتفوليو للمتابعة"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAction}>
              تأكيد
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}