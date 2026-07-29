import { apiFetch } from "@/lib/api-client";
import type { LegalPageRecord, LegalPageType } from "./types";
import { CMS_TAGS, cmsFetchOptions } from "./tags";

export async function getLegalPage(type: LegalPageType): Promise<LegalPageRecord> {
  return apiFetch<LegalPageRecord>(`/legal/${type}`, cmsFetchOptions(CMS_TAGS.legal(type)));
}
