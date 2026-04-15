import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const buckets = [
    "brand-assets",
    "course-resources",
    "deliveries",
    "identity-documents",
    "request-files",
    "training-files",
  ];

  const results: Record<string, { deleted: number; errors: string[] }> = {};

  for (const bucket of buckets) {
    let totalDeleted = 0;
    const errors: string[] = [];

    async function processFolder(prefix: string) {
      let offset = 0;
      while (true) {
        const { data: items, error } = await supabase.storage
          .from(bucket)
          .list(prefix, { limit: 100, offset });

        if (error) {
          errors.push(`List ${prefix}: ${error.message}`);
          break;
        }
        if (!items || items.length === 0) break;

        const folders = items.filter((i: any) => i.id === null);
        const files = items.filter((i: any) => i.id !== null);

        for (const folder of folders) {
          const folderPath = prefix ? `${prefix}/${folder.name}` : folder.name;
          await processFolder(folderPath);
        }

        if (files.length > 0) {
          const paths = files.map((f: any) =>
            prefix ? `${prefix}/${f.name}` : f.name
          );
          const { error: delError } = await supabase.storage
            .from(bucket)
            .remove(paths);
          if (delError) {
            errors.push(`Delete: ${delError.message}`);
          } else {
            totalDeleted += paths.length;
          }
        }

        if (items.length < 100) break;
        offset += 100;
      }
    }

    await processFolder("");
    results[bucket] = { deleted: totalDeleted, errors };
  }

  return new Response(JSON.stringify({ results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
