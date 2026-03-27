import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate invoice HTML
function generateInvoiceHTML(order: any, items: any[], profile: any, platformName: string): string {
  const date = new Date(order.paid_at || order.created_at);
  const formattedDate = date.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const itemsHTML = items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.products?.name_ar || item.products?.name || 'منتج'}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: left;">${item.unit_price} ج.م</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: left;">${item.total} ج.م</td>
    </tr>
  `).join("");

  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>فاتورة رقم ${order.order_number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif; 
      background: #f5f5f5;
      padding: 20px;
    }
    .invoice {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px;
      text-align: center;
    }
    .header h1 { font-size: 28px; margin-bottom: 8px; }
    .header p { opacity: 0.9; }
    .content { padding: 40px; }
    .meta {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
      flex-wrap: wrap;
      gap: 20px;
    }
    .meta-box {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 12px;
      min-width: 200px;
    }
    .meta-box h3 {
      color: #667eea;
      font-size: 14px;
      margin-bottom: 8px;
    }
    .meta-box p { color: #333; font-size: 14px; line-height: 1.6; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    th {
      background: #667eea;
      color: white;
      padding: 14px;
      text-align: right;
      font-weight: 600;
    }
    th:last-child, td:last-child { text-align: left; }
    tr:nth-child(even) { background: #f8f9fa; }
    .totals {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 12px;
      margin-bottom: 30px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
    }
    .total-row.final {
      border-top: 2px solid #667eea;
      margin-top: 12px;
      padding-top: 16px;
      font-size: 18px;
      font-weight: bold;
      color: #667eea;
    }
    .footer {
      text-align: center;
      padding: 30px;
      background: #f8f9fa;
      color: #666;
      font-size: 14px;
    }
    .badge {
      display: inline-block;
      background: #22c55e;
      color: white;
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
    }
    @media print {
      body { background: white; padding: 0; }
      .invoice { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="invoice">
    <div class="header">
      <h1>${platformName}</h1>
      <p>فاتورة إلكترونية</p>
    </div>
    
    <div class="content">
      <div class="meta">
        <div class="meta-box">
          <h3>بيانات الفاتورة</h3>
          <p><strong>رقم الفاتورة:</strong> ${order.order_number}</p>
          <p><strong>التاريخ:</strong> ${formattedDate}</p>
          <p><strong>الحالة:</strong> <span class="badge">مدفوعة</span></p>
        </div>
        <div class="meta-box">
          <h3>بيانات العميل</h3>
          <p><strong>الاسم:</strong> ${profile?.full_name || 'عميل'}</p>
          <p><strong>البريد:</strong> ${profile?.email || '-'}</p>
          <p><strong>الهاتف:</strong> ${profile?.phone || '-'}</p>
        </div>
        <div class="meta-box">
          <h3>طريقة الدفع</h3>
          <p><strong>الطريقة:</strong> ${order.payment_method === 'kashier' ? 'دفع إلكتروني' : order.payment_method === 'bank_transfer' ? 'تحويل بنكي' : 'محفظة إلكترونية'}</p>
          <p><strong>المرجع:</strong> ${order.payment_reference || '-'}</p>
        </div>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>المنتج</th>
            <th style="text-align: center;">الكمية</th>
            <th>سعر الوحدة</th>
            <th>الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHTML}
        </tbody>
      </table>
      
      <div class="totals">
        <div class="total-row">
          <span>المجموع الفرعي</span>
          <span>${order.subtotal} ج.م</span>
        </div>
        ${order.discount > 0 ? `
        <div class="total-row" style="color: #22c55e;">
          <span>الخصم</span>
          <span>-${order.discount} ج.م</span>
        </div>
        ` : ''}
        ${order.tax > 0 ? `
        <div class="total-row">
          <span>الضريبة</span>
          <span>${order.tax} ج.م</span>
        </div>
        ` : ''}
        <div class="total-row final">
          <span>الإجمالي النهائي</span>
          <span>${order.total} ج.م</span>
        </div>
      </div>
    </div>
    
    <div class="footer">
      <p>شكراً لتعاملكم معنا!</p>
      <p style="margin-top: 8px; font-size: 12px;">هذه فاتورة إلكترونية تم إنشاؤها تلقائياً</p>
    </div>
  </div>
</body>
</html>
  `;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { orderId } = await req.json();

    if (!orderId) {
      return new Response(
        JSON.stringify({ error: "Order ID required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch order with items
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(`
        *,
        order_items(
          *,
          products(name, name_ar)
        )
      `)
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      console.error("Order fetch error:", orderError);
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email, phone")
      .eq("user_id", order.user_id)
      .single();

    // Fetch platform name
    const { data: platformSetting } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "platformName")
      .single();

    let platformName = "منصتنا";
    if (platformSetting?.value) {
      try {
        platformName = typeof platformSetting.value === "string" 
          ? JSON.parse(platformSetting.value) 
          : platformSetting.value;
      } catch {
        platformName = platformSetting.value as string || "منصتنا";
      }
    }

    // Generate HTML invoice
    const invoiceHTML = generateInvoiceHTML(
      order,
      order.order_items || [],
      profile,
      platformName
    );

    console.log(`Invoice generated for order ${order.order_number}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        invoiceHTML,
        orderNumber: order.order_number
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Invoice generation error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
