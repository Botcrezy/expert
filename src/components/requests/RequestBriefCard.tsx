import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FilePreview } from "@/components/files/FilePreview";
import { FileText, Target } from "lucide-react";

export type RequestBrief = {
  id: string;
  request_id: string;
  client_id: string;
  brief_text: string;
  goals: any;
  files: any;
  created_at: string;
  updated_at: string;
};

function normalizeGoals(goals: any): string[] {
  if (!goals) return [];
  if (Array.isArray(goals)) {
    return goals
      .map((g) => {
        if (typeof g === "string") return g;
        if (g && typeof g === "object" && typeof g.text === "string") return g.text;
        return null;
      })
      .filter(Boolean) as string[];
  }
  return [];
}

function normalizeFiles(files: any): Array<{ name: string; size: number; type: string; url?: string; path?: string }> {
  if (!files) return [];
  if (!Array.isArray(files)) return [];
  return files
    .map((f: any) => ({
      name: f?.name || "ملف",
      size: Number(f?.size || 0),
      type: f?.type || "application/octet-stream",
      url: f?.url,
      path: f?.path,
    }))
    .filter((f) => !!(f.url || f.path));
}

export function RequestBriefCard({ brief }: { brief: RequestBrief }) {
  const goals = normalizeGoals(brief.goals);
  const files = normalizeFiles(brief.files);

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          تفاصيل التنفيذ (Brief)
          <Badge variant="secondary" className="mr-auto">
            اتفاق ثابت
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <p className="text-sm text-muted-foreground mb-1">الوصف</p>
          <p className="text-foreground whitespace-pre-wrap">{brief.brief_text}</p>
        </div>

        {goals.length > 0 && (
          <div>
            <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
              <Target className="w-4 h-4" />
              الأهداف
            </p>
            <div className="flex flex-wrap gap-2">
              {goals.map((g) => (
                <Badge key={g} variant="outline">
                  {g}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {files.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">ملفات مرفقة</p>
            <FilePreview files={files} bucket="request-files" title="ملفات الـ Brief" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
