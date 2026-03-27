import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, X, CreditCard, AlertTriangle, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface KashierIframeModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentUrl: string;
  orderId?: string;
  onSuccess?: () => void;
  onFailure?: () => void;
}

export function KashierIframeModal({ 
  isOpen, 
  onClose, 
  paymentUrl, 
  orderId,
  onSuccess,
  onFailure 
}: KashierIframeModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const [minimized, setMinimized] = useState(false);
  // Poll for payment status
  const pollPaymentStatus = useCallback(async () => {
    if (!orderId) return false;

    const { data: order, error } = await supabase
      .from("orders")
      .select("status")
      .eq("id", orderId)
      .maybeSingle();

    if (!error && order) {
      if (order.status === "paid") {
        setPolling(false);
        // Let parent decide UX (service purchase vs credits)
        if (!onSuccess) {
          toast({
            title: "تم الدفع بنجاح! 🎉",
            description: "تم إتمام عملية الدفع بنجاح",
          });
        }
        onSuccess?.();
        return true;
      } else if (order.status === "failed") {
        setPolling(false);
        if (!onFailure) {
          toast({
            title: "فشل الدفع",
            description: "حدث خطأ أثناء عملية الدفع",
            variant: "destructive",
          });
        }
        onFailure?.();
        return true;
      }
    }
    return false;
  }, [orderId, onSuccess, onFailure, toast]);

  // Start polling when modal opens
  useEffect(() => {
    if (!isOpen || !orderId) return;

    let active = true;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let inFlight = false;
    let attempts = 0;

    setPolling(true);

    const tick = async () => {
      if (!active) return;
      if (inFlight) {
        timeout = setTimeout(tick, 3000);
        return;
      }

      inFlight = true;
      attempts += 1;

      // Stop after ~5 minutes to avoid infinite polling
      if (attempts > 100) {
        setPolling(false);
        toast({
          title: "تعذر تأكيد الدفع تلقائياً",
          description: "لو تم الدفع بالفعل، انتظر دقائق أو حدّث الصفحة. يمكنك أيضاً فتح الدفع في تبويب جديد.",
        });
        inFlight = false;
        return;
      }

      try {
        const done = await pollPaymentStatus();
        if (!done) {
          timeout = setTimeout(tick, 3000);
        }
      } finally {
        inFlight = false;
      }
    };

    tick();

    return () => {
      active = false;
      setPolling(false);
      if (timeout) clearTimeout(timeout);
    };
  }, [isOpen, orderId, pollPaymentStatus, toast]);

  // Reset states when modal opens
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setError(null);
      setMinimized(false);
    }
  }, [isOpen]);

  const handleIframeLoad = () => {
    setLoading(false);
  };

  const handleIframeError = () => {
    setLoading(false);
    setError("فشل تحميل صفحة الدفع. قد يكون هذا بسبب قيود الأمان.");
  };

  if (!isOpen) return null;

  // Minimized floating button
  if (minimized) {
    return (
      <div className="fixed bottom-4 right-4 z-[100]">
        <div className="bg-card border shadow-2xl rounded-xl p-4 animate-in slide-in-from-bottom-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground text-sm">نافذة الدفع</p>
              {polling && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  جاري التحقق...
                </p>
              )}
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setMinimized(false)}
            >
              فتح
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Full floating modal
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
      <div 
        className={cn(
          "relative w-full max-w-4xl h-[85vh] bg-card border shadow-2xl rounded-2xl flex flex-col overflow-hidden",
          "animate-in zoom-in-95 slide-in-from-bottom-4"
        )}
      >
        {/* Header */}
        <div className="p-4 border-b flex-shrink-0 flex items-center justify-between bg-muted/50">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            <span className="font-semibold text-foreground">الدفع الإلكتروني - Kashier</span>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.open(paymentUrl, "_blank")}
              className="gap-1"
            >
              <ExternalLink className="w-4 h-4" />
              فتح في تبويب جديد
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setMinimized(true)}
            >
              تصغير
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 relative min-h-0">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
              <div className="text-center">
                <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground text-lg">جاري تحميل صفحة الدفع...</p>
                <p className="text-sm text-muted-foreground mt-2">يرجى الانتظار...</p>
              </div>
            </div>
          )}

          {error ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background p-6 z-10">
              <div className="text-center max-w-md">
                <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">تعذر تحميل صفحة الدفع</h3>
                <p className="text-muted-foreground mb-6">{error}</p>
                <div className="space-y-3">
                  <Button 
                    className="w-full gap-2"
                    size="lg"
                    onClick={() => window.open(paymentUrl, "_blank")}
                  >
                    <ExternalLink className="w-5 h-5" />
                    فتح صفحة الدفع في تبويب جديد
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={onClose}
                  >
                    إلغاء
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-6">
                  سيتم تحديث حالة الدفع تلقائياً بعد إتمام العملية
                </p>
              </div>
            </div>
          ) : (
            <iframe
              src={paymentUrl}
              className="w-full h-full border-0"
              style={{ minHeight: '500px' }}
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              allow="payment *"
              referrerPolicy="no-referrer-when-downgrade"
            />
          )}
        </div>

        {/* Footer */}
        {polling && (
          <div className="p-4 bg-primary/5 border-t flex items-center justify-center gap-3 text-sm text-primary flex-shrink-0">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="font-medium">جاري التحقق من حالة الدفع...</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Floating payment trigger button component
interface FloatingPaymentButtonProps {
  paymentUrl: string;
  orderId?: string;
  onSuccess?: () => void;
  onFailure?: () => void;
  children?: React.ReactNode;
  className?: string;
}

export function FloatingPaymentButton({
  paymentUrl,
  orderId,
  onSuccess,
  onFailure,
  children,
  className
}: FloatingPaymentButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        className={className}
        onClick={() => setIsOpen(true)}
      >
        {children || (
          <>
            <CreditCard className="w-4 h-4 ml-2" />
            ادفع الآن
          </>
        )}
      </Button>
      <KashierIframeModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        paymentUrl={paymentUrl}
        orderId={orderId}
        onSuccess={() => {
          setIsOpen(false);
          onSuccess?.();
        }}
        onFailure={() => {
          setIsOpen(false);
          onFailure?.();
        }}
      />
    </>
  );
}