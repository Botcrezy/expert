import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Shield, Clock, XCircle } from "lucide-react";
import { Link } from "react-router-dom";

interface VerificationAlertProps {
  status: "pending" | "rejected" | "required" | null;
  userType: "client" | "freelancer";
}

export function VerificationAlert({ status, userType }: VerificationAlertProps) {
  const verifyUrl = userType === "client" ? "/client/verify" : "/freelancer/verify";

  if (status === "pending") {
    return (
      <Alert className="mb-6 border-warning/50 bg-warning/10">
        <Clock className="h-5 w-5 text-warning" />
        <AlertTitle className="text-warning">طلبك قيد المراجعة</AlertTitle>
        <AlertDescription className="text-warning/80">
          تم إرسال طلب التحقق من هويتك وسيتم مراجعته خلال 24-48 ساعة.
        </AlertDescription>
      </Alert>
    );
  }

  if (status === "rejected") {
    return (
      <Alert className="mb-6 border-destructive/50 bg-destructive/10">
        <XCircle className="h-5 w-5 text-destructive" />
        <AlertTitle className="text-destructive">تم رفض طلب التحقق</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span className="text-destructive/80">يرجى إعادة التقديم مع التأكد من صحة البيانات.</span>
          <Button size="sm" variant="outline" asChild>
            <Link to={verifyUrl}>إعادة التقديم</Link>
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (status === "required") {
    return (
      <Alert className="mb-6 border-primary/50 bg-primary/10">
        <Shield className="h-5 w-5 text-primary" />
        <AlertTitle className="text-primary">التحقق من الهوية مطلوب</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span className="text-primary/80">
            يجب التحقق من هويتك للاستمرار في استخدام المنصة.
          </span>
          <Button size="sm" asChild>
            <Link to={verifyUrl}>تحقق الآن</Link>
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
