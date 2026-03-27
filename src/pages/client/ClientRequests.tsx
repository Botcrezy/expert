import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ClientSidebar } from "@/components/layout/ClientSidebar";
import { DataTable } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, FileText, Loader2, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ClientRequests() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const searchParams = new URLSearchParams(window.location.search);
  const paymentSuccess = searchParams.get("payment") === "success";
  const orderIdFromUrl = searchParams.get("order");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  // If coming from service purchase payment, poll until the request is created then open it.
  useEffect(() => {
    if (!user || !paymentSuccess || !orderIdFromUrl) return;

    let cancelled = false;
    let tries = 0;

    toast({
      title: "تم الدفع بنجاح",
      description: "بنجهز طلبك الآن...",
    });

    const tick = async () => {
      tries += 1;
      const { data, error } = await (supabase.from("requests") as any)
        .select("id")
        .eq("user_id", user.id)
        .eq("payment_order_id", orderIdFromUrl)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      if (!error && data?.id) {
        navigate(`/client/requests/${data.id}`, { replace: true });
        return;
      }

      // Stop after ~60s
      if (tries >= 20) return;
      setTimeout(tick, 3000);
    };

    tick();

    return () => {
      cancelled = true;
    };
  }, [user, paymentSuccess, orderIdFromUrl, navigate, toast]);

  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Fetch categories for filter
  const { data: categories = [] } = useQuery({
    queryKey: ["client-categories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("id, name_ar")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      return data || [];
    },
  });

  const { data: requests = [], isLoading, error: requestsError } = useQuery({
    queryKey: ["client-all-requests", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("requests")
        .select("*, categories(name_ar)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Error fetching requests:", error);
        throw new Error(error.message);
      }
      return data || [];
    },
    enabled: !!user,
  });

  // Show error if fetching failed
  if (requestsError) {
    console.error("Client requests error:", requestsError);
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Filter requests
  const filteredRequests = requests.filter((request) => {
    const matchesSearch = 
      request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.request_number.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      statusFilter === "all" || 
      (statusFilter === "active" && !["completed", "cancelled"].includes(request.status)) ||
      (statusFilter === "completed" && request.status === "completed") ||
      (statusFilter === "cancelled" && request.status === "cancelled");

    const matchesCategory =
      categoryFilter === "all" || request.category_id === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const activeCount = requests.filter(r => !["completed", "cancelled"].includes(r.status)).length;
  const completedCount = requests.filter(r => r.status === "completed").length;
  const cancelledCount = requests.filter(r => r.status === "cancelled").length;

  const columns: any[] = [
    {
      key: "request_number",
      header: "رقم الطلب",
      render: (item: any) => (
        <span className="font-mono text-sm text-muted-foreground">{item.request_number}</span>
      ),
    },
    {
      key: "title",
      header: "عنوان الطلب",
      render: (item: any) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <p className="font-medium text-foreground">{item.title}</p>
            <p className="text-xs text-muted-foreground">
              {(item.categories as { name_ar: string } | null)?.name_ar || "غير مصنف"}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "الحالة",
      render: (item: any) => (
        <StatusBadge status={item.status as "submitted" | "in_progress" | "completed"} />
      ),
    },
    {
      key: "credits_cost",
      header: "الكريديت",
      render: (item: any) => <span className="font-medium text-primary">{item.credits_cost}</span>,
    },
    {
      key: "created_at",
      header: "تاريخ الإنشاء",
      render: (item: any) => formatDate(item.created_at),
    },
    {
      key: "deadline",
      header: "الموعد النهائي",
      render: (item: any) => (item.deadline ? formatDate(item.deadline) : "-"),
    },
  ];

  return (
    <DashboardLayout
      sidebar={<ClientSidebar />}
      title="طلباتي"
      subtitle="تابع جميع طلباتك ومشاريعك"
    >
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card-elevated p-4 text-center">
          <p className="text-2xl font-bold text-primary">{activeCount}</p>
          <p className="text-sm text-muted-foreground">نشطة</p>
        </div>
        <div className="card-elevated p-4 text-center">
          <p className="text-2xl font-bold text-success">{completedCount}</p>
          <p className="text-sm text-muted-foreground">مكتملة</p>
        </div>
        <div className="card-elevated p-4 text-center">
          <p className="text-2xl font-bold text-muted-foreground">{cancelledCount}</p>
          <p className="text-sm text-muted-foreground">ملغية</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="بحث عن طلب..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10 w-full sm:w-64"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="active">نشطة</SelectItem>
              <SelectItem value="completed">مكتملة</SelectItem>
              <SelectItem value="cancelled">ملغية</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="التخصص" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل التخصصات</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name_ar}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button asChild>
          <Link to="/client/create-request">
            <PlusCircle className="w-4 h-4 ml-2" />
            طلب جديد
          </Link>
        </Button>
      </div>

      <div className="card-elevated">
        {isLoading ? (
          <div className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={filteredRequests}
            searchPlaceholder="ابحث عن طلب..."
            onRowClick={(item) => navigate(`/client/requests/${item.id}`)}
            emptyTitle="لا توجد طلبات"
            emptyDescription="ابدأ بإنشاء طلبك الأول"
          />
        )}
      </div>
    </DashboardLayout>
  );
}
