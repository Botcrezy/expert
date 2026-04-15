import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Loader2, ExternalLink, CheckCircle2 } from "lucide-react";

interface GeneratedRequest {
  title: string;
  description: string;
  budget: number;
  size: string;
  category_name: string;
  examples: string[];
}

export default function AdminAIRequests() {
  const { toast } = useToast();
  const [count, setCount] = useState("4");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GeneratedRequest[]>([]);
  const [published, setPublished] = useState(false);

  const generateRequests = async () => {
    setLoading(true);
    setResults([]);
    setPublished(false);
    try {
      const { data, error } = await supabase.functions.invoke("generate-fake-requests", {
        body: { count: parseInt(count) },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResults(data.requests || []);
      setPublished(true);
      toast({ title: `تم توليد ${data.requests?.length || 0} عروض ونشرها بنجاح ✅` });
    } catch (e: any) {
      toast({ title: "خطأ في التوليد", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const sizeLabels: Record<string, string> = {
    micro: "صغيرة جداً",
    small: "صغيرة",
    medium: "متوسطة",
    large: "كبيرة",
  };

  return (
    <DashboardLayout sidebar={<AdminSidebar />} title="مولد العروض بالذكاء الاصطناعي">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              توليد عروض Marketplace
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              يقوم الذكاء الاصطناعي بتوليد عروض واقعية بتفاصيل وأسعار مختلفة (6,000 - 14,000 ج.م) وينشرها مباشرة في الماركت بلايس.
            </p>
            <div className="flex items-center gap-4">
              <div className="w-32">
                <Select value={count} onValueChange={setCount}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n} عروض
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={generateRequests} disabled={loading} className="gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {loading ? "جاري التوليد..." : "توليد ونشر"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {results.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                العروض المولدة ({results.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {results.map((req, i) => (
                  <div key={i} className="p-4 rounded-lg border border-border bg-muted/30 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-foreground">{req.title}</h3>
                      <Badge variant="outline">{sizeLabels[req.size] || req.size}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{req.description}</p>
                    <div className="flex flex-wrap gap-3 text-sm">
                      <span className="font-semibold text-primary">{req.budget.toLocaleString("ar-EG")} ج.م</span>
                      <span className="text-muted-foreground">• {req.category_name}</span>
                    </div>
                    {req.examples && req.examples.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">أمثلة ومراجع:</p>
                        {req.examples.map((url, j) => (
                          <a
                            key={j}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            {url}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
