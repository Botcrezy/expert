import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FileUploadAdvanced } from "@/components/ui/FileUploadAdvanced";
import { Plus, X, Loader2 } from "lucide-react";
import type { UploadedFile } from "@/hooks/useFileUpload";
import { useToast } from "@/hooks/use-toast";

type Props = {
  requestId: string;
  clientId: string;
  open: boolean;
  onSubmitted: () => void;
};

export function RequestBriefDialog({ requestId, clientId, open, onSubmitted }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [briefText, setBriefText] = useState("");
  const [goalInput, setGoalInput] = useState("");
  const [goals, setGoals] = useState<string[]>([]);
  const [files, setFiles] = useState<UploadedFile[]>([]);

  const canSubmit = useMemo(() => {
    return briefText.trim().length >= 10;
  }, [briefText]);

  const mutation = useMutation({
    mutationFn: async () => {
      const attachments = (files || [])
        .filter((f) => f.progress === 100 && !f.error)
        .map((f) => ({
          name: f.name,
          url: f.url,
          path: f.path,
          type: f.type,
          size: f.size,
        }));

      const { data, error } = await supabase
        .from("request_briefs")
        .upsert(
          {
            request_id: requestId,
            client_id: clientId,
            brief_text: briefText.trim(),
            goals,
            files: attachments,
          } as any,
          { onConflict: "request_id" }
        )
        .select("id")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["request-brief", requestId] });
      queryClient.invalidateQueries({ queryKey: ["request", requestId] });
      toast({ title: "تم إرسال تفاصيل التنفيذ ✓" });
      onSubmitted();
    },
    onError: (e: any) => {
      toast({ title: "تعذر إرسال التفاصيل", description: e.message, variant: "destructive" });
    },
  });

  const addGoal = () => {
    const g = goalInput.trim();
    if (!g) return;
    if (goals.includes(g)) {
      setGoalInput("");
      return;
    }
    setGoals((prev) => [...prev, g]);
    setGoalInput("");
  };

  const removeGoal = (g: string) => {
    setGoals((prev) => prev.filter((x) => x !== g));
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>أكمل تفاصيل تنفيذ الخدمة</DialogTitle>
          <DialogDescription>
            هذا الحقل إجباري بعد شراء الخدمة، وسيظهر للفريلانسر والإدارة لمراجعة الاتفاق.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">وصف المطلوب</p>
            <Textarea
              value={briefText}
              onChange={(e) => setBriefText(e.target.value)}
              placeholder="اكتب وصفًا واضحًا لما تحتاجه (المخرجات المطلوبة، الأسلوب، أمثلة إن وجدت...)"
              className="min-h-[140px]"
            />
            <p className="text-xs text-muted-foreground">على الأقل 10 أحرف.</p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">الأهداف (اختياري)</p>
            <div className="flex gap-2">
              <Input
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                placeholder="مثال: تصميم 3 بوستات متناسقة"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addGoal();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={addGoal}>
                <Plus className="w-4 h-4 ml-2" />
                إضافة
              </Button>
            </div>

            {goals.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {goals.map((g) => (
                  <Badge key={g} variant="secondary" className="gap-1">
                    {g}
                    <button type="button" onClick={() => removeGoal(g)} className="mr-1">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">ملفات (اختياري)</p>
            <FileUploadAdvanced
              folder={`request-briefs/${requestId}`}
              onFilesChange={(f) => setFiles(f)}
              maxFiles={10}
              maxSize={50}
            />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => mutation.mutate()} disabled={!canSubmit || mutation.isPending}>
            {mutation.isPending && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
            إرسال التفاصيل
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
