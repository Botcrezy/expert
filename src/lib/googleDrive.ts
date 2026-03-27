export type GoogleDriveParseResult = {
  fileId: string;
  normalizedUrl: string;
};

const FILE_ID_RE = /^[a-zA-Z0-9_-]{10,}$/;

/**
 * Accepts common Google Drive share links and returns a normalized "file view" URL.
 */
export function parseGoogleDriveUrl(input: string): GoogleDriveParseResult | null {
  const raw = (input || "").trim();
  if (!raw) return null;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  if (host !== "drive.google.com" && host !== "docs.google.com") return null;

  // Patterns:
  // - /file/d/<id>/view
  // - /open?id=<id>
  // - /uc?id=<id>
  let fileId: string | null = null;

  const fileMatch = url.pathname.match(/\/file\/d\/([^/]+)/i);
  if (fileMatch?.[1]) fileId = fileMatch[1];

  if (!fileId) {
    const idParam = url.searchParams.get("id");
    if (idParam) fileId = idParam;
  }

  if (!fileId || !FILE_ID_RE.test(fileId)) return null;

  return {
    fileId,
    normalizedUrl: `https://drive.google.com/file/d/${fileId}/view?usp=sharing`,
  };
}
