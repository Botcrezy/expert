import { cn } from "@/lib/utils";

type RequestStatus = 
  | "submitted" 
  | "needs_info" 
  | "approved" 
  | "assigned" 
  | "in_progress" 
  | "ready_for_qc" 
  | "qc_rejected" 
  | "delivered_to_client" 
  | "revision_requested" 
  | "completed" 
  | "cancelled";

type DeliveryStatus = "pending" | "approved" | "rejected" | "resubmitted";

type DisputeStatus = "opened" | "under_review" | "resolved_refund" | "resolved_reassign" | "closed";

type OrderStatus = "cart" | "pending_payment" | "paid" | "failed" | "cancelled" | "refunded";

type AllStatuses = RequestStatus | DeliveryStatus | DisputeStatus | OrderStatus;

const statusConfig: Record<AllStatuses, { label: string; className: string }> = {
  // Request statuses
  submitted: { label: "تم الإرسال", className: "bg-blue-100 text-blue-700" },
  needs_info: { label: "يحتاج معلومات", className: "bg-orange-100 text-orange-700" },
  approved: { label: "موافق عليه", className: "bg-green-100 text-green-700" },
  assigned: { label: "تم التعيين", className: "bg-purple-100 text-purple-700" },
  in_progress: { label: "قيد التنفيذ", className: "bg-yellow-100 text-yellow-700" },
  ready_for_qc: { label: "جاهز للمراجعة", className: "bg-indigo-100 text-indigo-700" },
  qc_rejected: { label: "مرفوض من المراجعة", className: "bg-red-100 text-red-700" },
  delivered_to_client: { label: "تم التسليم", className: "bg-teal-100 text-teal-700" },
  revision_requested: { label: "طلب تعديل", className: "bg-amber-100 text-amber-700" },
  completed: { label: "مكتمل", className: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "ملغي", className: "bg-gray-100 text-gray-700" },
  
  // Delivery statuses
  pending: { label: "في الانتظار", className: "bg-gray-100 text-gray-700" },
  resubmitted: { label: "أعيد إرساله", className: "bg-blue-100 text-blue-700" },
  
  // Dispute statuses
  opened: { label: "مفتوح", className: "bg-red-100 text-red-700" },
  under_review: { label: "قيد المراجعة", className: "bg-yellow-100 text-yellow-700" },
  resolved_refund: { label: "تم الاسترداد", className: "bg-green-100 text-green-700" },
  resolved_reassign: { label: "تم إعادة التعيين", className: "bg-purple-100 text-purple-700" },
  closed: { label: "مغلق", className: "bg-gray-100 text-gray-700" },
  
  // Order statuses
  cart: { label: "في السلة", className: "bg-gray-100 text-gray-700" },
  pending_payment: { label: "في انتظار الدفع", className: "bg-yellow-100 text-yellow-700" },
  paid: { label: "مدفوع", className: "bg-green-100 text-green-700" },
  failed: { label: "فشل الدفع", className: "bg-red-100 text-red-700" },
  refunded: { label: "مسترد", className: "bg-purple-100 text-purple-700" },
  rejected: { label: "مرفوض", className: "bg-red-100 text-red-700" },
};

export type { AllStatuses };

interface StatusBadgeProps {
  status: AllStatuses;
  label?: string;
  className?: string;
  showDot?: boolean;
}

export function StatusBadge({ status, label, className, showDot = true }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, className: "bg-gray-100 text-gray-700" };
  
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
      config.className,
      className
    )}>
      {showDot && (
        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      )}
      {label || config.label}
    </span>
  );
}
