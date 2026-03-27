export function calculateSmartPrice(params: {
  requestSize: string;
  requestCredits: number;
  categoryName: string;
  creditToEgp: number;
  taskTitle?: string;
  taskDescription?: string;
}): { suggested_price: number; min_price: number; max_price: number; reasoning: string } {
  const { requestSize, requestCredits, categoryName, creditToEgp, taskTitle, taskDescription } = params;

  // Base pricing: credits × creditToEgp rate from admin settings
  let basePrice = requestCredits * creditToEgp;

  // Category complexity multipliers
  const categoryMultipliers: Record<string, number> = {
    "تصميم": 1.2,
    "برمجة": 1.5,
    "كتابة": 0.9,
    "ترجمة": 1.0,
    "تسويق": 1.1,
    "فيديو": 1.4,
    "صوت": 1.1,
    "عام": 1.0,
  };

  // Find matching category
  let categoryMultiplier = 1.0;
  for (const [cat, mult] of Object.entries(categoryMultipliers)) {
    if (categoryName.includes(cat)) {
      categoryMultiplier = mult;
      break;
    }
  }

  // Task complexity analysis from title/description
  let complexityBonus = 0;
  const complexityKeywords = [
    { words: ["عاجل", "سريع", "فوري"], bonus: 0.2 },
    { words: ["تعديل", "بسيط", "صغير"], bonus: -0.1 },
    { words: ["متقدم", "احترافي", "معقد"], bonus: 0.3 },
    { words: ["موشن", "animation", "3d"], bonus: 0.4 },
    { words: ["api", "integration", "ربط"], bonus: 0.25 },
    { words: ["logo", "لوجو", "هوية"], bonus: 0.15 },
  ];

  const textToAnalyze = `${taskTitle || ""} ${taskDescription || ""}`.toLowerCase();
  for (const { words, bonus } of complexityKeywords) {
    if (words.some((w) => textToAnalyze.includes(w.toLowerCase()))) {
      complexityBonus += bonus;
    }
  }

  // Size-based multiplier (affects the final price)
  const sizeMultipliers: Record<string, number> = {
    micro: 0.7,
    small: 1.0,
    medium: 1.3,
    large: 1.8,
  };
  const sizeMultiplier = sizeMultipliers[requestSize] || 1.0;

  // Calculate final price:
  // basePrice (credits × creditToEgp) × category × complexity × size
  let suggestedPrice = basePrice * categoryMultiplier * (1 + complexityBonus) * sizeMultiplier;

  // Round to nearest 5
  suggestedPrice = Math.round(suggestedPrice / 5) * 5;

  // Ensure minimum prices based on size
  const minPrices: Record<string, number> = {
    micro: 25,
    small: 50,
    medium: 100,
    large: 200,
  };
  suggestedPrice = Math.max(suggestedPrice, minPrices[requestSize] || 50);

  const minPrice = Math.round((suggestedPrice * 0.7) / 5) * 5;
  const maxPrice = Math.round((suggestedPrice * 1.5) / 5) * 5;

  // Generate reasoning
  const reasons: string[] = [];
  reasons.push(`السعر الأساسي: ${requestCredits} كريديت × ${creditToEgp} ج.م = ${basePrice} ج.م`);
  if (categoryMultiplier > 1.0) reasons.push(`تصنيف ${categoryName} يتطلب مهارات متخصصة (+${((categoryMultiplier - 1) * 100).toFixed(0)}%)`);
  if (complexityBonus > 0) reasons.push(`متطلبات إضافية ومعقدة (+${(complexityBonus * 100).toFixed(0)}%)`);
  if (complexityBonus < 0) reasons.push(`مهمة بسيطة (${(complexityBonus * 100).toFixed(0)}%)`);
  reasons.push(
    `حجم المهمة: ${
      requestSize === "micro"
        ? "صغير جداً (-30%)"
        : requestSize === "small"
        ? "صغير"
        : requestSize === "medium"
        ? "متوسط (+30%)"
        : "كبير (+80%)"
    }`,
  );

  return {
    suggested_price: suggestedPrice,
    min_price: minPrice,
    max_price: maxPrice,
    reasoning: reasons.join(" • ") || "تسعير قياسي بناءً على حجم المهمة",
  };
}
