import { supabase } from "@/integrations/supabase/client";

export type StoragePathOrUrl = string;

function parseStorageObjectUrl(input: string): { bucket: string; path: string } | null {
  // Supports patterns like:
  // https://<host>/storage/v1/object/public/<bucket>/<path>
  // https://<host>/storage/v1/object/sign/<bucket>/<path>?token=...
  // <host>/storage/v1/object/public/<bucket>/<path> (missing protocol)
  const normalized = input.startsWith("//") ? `https:${input}` : input;
  const m = normalized.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+?)(?:\?.*)?$/);
  if (!m) return null;
  const [, bucket, path] = m;
  if (!bucket || !path) return null;
  return { bucket, path: decodeURIComponent(path) };
}

function normalizePathOrUrl(params: { bucket: string; pathOrUrl: string }): { bucket: string; pathOrUrl: string; isUrl: boolean } {
  const { bucket, pathOrUrl } = params;
  if (!pathOrUrl) return { bucket, pathOrUrl, isUrl: false };

  // If it's a full URL (or protocol-relative) and specifically a storage object URL,
  // prefer extracting bucket+path so we can generate a fresh signed URL when needed.
  if (pathOrUrl.startsWith("http") || pathOrUrl.startsWith("//")) {
    const parsed = parseStorageObjectUrl(pathOrUrl);
    if (parsed) return { bucket: parsed.bucket || bucket, pathOrUrl: parsed.path, isUrl: false };
    return { bucket, pathOrUrl, isUrl: true };
  }

  // If the stored value is a host/path without protocol (common copy/paste), treat as URL.
  if (pathOrUrl.includes("storage/v1/object/")) {
    const parsed = parseStorageObjectUrl(pathOrUrl);
    if (parsed) return { bucket: parsed.bucket || bucket, pathOrUrl: parsed.path, isUrl: false };
    return { bucket, pathOrUrl: `https://${pathOrUrl}`, isUrl: true };
  }

  // If someone stored "<bucket>/<path>" by mistake, strip the bucket prefix.
  if (pathOrUrl.startsWith(`${bucket}/`)) {
    return { bucket, pathOrUrl: pathOrUrl.slice(bucket.length + 1), isUrl: false };
  }

  return { bucket, pathOrUrl, isUrl: false };
}

export async function getSignedUrlOrUrl(params: {
  bucket: string;
  pathOrUrl: StoragePathOrUrl;
  expiresInSeconds?: number;
}): Promise<string> {
  const { expiresInSeconds = 300 } = params;

  const normalized = normalizePathOrUrl({ bucket: params.bucket, pathOrUrl: params.pathOrUrl });
  const bucket = normalized.bucket;
  const pathOrUrl = normalized.pathOrUrl;

  if (!pathOrUrl) throw new Error("Missing file path");

  // Non-storage URLs should be used as-is
  if (normalized.isUrl && (pathOrUrl.startsWith("http") || pathOrUrl.startsWith("//"))) return pathOrUrl;

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(pathOrUrl, expiresInSeconds);

  if (error || !data?.signedUrl) {
    // If we failed to sign but the input was actually a URL-ish value, fall back to it.
    const original = params.pathOrUrl;
    if (typeof original === "string" && (original.startsWith("http") || original.startsWith("//"))) {
      return original;
    }
    throw new Error(error?.message || "Failed to create signed URL");
  }

  return data.signedUrl;
}

export async function createBlobObjectUrlFromUrl(url: string): Promise<{ blobUrl: string; revoke: () => void }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch file");

  const blob = await res.blob();
  const blobUrl = window.URL.createObjectURL(blob);

  return {
    blobUrl,
    revoke: () => window.URL.revokeObjectURL(blobUrl),
  };
}

export async function downloadAsBlob(params: {
  bucket: string;
  pathOrUrl: StoragePathOrUrl;
  filename: string;
  expiresInSeconds?: number;
}): Promise<void> {
  const { bucket, pathOrUrl, filename, expiresInSeconds = 60 } = params;

  const url = await getSignedUrlOrUrl({ bucket, pathOrUrl, expiresInSeconds });
  const { blobUrl, revoke } = await createBlobObjectUrlFromUrl(url);

  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    revoke();
    document.body.removeChild(a);
  }, 100);
}
