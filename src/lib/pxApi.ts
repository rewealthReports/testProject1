/**
 * PX API integration layer for:
 *   - canonical client reads (summary + sensitive)
 *   - outbound transactional email (POST /app-email/send)
 *
 * When running inside a real PlannerXchange shell (publicationEnvironment !== "dev"
 * and an idToken is available), calls go to the live PX API:
 *   GET  /clients                          — canonical.client.summary.read
 *   GET  /households/{hId}/clients/{cId}   — canonical.client.sensitive.read
 *   POST /app-email/send                   — email.send
 *
 * In local dev the functions fall back to synthetic mock fixtures so the UI
 * remains fully exercisable without a real installation context.
 */

import type { PXClientSensitive, PXClientSummary } from "../types/rtq";
import type { ShellRuntimeContext } from "../plannerxchange";

const PX_BASE = "https://api.plannerxchange.ai";

/** True when running inside a real PX shell with a live auth session. */
function isLive(ctx: ShellRuntimeContext): boolean {
  return ctx.publicationEnvironment !== "dev" && !!ctx.idToken;
}

/** Auth + installation headers required by all protected PX routes. */
function pxHeaders(ctx: ShellRuntimeContext): HeadersInit {
  return {
    Authorization: `Bearer ${ctx.idToken ?? ""}`,
    "x-plannerxchange-app-installation-id": ctx.appInstallationId,
    "Content-Type": "application/json",
  };
}

// ── Synthetic client fixtures (obviously fake) ────────────────────────────────

export const MOCK_CLIENTS_SENSITIVE: PXClientSensitive[] = [
  {
    id: "cl_synthetic_001",
    firmId: "synthetic-demo-firm",
    householdId: "hh_synthetic_001",
    displayName: "Alex Testington",
    status: "active",
    firstName: "Alex",
    lastName: "Testington",
    emailPrimary: "alex.testington@example.test",
  },
  {
    id: "cl_synthetic_002",
    firmId: "synthetic-demo-firm",
    householdId: "hh_synthetic_002",
    displayName: "Brooke Demosample",
    status: "active",
    firstName: "Brooke",
    lastName: "Demosample",
    emailPrimary: "brooke.demosample@example.test",
  },
  {
    id: "cl_synthetic_003",
    firmId: "synthetic-demo-firm",
    householdId: "hh_synthetic_003",
    displayName: "Chris Placeholder",
    status: "active",
    firstName: "Chris",
    lastName: "Placeholder",
    emailPrimary: "chris.placeholder@example.test",
  },
  {
    id: "cl_synthetic_004",
    firmId: "synthetic-demo-firm",
    householdId: "hh_synthetic_004",
    displayName: "Dana Fakename",
    status: "active",
    firstName: "Dana",
    lastName: "Fakename",
    emailPrimary: "dana.fakename@example.test",
  },
  {
    // Test client — real email for local dev flow testing only.
    // Remove or replace before publishing.
    id: "cl_test_dillon",
    firmId: "synthetic-demo-firm",
    householdId: "hh_test_dillon",
    displayName: "Dillon Kenniston (Test)",
    status: "active",
    firstName: "Dillon",
    lastName: "Kenniston",
    emailPrimary: "dillon.kenniston@gmail.com",
  },
];

// ── Client reads ──────────────────────────────────────────────────────────────

/** GET /clients (canonical.client.summary.read) */
export async function fetchClientSummaries(ctx: ShellRuntimeContext): Promise<PXClientSummary[]> {
  if (isLive(ctx)) {
    const res = await fetch(`${PX_BASE}/clients`, { headers: pxHeaders(ctx) });
    if (!res.ok) throw new Error(`GET /clients failed: ${res.status}`);
    const data = await res.json();
    return data.items as PXClientSummary[];
  }
  // Local dev fallback
  await delay(150);
  return MOCK_CLIENTS_SENSITIVE.map(({ firstName: _f, lastName: _l, emailPrimary: _e, dateOfBirth: _d, phonePrimary: _p, ...summary }) => summary);
}

/** GET /households/{hId}/clients/{cId} (canonical.client.sensitive.read) */
export async function fetchClientSensitive(
  ctx: ShellRuntimeContext,
  clientId: string
): Promise<PXClientSensitive | undefined> {
  if (isLive(ctx)) {
    // Resolve householdId from the summary list first, then fetch sensitive record.
    const summaries = await fetchClientSummaries(ctx);
    const summary = summaries.find((c) => c.id === clientId);
    if (!summary) return undefined;
    const res = await fetch(
      `${PX_BASE}/households/${summary.householdId}/clients/${clientId}`,
      { headers: pxHeaders(ctx) }
    );
    if (res.status === 404) return undefined;
    if (!res.ok) throw new Error(`GET /households/{hId}/clients/${clientId} failed: ${res.status}`);
    return res.json() as Promise<PXClientSensitive>;
  }
  // Local dev fallback
  await delay(100);
  return MOCK_CLIENTS_SENSITIVE.find((c) => c.id === clientId);
}

// ── Transactional email ───────────────────────────────────────────────────────

export interface SendEmailRequest {
  to: string;
  toName: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  replyTo?: string;
  fromLabel?: string;
  clientUserId: string;
  appRecordId: string;
}

/**
 * POST /app-email/send (email.send scope required)
 *
 * In a real PX shell, routes through the PlannerXchange-managed relay.
 * The app never holds sending credentials — PX owns transport and compliance.
 *
 * Do NOT use for auth lifecycle emails (invite, verify, password reset/setup)
 * — those are PlannerXchange-owned flows.
 *
 * In local dev (no live idToken), logs to console instead of sending.
 */
export async function sendTransactionalEmail(
  ctx: ShellRuntimeContext,
  payload: SendEmailRequest
): Promise<{ messageId: string; sentAt: string; status: string }> {
  if (isLive(ctx)) {
    const res = await fetch(`${PX_BASE}/app-email/send`, {
      method: "POST",
      headers: pxHeaders(ctx),
      body: JSON.stringify({ ...payload, templateSlug: null }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { message?: string };
      throw new Error(err.message ?? `Email send failed: ${res.status}`);
    }
    return res.json();
  }
  // Local dev fallback — log payload, return a synthetic receipt
  await delay(300);
  console.info(
    "[DEV /app-email/send] No live PX session — email not sent. Payload:\n",
    JSON.stringify(payload, null, 2)
  );
  return { messageId: "dev-mock-"+Date.now(), sentAt: new Date().toISOString(), status: "dev_logged" };
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
