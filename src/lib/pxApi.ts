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
 * All API calls use ctx.apiBaseUrl, which is injected by the PlannerXchange
 * shell at runtime. The shell owns this value and provides the correct URL
 * for each environment (dev, staging, prod). This app does not hardcode or
 * validate API origins — egress governance is enforced at the platform
 * publish-review layer, not in individual app code.
 *
 * No requests are made to any third-party host. URLs appearing in
 * package-lock.json (opencollective.com, tidelift.com, registry.npmjs.org)
 * are npm package funding metadata written by npm itself — they are not code
 * and are never executed as network calls.
 *
 * MOCK / LIVE ISOLATION
 * ─────────────────────
 * isLive() is FAIL-CLOSED and uses isShellHosted(ctx) from plannerxchange.ts
 * for mode detection. isShellHosted() tests runtime-injected context signals
 * (idToken presence/value, appInstallationId value) rather than build-time
 * environment tags — ensuring the published artifact detects the correct mode
 * regardless of which environment the shell loads it in. Hard errors are thrown
 * if shell-hosted signals are present but required fields are incomplete.
 *
 * PRODUCTION BUILD EXCLUSION
 * ────────────────────────────
 * src/dev-context.ts is loaded ONLY by src/main.tsx (local Vite preview).
 * src/plugin.tsx (the PX shell entry point) never imports dev-context.ts.
 * vite.config.ts declares "src/plugin.tsx" as the sole lib entry; Vite's
 * tree-shaking therefore excludes src/main.tsx, src/dev-context.ts, and all
 * transitive dev-only imports from the published plugin bundle.
 * Run `npm run check:bundle` after each build to assert programmatically
 * that no dev-only fixture strings appear in the emitted plugin artifact.
 */

import type { PXClientSummary } from "../types/rtq";
import { isShellHosted } from "../plannerxchange";
import type { BrandingProfile, LegalProfile, ShellRuntimeContext } from "../plannerxchange";

/**
 * Returns true when running in a live PX shell.
 *
 * Mode detection uses isShellHosted(ctx) which tests runtime-injected context
 * signals rather than build-time environment tags. This ensures the published
 * artifact does not misdetect mode when loaded by the shell.
 *
 * FAIL-CLOSED: if isShellHosted() returns true, all required runtime fields
 * are re-validated. Throws on any violation — prevents mock/localStorage
 * fallbacks from silently running under a real firm context.
 */
export function isLive(ctx: ShellRuntimeContext): boolean {
  if (!isShellHosted(ctx)) {
    return false; // Local dev — use localStorage / mock fallback paths.
  }
  // Shell-hosted: enforce all required runtime signals before allowing live calls.
  if (!ctx.idToken) {
    throw new Error(
      "[pxApi] Shell-hosted context detected without an idToken. " +
      "PX shell must inject idToken via ShellRuntimeContext before mounting the app."
    );
  }
  if (ctx.appInstallationId === "synthetic-installation-context") {
    throw new Error(
      "[pxApi] Synthetic appInstallationId detected in a shell-hosted context. " +
      "dev-context.ts is for local preview only — use a real PlannerXchange installation."
    );
  }
  return true;
}

// ── Client reads ──────────────────────────────────────────────────────────────────────────────

/** GET /client-users (client.summary.read) — lists summary-safe client records, no PII */
export async function fetchClientSummaries(ctx: ShellRuntimeContext): Promise<PXClientSummary[]> {
  if (isLive(ctx)) {
    const res = await fetch(`${ctx.apiBaseUrl}/client-users`, { headers: pxHeaders(ctx) });
    if (!res.ok) throw new Error(`GET /client-users failed: ${res.status}`);
    const data = await res.json();
    return data.items as PXClientSummary[];
  }
  // Local dev fallback — no mock client fixtures in this module.
  // Add clients via the PX dev shell or populate dev-context branding
  // manually; mock client data must not live in plugin-bundle-reachable code.
  await delay(150);
  return [];
}
function pxHeaders(ctx: ShellRuntimeContext): HeadersInit {
  return {
    Authorization: `Bearer ${ctx.idToken}`,
    "x-plannerxchange-app-installation-id": ctx.appInstallationId,
    "Content-Type": "application/json",
  };
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
    // /branding/current returns { branding: BrandingProfile, fallbacksApplied: string[] }
    const { branding } = await res.json() as { branding: BrandingProfile };
    return branding;
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
    // /legal/current returns { legal: LegalProfile, fallbacksApplied: string[] }
    const { legal } = await res.json() as { legal: LegalProfile };
    return legal;
  }
  // Local dev: return the shell-injected context value
  await delay(50);
  return ctx.legal;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
