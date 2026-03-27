import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Timeline } from "@/components/ui/Timeline";
import { FilePreview } from "@/components/files/FilePreview";
import { Loader2, Package, AlertCircle, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

export default function PublicRequestView() {
  const { token } = useParams<{ token: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ["public-request", token],
    queryFn: async () => {
      if (!token) return null;

      const { data, error } = await (supabase as any).rpc("get_public_request_view", {
        p_token: token,
      });

      if (error) throw error;

      if (!data) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token);
        if (isUuid) {
          throw new Error(
            "هذا رابط قديم أو لم يتم إنشاء رابط مشاركة لهذا الطلب بعد. افتح الطلب من داخل حسابك واضغط (مشاركة) لإنشاء رابط جديد."
          );
        }
        throw new Error("هذا الرابط غير صالح أو تم إلغاؤه");
      }

      if (data?.error === "expired") {
        throw new Error("انتهت صلاحية هذا الرابط");
      }
      if (data?.error === "missing_request") {
        throw new Error("الطلب غير موجود");
      }

      // data = { request, deliveries }
      return data;
    },
    enabled: !!token,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              رابط غير صالح
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {(error as any)?.message || "هذا الرابط غير صالح أو لم يعد متاحًا"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { request, deliveries } = data as any;
  const files = (request.files as Array<{ name: string; size: number; type: string; url?: string; path?: string }>) || [];

  const timelineItems = [
    {
      id: "1",
      title: "تم إنشاء الطلب",
      description: `رقم الطلب: ${request.request_number}`,
      date: request.created_at,
      status: "completed" as const,
    },
    ...(request.status === "completed"
      ? [
          {
            id: "2",
            title: "مكتمل",
            description: "تم إكمال الطلب بنجاح",
            date: request.updated_at,
            status: "completed" as const,
          },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <div className="max-w-4xl w-full space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-1">
              {request.title || `طلب رقم ${request.request_number}`}
            </h1>
            <p className="text-sm text-muted-foreground">
              عرض للقراءة فقط لملخص الطلب والتسليمات
            </p>
          </div>
          <Badge variant="outline">طلب #{request.request_number}</Badge>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>ملخص الطلب</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p>
                  <span className="text-muted-foreground">الحالة الحالية: </span>
                  <span className="font-medium">{request.status}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">تاريخ الإنشاء: </span>
                  <span>
                    {format(new Date(request.created_at), "d MMMM yyyy", { locale: ar })}
                  </span>
                </p>
                <p>
                  <span className="text-muted-foreground">آخر تحديث: </span>
                  <span>
                    {format(new Date(request.updated_at), "d MMMM yyyy, h:mm a", { locale: ar })}
                  </span>
                </p>
              </CardContent>
            </Card>

            {deliveries.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    التسليمات
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {deliveries.map((delivery: any) => {
                    const deliveryFiles = (delivery.files as Array<{ name: string; size: number; type: string; url?: string }>) || [];
                    return (
                      <div key={delivery.id} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <div>
                            <p className="font-medium">تسليم #{delivery.revision_number}</p>
                            <p className="text-muted-foreground">
                              {format(new Date(delivery.created_at), "d MMMM yyyy, h:mm a", { locale: ar })}
                            </p>
                          </div>
                          <Badge variant="outline">{delivery.status}</Badge>
                        </div>
                        {deliveryFiles.length > 0 && (
                          <FilePreview files={deliveryFiles} bucket="request-files" />
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-10 text-center">
                  <Package className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    لا توجد تسليمات متاحة للعرض حاليًا.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>مراحل الطلب</CardTitle>
              </CardHeader>
              <CardContent>
                <Timeline items={timelineItems} />
              </CardContent>
            </Card>

            {files.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>ملفات مرفقة من العميل</CardTitle>
                </CardHeader>
                <CardContent>
                  <FilePreview files={files} bucket="request-files" />
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
