export interface CvExtractionResult {
  text: string | null;
  status: "parsed" | "unreadable";
}

/**
 * Extracts plain text from an uploaded CV so it can be fed to AI screening.
 * Supports PDF and DOCX (the formats the application form accepts alongside
 * legacy .doc, which has no reliable pure-JS parser — those fall back to
 * "unreadable" so the recruiter is told to open the original file instead of
 * silently screening against empty/wrong text).
 */
export async function extractCvText(buffer: Buffer, filename: string): Promise<CvExtractionResult> {
  const ext = filename.toLowerCase().split(".").pop() ?? "";

  try {
    if (ext === "pdf") return await extractPdf(buffer);
    if (ext === "docx") return await extractDocx(buffer);
    return { text: null, status: "unreadable" };
  } catch {
    return { text: null, status: "unreadable" };
  }
}

async function extractPdf(buffer: Buffer): Promise<CvExtractionResult> {
  // Pinned to v1 (not the current major — v2+ parses via worker_threads,
  // which doesn't reliably spin up inside Next.js's bundled route-handler
  // runtime). Importing the package root also has to be avoided: its main
  // entry (index.js) runs a debug code path — `if (!module.parent) { ...
  // read a test fixture off disk ... }` — that misfires inside a bundled
  // module graph where `module.parent` comes back undefined, crashing on
  // every single import regardless of the PDF being parsed. Importing the
  // internal lib file directly skips that entry point entirely.
  const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default;
  const result = await pdfParse(buffer);
  const text = result.text.trim();
  return text ? { text, status: "parsed" } : { text: null, status: "unreadable" };
}

async function extractDocx(buffer: Buffer): Promise<CvExtractionResult> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  const text = result.value.trim();
  return text ? { text, status: "parsed" } : { text: null, status: "unreadable" };
}
