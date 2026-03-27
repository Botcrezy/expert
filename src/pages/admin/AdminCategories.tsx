import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, ListTree, ListChecks } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface Category {
  id: string;
  name: string;
  name_ar: string;
  description: string | null;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
}

export default function AdminCategories() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    name_ar: "",
    description: "",
    parent_id: "",
    sort_order: 0,
  });

  const { data: categories, isLoading } = useQuery<Category[]>({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, name_ar, description, parent_id, sort_order, is_active")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data as Category[]) || [];
    },
  });

  const upsertCategory = useMutation({
    mutationFn: async () => {
      if (!form.name || !form.name_ar) {
        throw new Error("الاسمين العربي والإنجليزي مطلوبان");
      }

      const payload: Database["public"]["Tables"]["categories"]["Insert"] = {
        name: form.name,
        name_ar: form.name_ar,
        description: form.description || null,
        parent_id: form.parent_id || null,
        sort_order: form.sort_order || 0,
        is_active: true,
      };

      const { error } = await supabase.from("categories").insert([payload]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      toast({ title: "تم حفظ التخصص بنجاح" });
      setForm({ name: "", name_ar: "", description: "", parent_id: "", sort_order: 0 });
    },
    onError: (error: any) => {
      toast({ title: "حدث خطأ", description: error.message, variant: "destructive" });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async (category: Category) => {
      const { error } = await supabase
        .from("categories")
        .update({ is_active: !category.is_active })
        .eq("id", category.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    },
  });

  const parents = (categories || []).filter((c) => !c.parent_id);

  return (
    <DashboardLayout
      sidebar={<AdminSidebar />}
      title="التخصصات والتصنيفات"
      subtitle="إدارة التخصصات الرئيسية والفرعية للفريلانسرز"
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <ListTree className="w-5 h-5 text-primary" />
              <h2 className="font-semibold">قائمة التخصصات</h2>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : !categories || categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">لم يتم إضافة أي تخصصات بعد.</p>
          ) : (
            <div className="space-y-4 max-h-[520px] overflow-auto pr-1">
              {parents.map((parent) => (
                <div key={parent.id} className="border border-border rounded-xl p-4 space-y-3 bg-card/40">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{parent.name_ar}</p>
                      <p className="text-xs text-muted-foreground">{parent.name}</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>ترتيب: {parent.sort_order}</span>
                      <div className="flex items-center gap-1">
                        <span>{parent.is_active ? "مفعل" : "معطل"}</span>
                        <Switch
                          checked={parent.is_active}
                          onCheckedChange={() => toggleActive.mutate(parent)}
                        />
                      </div>
                    </div>
                  </div>

                  {parent.description && (
                    <p className="text-xs text-muted-foreground whitespace-pre-line">
                      {parent.description}
                    </p>
                  )}

                  <div className="mt-2 space-y-1">
                    {(categories || [])
                      .filter((c) => c.parent_id === parent.id)
                      .map((child) => (
                        <div
                          key={child.id}
                          className="flex items-center justify-between text-xs border border-dashed border-border/70 rounded-lg px-3 py-2 bg-background/60"
                        >
                          <div>
                            <p className="font-medium">{child.name_ar}</p>
                            <p className="text-[11px] text-muted-foreground">{child.name}</p>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            <span>ترتيب: {child.sort_order}</span>
                            <div className="flex items-center gap-1">
                              <span>{child.is_active ? "مفعل" : "معطل"}</span>
                              <Switch
                                checked={child.is_active}
                                onCheckedChange={() => toggleActive.mutate(child)}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <ListChecks className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">إضافة تخصص جديد</h2>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name_ar">الاسم بالعربية *</Label>
              <Input
                id="name_ar"
                value={form.name_ar}
                onChange={(e) => setForm((f) => ({ ...f, name_ar: e.target.value }))}
                placeholder="مثال: مطور مواقع"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">الاسم بالإنجليزية *</Label>
              <Input
                id="name"
                dir="ltr"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="مثال: Web Developer"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">وصف (اختياري)</Label>
              <Input
                id="description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="نبذة قصيرة عن هذا التخصص"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>يندرج تحت</Label>
                <Select
                  value={form.parent_id}
                  onValueChange={(value) =>
                    setForm((f) => ({ ...f, parent_id: value === "root" ? "" : value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="تخصص رئيسي" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="root">تخصص رئيسي</SelectItem>
                    {parents.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name_ar}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sort_order">الترتيب</Label>
                <Input
                  id="sort_order"
                  type="number"
                  dir="ltr"
                  value={form.sort_order}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, sort_order: Number(e.target.value) || 0 }))
                  }
                />
              </div>
            </div>

            <Button
              type="button"
              className="w-full"
              onClick={() => upsertCategory.mutate()}
              disabled={upsertCategory.isPending}
            >
              {upsertCategory.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin ml-2" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 ml-2" />
                  إضافة التخصص
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
