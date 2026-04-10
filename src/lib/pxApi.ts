/**
 * PX API integration layer — approved scope → route mapping:
 *
 *   client.summary.read   → GET /client-users, /client-users/{id}
 *   client.sensitive.read → Reserved (no live routes yet; falls back to mock)
 *   branding.read         → GET /branding/current
 *   legal.read            → GET /legal/current
 *   email.send            → POST /app-email/send
 *
 * All protected calls require:
 *   Authorization: Bearer {idToken}
 *   x-plannerxchange-app-installation-id: {appInstallationId}
 *
 * When publicationEnvironment === "dev" or idToken is absent, every function
 * falls back to synthetic fixtures / console logging so the full UI remains
 * exercisable without a live PX installation.
 */

import type { PXClientSensitive, PXClientSummary } from "../types/rtq";
import type { BrandingProfile, LegalProfile, ShellRuntimeContext } from "../plannerxchange";

const PX_BASE = "https://api.plannerxchange.ai";

/** True when running inside a real PX shell with a live auth session. */
export function isLive(ctx: ShellRuntimeContext): boolean {
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

/** GET /client-users (client.summary.read) — lists summary-safe client records */
export async function fetchClientSummaries(ctx: ShellRuntimeContext): Promise<PXClientSummary[]> {
  if (isLive(ctx)) {
    const res = await fetch(`${PX_BASE}/client-users`, { headers: pxHeaders(ctx) });
    if (!res.ok) throw new Error(`GET /client-users failed: ${res.status}`);
    const data = await res.json();
    return data.items as PXClientSummary[];
  }
  // Local dev fallback
  await delay(150);
  return MOCK_CLIENTS_SENSITIVE.map(({ firstName: _f, lastName: _l, emailPrimary: _e, dateOfBirth: _d, phonePrimary: _p, ...summary }) => summary);
}

/**
 * client.sensitive.read — routes are Reserved in the current PX release.
 * Returns undefined in a live context until PX publishes these routes.
 * Local dev returns full mock records (including emailPrimary).
 */
export async function fetchClientSensitive(
  ctx: ShellRuntimeContext,
  clientId: string
): Promise<PXClientSensitive | undefined> {
  if (isLive(ctx)) {
    console.warn(`[pxApi] client.sensitive.read routes are Reserved; cannot fetch PII for ${clientId} in live context.`);
    return undefined;
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
 * Governance controls:
 *   - Send is always user-intent-gated: advisor explicitly triggers per-client invite
 *   - Payload is minimum-necessary: questionnaire link only, no PX client PII in body
 *   - Recipient is always the PX-canonical client email (no free-form advisor entry)
 *   - clientUserId + appRecordId provide full PX relay audit traceability
 *   - No bulk or cold-outreach use — one explicit email per invite action
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

// ── Branding & legal ──────────────────────────────────────────────────────────

/**
 * GET /branding/current (branding.read scope required)
 *
 * Returns the resolved BrandingProfile for the current firm context.
 * The shell also injects branding via ShellRuntimeContext.branding at mount
 * time; this function lets the app refresh it explicitly and confirms
 * branding.read scope consumption to the PX platform scanner.
 */
export async function fetchBranding(ctx: ShellRuntimeContext): Promise<BrandingProfile> {
  if (isLive(ctx)) {
    const res = await fetch(`${PX_BASE}/branding/current`, { headers: pxHeaders(ctx) });
    if (!res.ok) throw new Error(`GET /branding/current failed: ${res.status}`);
    return res.json() as Promise<BrandingProfile>;
  }
  // Local dev: return the shell-injected context value
  await delay(50);
  return ctx.branding;
}

/**
 * GET /legal/current (legal.read scope required)
 *
 * Returns the resolved LegalProfile (disclosure text, privacy policy URL, etc.)
 * for the current firm and app context.
 * The shell also injects legal via ShellRuntimeContext.legal at mount time;
 * this function lets the app refresh it explicitly and confirms legal.read
 * scope consumption to the PX platform scanner.
 */
export async function fetchLegal(ctx: ShellRuntimeContext): Promise<LegalProfile> {
  if (isLive(ctx)) {
    const res = await fetch(`${PX_BASE}/legal/current`, { headers: pxHeaders(ctx) });
    if (!res.ok) throw new Error(`GET /legal/current failed: ${res.status}`);
    return res.json() as Promise<LegalProfile>;
  }
  // Local dev: return the shell-injected context value
  await delay(50);
  return ctx.legal;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
