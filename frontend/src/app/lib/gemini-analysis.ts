import { buildApiUrl } from "../config/api";

export type GeminiSummary = {
  risk_level?: string;
  conditions_flagged?: string[];
  confidence_score?: number;
  explanation?: string[];
  research_references_used?: string[];
  patient_name?: string;
};

type StoredGeminiSummary = {
  patientId: string;
  summary: GeminiSummary;
  updatedAt: string;
};

const GEMINI_SUMMARY_STORAGE_KEY = "aura-latest-gemini-summary";

export async function runGeminiAnalysisForPatient(patientId: string): Promise<GeminiSummary> {
  const fetchInputRes = await fetch(
    buildApiUrl(`/fetch-input/${encodeURIComponent(patientId)}`)
  );

  if (!fetchInputRes.ok) {
    const payload = await fetchInputRes.json().catch(() => ({}));
    const detail = typeof payload?.detail === "string" ? payload.detail : "Unable to compile analysis input from latest session.";
    throw new Error(detail);
  }

  const compiledInput = await fetchInputRes.json();

  const analyzeRes = await fetch(buildApiUrl("/analyze"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(compiledInput),
  });

  if (!analyzeRes.ok) {
    const payload = await analyzeRes.json().catch(() => ({}));
    const detail = typeof payload?.detail === "string" ? payload.detail : "Gemini analysis failed.";
    throw new Error(detail);
  }

  const summary = (await analyzeRes.json()) as GeminiSummary;
  saveLatestGeminiSummary(patientId, summary);
  return summary;
}

export function saveLatestGeminiSummary(patientId: string, summary: GeminiSummary): void {
  try {
    const payload: StoredGeminiSummary = {
      patientId,
      summary,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(GEMINI_SUMMARY_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore storage errors
  }
}

export function loadLatestGeminiSummary(patientId: string): GeminiSummary | null {
  try {
    const raw = localStorage.getItem(GEMINI_SUMMARY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredGeminiSummary;
    if (parsed?.patientId !== patientId) return null;
    if (!parsed?.summary || typeof parsed.summary !== "object") return null;
    return parsed.summary;
  } catch {
    return null;
  }
}
