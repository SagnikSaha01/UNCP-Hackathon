export const LOCALHOST = false;

export const API_BASE_URL = LOCALHOST
  ? "https://localhost:8000"
  : "https://aura-arf5n.ondigitalocean.app";

const API_PREFIX = LOCALHOST ? "" : "/api";

export function buildApiUrl(endpoint: string): string {
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${API_PREFIX}${path}`;
}
