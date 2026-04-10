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

  // Verify caller is admin
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }
  const anonClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!
  );
  const { data: { user } } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }

  const BUCKET = "training-files";
  let totalDeleted = 0;
  const errors: string[] = [];

  // Recursive function to list and delete all files
  async function processFolder(prefix: string) {
    let offset = 0;
    while (true) {
      const { data: items, error } = await supabase.storage
        .from(BUCKET)
        .list(prefix, { limit: 100, offset });

      if (error) {
        errors.push(`List error at ${prefix}: ${error.message}`);
        break;
      }
      if (!items || items.length === 0) break;

      const folders = items.filter((i) => i.id === null);
      const files = items.filter((i) => i.id !== null);

      // Process subfolders recursively
      for (const folder of folders) {
        const folderPath = prefix ? `${prefix}/${folder.name}` : folder.name;
        await processFolder(folderPath);
      }

      // Delete files
      if (files.length > 0) {
        const paths = files.map((f) =>
          prefix ? `${prefix}/${f.name}` : f.name
        );
        const { error: delError } = await supabase.storage
          .from(BUCKET)
          .remove(paths);
        if (delError) {
          errors.push(`Delete error: ${delError.message}`);
        } else {
          totalDeleted += paths.length;
        }
      }

      if (items.length < 100) break;
      offset += 100;
    }
  }

  await processFolder("");

  return new Response(
    JSON.stringify({ totalDeleted, errors }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
