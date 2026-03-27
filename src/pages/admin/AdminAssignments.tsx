import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Search, Loader2, UserCheck, Clock, CheckCircle, XCircle, ArrowRight, RefreshCcw } from "lucide-react";
import { Link } from "react-router-dom";

export default function AdminAssignments() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const queryClient = useQueryClient();

  const { data: assignments, isLoading } = useQuery({
    queryKey: ["admin-assignments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assignments")
        .select(`*, requests (id, title, request_number, status, credits_cost)`)
        .order("assigned_at", { ascending: false });

      if (error) throw error;

      // Fetch freelancer profiles separately
      const freelancerIds = [...new Set(data?.map((a) => a.freelancer_id) || [])];
      const { data: freelancerProfiles } = await supabase
        .from("freelancer_profiles")
        .select("user_id")
        .in("user_id", freelancerIds);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", freelancerIds);

      return data?.map((a) => ({
        ...a,
        freelancer_name: profiles?.find((p) => p.user_id === a.freelancer_id)?.full_name || "غير معروف",
      }));
    },
  });

  const reassignMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase.from("assignments").update({ is_active: false }).eq("id", assignmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-assignments"] });
      toast({ title: "تم إلغاء التعيين" });
    },
  });

  const filteredAssignments = assignments?.filter((a: any) => {
    const matchesSearch =
      a.requests?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.freelancer_name?.toLowerCase().includes(searchQuery.toLowerCase());

    const requestStatus = a.requests?.status;
    const isCancelled = requestStatus === "cancelled";
    const isCompleted = Boolean(a.completed_at) || requestStatus === "completed";
    const isActive = Boolean(a.is_active) && !isCancelled && !isCompleted;

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && isActive) ||
      (statusFilter === "completed" && isCompleted) ||
      (statusFilter === "cancelled" && isCancelled) ||
      (statusFilter === "inactive" && !a.is_active);

    return matchesSearch && matchesStatus;
  });

  const formatDate = (date: string | null | undefined) => {
    if (!date) return "غير محدد";
    try {
      const d = new Date(date);
      if (isNaN(d.getTime()) || d.getFullYear() > 2100 || d.getFullYear() < 1900) {
        return "تاريخ غير صالح";
      }
      return d.toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return "تاريخ غير صالح";
    }
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
        <h1 className="text-2xl font-bold">إدارة التعيينات</h1>
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="بحث..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pr-10" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="active">نشط</SelectItem>
              <SelectItem value="completed">مكتمل</SelectItem>
              <SelectItem value="cancelled">ملغي</SelectItem>
              <SelectItem value="inactive">غير نشط</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الطلب</TableHead>
                  <TableHead>الفريلانسر</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssignments?.map((assignment: any) => (
                  <TableRow key={assignment.id}>
                    <TableCell>
                      <Link to={`/admin/requests/${assignment.requests?.id}`} className="text-primary hover:underline">
                        #{assignment.requests?.request_number}
                      </Link>
                    </TableCell>
                    <TableCell>{assignment.freelancer_name}</TableCell>
                    <TableCell>{formatDate(assignment.assigned_at)}</TableCell>
                      <TableCell>
                        {assignment.requests?.status === "cancelled" ? (
                          <Badge variant="destructive">
                            <XCircle className="w-3 h-3 ml-1" />ملغي
                          </Badge>
                        ) : assignment.completed_at || assignment.requests?.status === "completed" ? (
                          <Badge className="bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 ml-1" />مكتمل</Badge>
                        ) : assignment.is_active ? (
                          <Badge><Clock className="w-3 h-3 ml-1" />نشط</Badge>
                        ) : (
                          <Badge variant="secondary"><XCircle className="w-3 h-3 ml-1" />غير نشط</Badge>
                        )}
                      </TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" asChild><Link to={`/admin/requests/${assignment.requests?.id}`}><ArrowRight className="w-4 h-4" /></Link></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
