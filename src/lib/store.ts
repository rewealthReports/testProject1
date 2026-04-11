/**
 * RTQ app-data store.
 *
 * Non-dev runtime (PX shell with live idToken):
 *   Persistence via PX App Data API — platform-governed, tenant-scoped,
 *   reliably exportable, and compatible with plannerxchange_portable contract.
 *     app_data.read  → GET  /app-data?recordType=...&firmId=...
 *     app_data.read  → GET  /app-data/{id}
 *     app_data.write → POST /app-data
 *     app_data.write → PATCH /app-data/{id}
 *
 * Dev runtime (publicationEnvironment === "dev"):
 *   localStorage is used as a fast-feedback local fallback only.
 *   No PX client PII is stored in either path — only app-owned work product
 *   (questionnaire config, invitation state, scored responses).
 *
 * FAIL-CLOSED: isLive() throws in non-dev if idToken or appInstallationId are
 * absent or synthetic, preventing localStorage fallbacks from silently serving
 * data in a real firm context.
 *
 * Data portability (plannerxchange_portable):
 *   - Live records are isolated per firmId via the PX app-data API firmId scope.
 *   - Schema is stable and versioned (schemaVersion: 1).
 *   - Payloads are plain JSON — exportable without app-specific tooling.
 *   - Invitations reference clientId (opaque PX canonical ID), not raw PII.
 *   - RTQTemplate, RTQInvitation, RTQResponse contain no PX-canonical PII fields.
 *
 * Call initStore(ctx) at app startup before any other function.
 */

import type { RTQInvitation, RTQResponse, RTQTemplate } from "../types/rtq";
import type { ShellRuntimeContext } from "../plannerxchange";
import { DEFAULT_QUESTIONNAIRE } from "../data/defaultQuestionnaire";

// ── Module init ───────────────────────────────────────────────────────────────

let _ctx: ShellRuntimeContext | null = null;

/** Wire the store to the current PX runtime context before using any function. */
export function initStore(ctx: ShellRuntimeContext): void {
  _ctx = ctx;
}

function ctx(): ShellRuntimeContext {
  if (!_ctx) throw new Error("[store] initStore() must be called before using the store.");
  return _ctx;
}

/**
 * Returns true when we are in a live PX shell.
 * FAIL-CLOSED: throws in non-dev if required auth/installation fields are
 * absent or synthetic — prevents localStorage fallback from silently running
 * under a real firm context.
 */
function isLive(): boolean {
  const c = ctx();
  if (c.publicationEnvironment !== "dev") {
    if (!c.idToken) {
      throw new Error(
        "[store] Non-dev environment without idToken. " +
        "PX shell must inject idToken before mounting the app."
      );
    }
    if (c.appInstallationId === "synthetic-installation-context") {
      throw new Error(
        "[store] Synthetic appInstallationId in non-dev context. " +
        "Use a real PlannerXchange installation."
      );
    }
    return true;
  }
  return false;
}

// ── PX App Data API helpers ───────────────────────────────────────────────────

interface PXRecord<T> {
  recordId: string;
  payload: T;
}

function pxHeaders(): HeadersInit {
  const c = ctx();
  return {
    Authorization: `Bearer ${c.idToken}`,
    "x-plannerxchange-app-installation-id": c.appInstallationId,
    "Content-Type": "application/json",
  };
}

async function pxList<T>(recordType: string): Promise<PXRecord<T>[]> {
  const c = ctx();
  const params = new URLSearchParams({ recordType, firmId: c.firmId, limit: "100" });
  const res = await fetch(`${c.apiBaseUrl}/app-data?${params}`, { headers: pxHeaders() });
  if (!res.ok) throw new Error(`[store] GET /app-data?recordType=${recordType} failed: ${res.status}`);
  const data = (await res.json()) as { items: PXRecord<T>[] };
  return data.items;
}

async function pxGetById<T>(recordId: string): Promise<PXRecord<T> | undefined> {
  const res = await fetch(`${ctx().apiBaseUrl}/app-data/${encodeURIComponent(recordId)}`, { headers: pxHeaders() });
  if (res.status === 404) return undefined;
  if (!res.ok) throw new Error(`[store] GET /app-data/${recordId} failed: ${res.status}`);
  return res.json() as Promise<PXRecord<T>>;
}

async function pxCreate<T>(recordType: string, payload: T): Promise<PXRecord<T>> {
  const body = { recordType, schemaVersion: 1, firmId: ctx().firmId, payload };
  const res = await fetch(`${ctx().apiBaseUrl}/app-data`, {
    method: "POST", headers: pxHeaders(), body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`[store] POST /app-data (${recordType}) failed: ${res.status}`);
  return res.json() as Promise<PXRecord<T>>;
}

async function pxPatch<T>(recordId: string, payloadPatch: Partial<T>): Promise<void> {
  const res = await fetch(`${ctx().apiBaseUrl}/app-data/${encodeURIComponent(recordId)}`, {
    method: "PATCH", headers: pxHeaders(),
    body: JSON.stringify({ payload: payloadPatch }),
  });
  if (!res.ok) throw new Error(`[store] PATCH /app-data/${recordId} failed: ${res.status}`);
}

// ── localStorage fallback (dev only) ─────────────────────────────────────────
//
// STORED PAYLOAD CLASSIFICATION — non-sensitive app work product only:
//
//   RTQTemplate   — questionnaire config (question text, scoring weights,
//                   display order). No client PII at all.
//
//   RTQInvitation — firmId, opaque PX clientId (not a PII field), token,
//                   clientDisplayName (name string from PX summary scope,
//                   same data already in ShellRuntimeContext), status.
//                   No address, DOB, SSN, or contact detail stored.
//
//   RTQResponse   — answers keyed by question ID, computed score, risk band.
//                   No raw PII. clientDisplayName same as above.
//
// None of the three types include fields protected by restricted_pii or
// client.sensitive.read — that scope is not requested by this app.
// localStorage is therefore not used to persist sensitive client payloads.

const LOCAL_KEYS = {
  template: "rtq:template",
  invitations: "rtq:invitations",
  responses: "rtq:responses",
} as const;

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}

