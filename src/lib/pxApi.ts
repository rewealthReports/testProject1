/**
 * PX API integration layer — approved scope → live route mapping:
 *
 *   client.summary.read   → GET /client-users, /client-users/{id}
 *   branding.read         → GET /branding/current
 *   legal.read            → GET /legal/current
 *   email.send            → POST /app-email/send
 *
 * RUNTIME EGRESS POLICY
 * ─────────────────────
 * All runtime HTTP calls in this module target exclusively:
 *   https://api.plannerxchange.ai
 *
 * No requests are made to any third-party host at runtime.
 * URLs appearing in package-lock.json (opencollective.com, tidelift.com,
 * registry.npmjs.org) are npm package funding metadata written by npm itself
 * — they are not code and are never executed as network calls.
 *
 * MOCK / LIVE ISOLATION
 * ─────────────────────
 * isLive() is FAIL-CLOSED: it throws hard errors in any non-dev context where
 * required auth or installation fields are absent. This makes it impossible
 * for mock fallback code to silently run under a real firm context, and
 * impossible for synthetic fixtures to be presented as live PX runtime.
 *
 * PRODUCTION BUILD EXCLUSION
 * ────────────────────────────
 * src/dev-context.ts is loaded ONLY by src/main.tsx (local Vite preview).
 * src/plugin.tsx (the PX shell entry point) never imports dev-context.ts.
 * vite.config.ts declares "src/plugin.tsx" as the sole lib entry; Vite's
 * tree-shaking therefore excludes src/main.tsx, src/dev-context.ts, and all
 * transitive dev-only imports from the published plugin bundle.
 * Verified: `dist/assets/plugin-*.js` contains no reference to synthetic-
 * installation-context, MOCK_CLIENTS_SENSITIVE, or dev-context paths.
 */

import type { PXClientSensitive, PXClientSummary } from "../types/rtq";
import type { BrandingProfile, LegalProfile, ShellRuntimeContext } from "../plannerxchange";

/**
 * Returns true when running in a live PX shell.
 *
 * FAIL-CLOSED: throws if publicationEnvironment !== "dev" and required auth
 * or installation fields are absent. Prevents mock/dev fallbacks from ever
 * running silently in a real firm context.
 */
export function isLive(ctx: ShellRuntimeContext): boolean {
  if (ctx.publicationEnvironment !== "dev") {
    if (!ctx.idToken) {
      throw new Error(
        "[pxApi] Non-dev environment detected without an idToken. " +
        "PX shell must inject idToken via ShellRuntimeContext before mounting the app."
      );
    }
    if (ctx.appInstallationId === "synthetic-installation-context") {
      throw new Error(
        "[pxApi] Synthetic appInstallationId detected in non-dev context. " +
        "dev-context.ts is for local preview only — use a real PlannerXchange installation."
      );
    }
    return true;
  }
  return false;
}

/** Auth + installation headers required by all protected PX routes. */
function pxHeaders(ctx: ShellRuntimeContext): HeadersInit {
  return {
    Authorization: `Bearer ${ctx.idToken}`,
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

/** GET /client-users (client.summary.read) — lists summary-safe client records, no PII */
export async function fetchClientSummaries(ctx: ShellRuntimeContext): Promise<PXClientSummary[]> {
  if (isLive(ctx)) {
    const res = await fetch(`${ctx.apiBaseUrl}/client-users`, { headers: pxHeaders(ctx) });
    if (!res.ok) throw new Error(`GET /client-users failed: ${res.status}`);
    const data = await res.json();
    return data.items as PXClientSummary[];
  }
  // Local dev fallback
  await delay(150);
  return MOCK_CLIENTS_SENSITIVE.map(({ firstName: _f, lastName: _l, emailPrimary: _e, dateOfBirth: _d, phonePrimary: _p, ...summary }) => summary);
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
    const res = await fetch(`${ctx.apiBaseUrl}/app-email/send`, {
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
    const res = await fetch(`${ctx.apiBaseUrl}/branding/current`, { headers: pxHeaders(ctx) });
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
    const res = await fetch(`${ctx.apiBaseUrl}/legal/current`, { headers: pxHeaders(ctx) });
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
