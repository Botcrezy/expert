import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface CMSSection {
  id: string;
  key: string;
  title: string | null;
  title_ar: string | null;
  content: string | null;
  content_ar: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
}

export function useCMSSections() {
  return useQuery({
    queryKey: ["cms-sections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cms_sections")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      
      if (error) throw error;
      return data as CMSSection[];
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}

export function getCMSContent(sections: CMSSection[] | undefined, key: string, isArabic = true): string {
  if (!sections) return "";
  const section = sections.find(s => s.key === key);
  if (!section) return "";
  return isArabic ? (section.content_ar || section.content || "") : (section.content || "");
}

export function getCMSTitle(sections: CMSSection[] | undefined, key: string, isArabic = true): string {
  if (!sections) return "";
  const section = sections.find(s => s.key === key);
  if (!section) return "";
  return isArabic ? (section.title_ar || section.title || "") : (section.title || "");
}
