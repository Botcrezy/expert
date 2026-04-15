# خطة: تنظيف التخزين + نظام تسليم بالروابط + تحسين عروض الفريلانسر

## ملخص

4 محاور رئيسية: (1) مسح جميع ملفات Storage Buckets، (2) تحويل نظام التسليم من رفع ملفات إلى روابط (Google Drive / GitHub / YouTube)، (3) إضافة صفحة تفاصيل المشروع من داخل عروض الفريلانسر مع إمكانية التسليم بالروابط، (4) تحديث نظام تسليم المهام التدريبية ليدعم نفس آلية الروابط.

---

## 1. تنظيف Storage Buckets

- استدعاء Edge Function `cleanup-training-files` الموجودة فعلاً لمسح bucket `identity-documents`
- إنشاء سكريبت مؤقت يمسح محتويات جميع الـ buckets الثمانية: , `brand-assets`, `course-resources`, `deliveries`, `identity-documents`, , `request-files`, `training-files`
- لن يتم حذف الـ buckets نفسها، فقط الملفات بداخلها

## 2. نظام التسليم بالروابط (بدلاً من رفع الملفات)

### التغيير في قاعدة البيانات:

- إضافة عمود `delivery_links jsonb DEFAULT '[]'` في جدول `deliveries` لتخزين الروابط

### تعديل `FreelancerTaskDetails.tsx`:

- **إزالة** `FileUploadAdvanced` من نموذج التسليم
- **إضافة** نظام إدخال روابط متعددة بأنواعها:
  - Google Drive (مع ملاحظة "يجب أن يكون الرابط عام")
  - GitHub Repository (مع ملاحظة "يجب أن يكون المستودع عام")
  - YouTube (مع ملاحظة "فيديو توضيحي - يمكن أن يكون غير مدرج")
  - رابط آخر
- كل رابط يُخزن كـ `{ type: "gdrive"|"github"|"youtube"|"other", url: string, label?: string }`
- إضافة تنبيه واضح: "⚠️ يجب أن تكون جميع الروابط عامة أو قابلة للوصول من قبل فريق المراجعة"

### تعديل `FreelancerTraining.tsx`:

- نفس التغيير: استبدال رفع الملفات بنظام الروابط
- الاحتفاظ بد