function writeJSON<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

// ── Template ─────────────────────────────────────────────────────────────────

export async function getTemplate(firmId: string): Promise<RTQTemplate> {
  if (isLive()) {
    const records = await pxList<RTQTemplate>("rtq_template");
    const match = records.find((r) => r.payload.firmId === firmId);
    if (match) return { ...match.payload, id: match.recordId };
    // First run: no saved template yet — return default without persisting.
    return { id: "", firmId, questions: DEFAULT_QUESTIONNAIRE.questions, updatedAt: new Date().toISOString() };
  }
  const stored = readJSON<RTQTemplate | null>(LOCAL_KEYS.template, null);
  if (stored && stored.firmId === firmId) return stored;
  const fresh: RTQTemplate = { id: "tpl-default", firmId, questions: DEFAULT_QUESTIONNAIRE.questions, updatedAt: new Date().toISOString() };
  writeJSON(LOCAL_KEYS.template, fresh);
  return fresh;
}

export async function saveTemplate(template: RTQTemplate): Promise<RTQTemplate> {
  const updated = { ...template, updatedAt: new Date().toISOString() };
  if (isLive()) {
    if (updated.id) {
      await pxPatch<RTQTemplate>(updated.id, updated);
      return updated;
    }
    const record = await pxCreate<RTQTemplate>("rtq_template", updated);
    return { ...record.payload, id: record.recordId };
  }
  writeJSON(LOCAL_KEYS.template, updated);
  return updated;
}

// ── Invitations ───────────────────────────────────────────────────────────────

export async function getInvitations(firmId: string): Promise<RTQInvitation[]> {
  if (isLive()) {
    const records = await pxList<RTQInvitation>("rtq_invitation");
    return records
      .filter((r) => r.payload.firmId === firmId)
      .map((r) => ({ ...r.payload, id: r.recordId }));
  }
  return readJSON<RTQInvitation[]>(LOCAL_KEYS.invitations, []).filter((i) => i.firmId === firmId);
}

export async function createInvitation(
  firmId: string,
  clientId: string,
  clientDisplayName: string,
  clientEmail: string,
): Promise<RTQInvitation> {
  const invitation: RTQInvitation = {
    id: `inv-${uid()}`,
    firmId,
    clientId,
    clientDisplayName,
    clientEmail,
    token: uid(),
    status: "pending",
    sentAt: new Date().toISOString(),
  };
  if (isLive()) {
    const record = await pxCreate<RTQInvitation>("rtq_invitation", invitation);
    return { ...record.payload, id: record.recordId };
  }
  const all = readJSON<RTQInvitation[]>(LOCAL_KEYS.invitations, []);
  writeJSON(LOCAL_KEYS.invitations, [...all, invitation]);
  return invitation;
}

export async function getInvitationByToken(token: string): Promise<RTQInvitation | undefined> {
  if (isLive()) {
    const records = await pxList<RTQInvitation>("rtq_invitation");
    const match = records.find((r) => r.payload.token === token);
    return match ? { ...match.payload, id: match.recordId } : undefined;
  }
  return readJSON<RTQInvitation[]>(LOCAL_KEYS.invitations, []).find((i) => i.token === token);
}

export async function markInvitationCompleted(invitationId: string, responseId: string): Promise<void> {
  if (isLive()) {
    await pxPatch<Partial<RTQInvitation>>(invitationId, {
      status: "completed",
      completedAt: new Date().toISOString(),
      responseId,
    });
    return;
  }
  const all = readJSON<RTQInvitation[]>(LOCAL_KEYS.invitations, []);
  writeJSON(LOCAL_KEYS.invitations, all.map((inv) =>
    inv.id === invitationId
      ? { ...inv, status: "completed" as const, completedAt: new Date().toISOString(), responseId }
      : inv
  ));
}

// ── Responses ─────────────────────────────────────────────────────────────────

export async function getResponses(firmId: string): Promise<RTQResponse[]> {
  if (isLive()) {
    const records = await pxList<RTQResponse>("rtq_response");
    return records
      .filter((r) => r.payload.firmId === firmId)
      .map((r) => ({ ...r.payload, id: r.recordId }));
  }
  return readJSON<RTQResponse[]>(LOCAL_KEYS.responses, []).filter((r) => r.firmId === firmId);
}

export async function getResponseById(id: string): Promise<RTQResponse | undefined> {
  if (isLive()) {
    const record = await pxGetById<RTQResponse>(id);
    return record ? { ...record.payload, id: record.recordId } : undefined;
  }
  return readJSON<RTQResponse[]>(LOCAL_KEYS.responses, []).find((r) => r.id === id);
}

export async function saveResponse(response: Omit<RTQResponse, "id">): Promise<RTQResponse> {
  if (isLive()) {
    const record = await pxCreate<RTQResponse>("rtq_response", { ...response, id: "" });
    return { ...record.payload, id: record.recordId };
  }
  const full: RTQResponse = { ...response, id: `resp-${uid()}` };
  const all = readJSON<RTQResponse[]>(LOCAL_KEYS.responses, []);
  writeJSON(LOCAL_KEYS.responses, [...all, full]);
  return full;
}


