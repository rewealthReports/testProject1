/**
 * RTQ app-data store.
 *
 * Hosted runtime:
 *   Persistence uses the PlannerXchange App Data API through
 *   ShellRuntimeContext.authenticatedFetch. The shell owns authentication and
 *   governance headers; this module never reads tokens or builds auth headers.
 *
 * Local preview runtime:
 *   Data is held in memory only, and only on localhost while Vite is running
 *   in developer mode. Unexpected non-shell runtimes fail closed.
 */

import type { RTQInvitation, RTQResponse, RTQTemplate } from "../types/rtq";
import { DEFAULT_QUESTIONNAIRE } from "../data/defaultQuestionnaire";
import { hasShellRuntimeSignals, isShellHosted } from "../plannerxchange";
import type { ShellRuntimeContext } from "../plannerxchange";

let _ctx: ShellRuntimeContext | null = null;

const memoryStore: {
  template: RTQTemplate | null;
  invitations: RTQInvitation[];
  responses: RTQResponse[];
} = {
  template: null,
  invitations: [],
  responses: [],
};

export function initStore(ctx: ShellRuntimeContext): void {
  _ctx = ctx;
}

function ctx(): ShellRuntimeContext {
  if (!_ctx) throw new Error("[store] initStore() must be called before using the store.");
  return _ctx;
}

function isExplicitLocalPreview(): boolean {
  if (!import.meta.env.DEV) return false;
  if (typeof window === "undefined") return false;
  return ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
}

function ensureLocalPreview(): void {
  if (!isExplicitLocalPreview()) {
    throw new Error("[store] PlannerXchange shell context is required outside explicit localhost dev preview.");
  }
}

function isLive(): boolean {
  const c = ctx();
  if (!hasShellRuntimeSignals(c)) {
    ensureLocalPreview();
    return false;
  }
  if (!isShellHosted(c)) {
    throw new Error(
      "[store] Shell-hosted context detected without authenticatedFetch. " +
      "PX shell must inject ShellRuntimeContext.authenticatedFetch before mounting the app."
    );
  }
  return true;
}

type LiveShellRuntimeContext = ShellRuntimeContext & {
  authenticatedFetch: NonNullable<ShellRuntimeContext["authenticatedFetch"]>;
};

interface PXRecord<T> {
  recordId: string;
  payload: T;
}

function liveContext(): LiveShellRuntimeContext {
  if (!isLive()) {
    throw new Error("[store] PlannerXchange app-data call attempted outside a shell-hosted runtime.");
  }
  return ctx() as LiveShellRuntimeContext;
}

function withJsonHeader(init: RequestInit = {}): RequestInit {
  if (!init.body) return init;
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  return { ...init, headers };
}

async function pxFetch(path: string, init?: RequestInit): Promise<Response> {
  return liveContext().authenticatedFetch(path, withJsonHeader(init));
}

async function pxList<T>(recordType: string): Promise<PXRecord<T>[]> {
  const c = ctx();
  const params = new URLSearchParams({ recordType, firmId: c.firmId, limit: "100" });
  const res = await pxFetch(`/app-data?${params.toString()}`);
  if (!res.ok) throw new Error(`[store] GET /app-data?recordType=${recordType} failed: ${res.status}`);
  const data = (await res.json()) as { items: PXRecord<T>[] };
  return data.items;
}

async function pxGetById<T>(recordId: string): Promise<PXRecord<T> | undefined> {
  const res = await pxFetch(`/app-data/${encodeURIComponent(recordId)}`);
  if (res.status === 404) return undefined;
  if (!res.ok) throw new Error(`[store] GET /app-data/${recordId} failed: ${res.status}`);
  return res.json() as Promise<PXRecord<T>>;
}

async function pxCreate<T>(recordType: string, payload: T): Promise<PXRecord<T>> {
  const body = { recordType, schemaVersion: 1, firmId: ctx().firmId, payload };
  const res = await pxFetch("/app-data", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`[store] POST /app-data (${recordType}) failed: ${res.status}`);
  return res.json() as Promise<PXRecord<T>>;
}

async function pxPatch<T>(recordId: string, payloadPatch: Partial<T>): Promise<void> {
  const res = await pxFetch(`/app-data/${encodeURIComponent(recordId)}`, {
    method: "PATCH",
    body: JSON.stringify({ payload: payloadPatch }),
  });
  if (!res.ok) throw new Error(`[store] PATCH /app-data/${recordId} failed: ${res.status}`);
}

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function getTemplate(firmId: string): Promise<RTQTemplate> {
  if (isLive()) {
    const records = await pxList<RTQTemplate>("rtq_template");
    const match = records.find((r) => r.payload.firmId === firmId);
    if (match) return { ...match.payload, id: match.recordId };
    return { id: "", firmId, questions: DEFAULT_QUESTIONNAIRE.questions, updatedAt: new Date().toISOString() };
  }

  if (memoryStore.template && memoryStore.template.firmId === firmId) return memoryStore.template;
  memoryStore.template = {
    id: "tpl-default",
    firmId,
    questions: DEFAULT_QUESTIONNAIRE.questions,
    updatedAt: new Date().toISOString(),
  };
  return memoryStore.template;
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

  memoryStore.template = updated;
  return updated;
}

export async function getInvitations(firmId: string): Promise<RTQInvitation[]> {
  if (isLive()) {
    const records = await pxList<RTQInvitation>("rtq_invitation");
    return records
      .filter((r) => r.payload.firmId === firmId)
      .map((r) => ({ ...r.payload, id: r.recordId }));
  }

  return memoryStore.invitations.filter((i) => i.firmId === firmId);
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

  memoryStore.invitations = [...memoryStore.invitations, invitation];
  return invitation;
}

export async function getInvitationByToken(token: string): Promise<RTQInvitation | undefined> {
  if (isLive()) {
    const records = await pxList<RTQInvitation>("rtq_invitation");
    const match = records.find((r) => r.payload.token === token);
    return match ? { ...match.payload, id: match.recordId } : undefined;
  }

  return memoryStore.invitations.find((i) => i.token === token);
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

  memoryStore.invitations = memoryStore.invitations.map((inv) =>
    inv.id === invitationId
      ? { ...inv, status: "completed" as const, completedAt: new Date().toISOString(), responseId }
      : inv
  );
}

export async function getResponses(firmId: string): Promise<RTQResponse[]> {
  if (isLive()) {
    const records = await pxList<RTQResponse>("rtq_response");
    return records
      .filter((r) => r.payload.firmId === firmId)
      .map((r) => ({ ...r.payload, id: r.recordId }));
  }

  return memoryStore.responses.filter((r) => r.firmId === firmId);
}

export async function getResponseById(id: string): Promise<RTQResponse | undefined> {
  if (isLive()) {
    const record = await pxGetById<RTQResponse>(id);
    return record ? { ...record.payload, id: record.recordId } : undefined;
  }

  return memoryStore.responses.find((r) => r.id === id);
}

export async function saveResponse(response: Omit<RTQResponse, "id">): Promise<RTQResponse> {
  if (isLive()) {
    const record = await pxCreate<RTQResponse>("rtq_response", { ...response, id: "" });
    return { ...record.payload, id: record.recordId };
  }

  const full: RTQResponse = { ...response, id: `resp-${uid()}` };
  memoryStore.responses = [...memoryStore.responses, full];
  return full;
}
