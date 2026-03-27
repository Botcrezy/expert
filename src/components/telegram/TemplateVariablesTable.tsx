import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

interface TemplateVariablesTableProps {
  variables: any[];
}

const audienceLabels: Record<string, string> = {
  client: "العميل",
  freelancer: "الفريلانسر",
  admin: "الأدمن",
  all: "الجميع",
};

export function TemplateVariablesTable({ variables }: TemplateVariablesTableProps) {
  const grouped = useMemo(() => {
    const byAudience: Record<string, Record<string, any[]>> = {};
    (variables || []).forEach((v: any) => {
      const audience = v.audience || "all";
      if (!byAudience[audience]) byAudience[audience] = {};
      if (!byAudience[audience][v.message_key]) byAudience[audience][v.message_key] = [];
      byAudience[audience][v.message_key].push(v);
    });
    return byAudience;
  }, [variables]);

  if (!variables || variables.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        لا توجد متغيرات معرفة بعد. يتم إنشاء المتغيرات تلقائياً من الهجرة الأخيرة ويمكنك توسيعها من قاعدة البيانات.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([audience, byKey]) => (
        <div key={audience} className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{audienceLabels[audience] || audience}</Badge>
            <span className="text-xs text-muted-foreground">
              متغيرات الرسائل لهذه الفئة
            </span>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-muted text-xs font-medium text-muted-foreground">
              <div className="col-span-3">مفتاح الرسالة (message_key)</div>
              <div className="col-span-3">اسم المتغير</div>
              <div className="col-span-4">الوصف</div>
              <div className="col-span-2">قيمة مثال</div>
            </div>
            {Object.entries(byKey).map(([messageKey, vars]) =>
              (vars as any[]).map((v, index) => (
                <div
                  key={v.id || `${messageKey}-${v.variable_name}-${index}`}
                  className="grid grid-cols-12 gap-2 px-3 py-2 text-xs border-t bg-background/60"
                >
                  <div className="col-span-3 font-mono">
                    <code className="bg-muted px-1 py-0.5 rounded inline-block">
                      {messageKey}
                    </code>
                  </div>
                  <div className="col-span-3 font-mono">
                    <code className="bg-muted px-1 py-0.5 rounded inline-block">
                      {`{${v.variable_name}}`}
                    </code>
                  </div>
                  <div className="col-span-4">
                    <span className="text-foreground text-[11px]">
                      {v.description}
                    </span>
                  </div>
                  <div className="col-span-2 font-mono text-[11px] text-muted-foreground truncate">
                    {v.sample_value}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ))}

      <div className="mt-4 p-3 rounded-lg bg-muted/60 text-xs text-muted-foreground space-y-1">
        <p>
          استخدم أسماء المتغيرات كما هي داخل تمبلت الرسائل بين أقواس {'{'}{'}'}،
          مثال: <code className="bg-background px-1 rounded">{"{request_number}"}</code>.
        </p>
        <p>
          يتم تمرير القيم من الأكشن في المنصة إلى البوت؛ هذا الجدول فقط لتوثيق كل المتغيرات
          وتوضيح الفروق بين العميل، الفريلانسر، والأدمن.
        </p>
      </div>
    </div>
  );
}
