/**
 * Mock PX app-data store backed by localStorage.
 *
 * In a real PlannerXchange installation this module would call:
 *   GET  /app-data           — list records
 *   POST /app-data           — create record
 *   PATCH /app-data/{id}     — update record
 *
 * All requests require:
 *   Authorization: Bearer {idToken}
 *   x-plannerxchange-app-installation-id: {appInstallationId}
 *
 * TODO: replace localStorage calls with PX app-data API calls once a real
 *       installation context is available.
 */

import type { RTQInvitation, RTQResponse, RTQTemplate } from "../types/rtq";
import { DEFAULT_QUESTIONNAIRE } from "../data/defaultQuestionnaire";

const KEYS = {
  template: "rtq:template",
  invitations: "rtq:invitations",
  responses: "rtq:responses",
} as const;

// ── Helpers ──────────────────────────────────────────────────────────────────

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

// ── Template ─────────────────────────────────────────────────────────────────

export function getTemplate(firmId: string): RTQTemplate {
  const stored = readJSON<RTQTemplate | null>(KEYS.template, null);
  if (stored && stored.firmId === firmId) return stored;

  const fresh: RTQTemplate = {
    id: "tpl-default",
    firmId,
    questions: DEFAULT_QUESTIONNAIRE.questions,
    updatedAt: new Date().toISOString(),
  };
  writeJSON(KEYS.template, fresh);
  return fresh;
}

export function saveTemplate(template: RTQTemplate): RTQTemplate {
  const updated = { ...template, updatedAt: new Date().toISOString() };
  writeJSON(KEYS.template, updated);
  return updated;
}

// ── Invitations ───────────────────────────────────────────────────────────────

export function getInvitations(firmId: string): RTQInvitation[] {
  return readJSON<RTQInvitation[]>(KEYS.invitations, []).filter(
    (inv) => inv.firmId === firmId
  );
}

export function createInvitation(
  firmId: string,
  clientId: string,
  clientDisplayName: string,
  clientEmail: string
): RTQInvitation {
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

  const all = readJSON<RTQInvitation[]>(KEYS.invitations, []);
  writeJSON(KEYS.invitations, [...all, invitation]);
  return invitation;
}

export function getInvitationByToken(token: string): RTQInvitation | undefined {
  return readJSON<RTQInvitation[]>(KEYS.invitations, []).find(
    (inv) => inv.token === token
  );
}

export function markInvitationCompleted(
  invitationId: string,
  responseId: string
): void {
  const all = readJSON<RTQInvitation[]>(KEYS.invitations, []);
  writeJSON(
    KEYS.invitations,
    all.map((inv) =>
      inv.id === invitationId
        ? { ...inv, status: "completed" as const, completedAt: new Date().toISOString(), responseId }
        : inv
    )
  );
}

// ── Responses ─────────────────────────────────────────────────────────────────

export function getResponses(firmId: string): RTQResponse[] {
  return readJSON<RTQResponse[]>(KEYS.responses, []).filter(
    (r) => r.firmId === firmId
  );
}

export function getResponseById(id: string): RTQResponse | undefined {
  return readJSON<RTQResponse[]>(KEYS.responses, []).find((r) => r.id === id);
}

export function saveResponse(response: Omit<RTQResponse, "id">): RTQResponse {
  const full: RTQResponse = { ...response, id: `resp-${uid()}` };
  const all = readJSON<RTQResponse[]>(KEYS.responses, []);
  writeJSON(KEYS.responses, [...all, full]);
  return full;
}
