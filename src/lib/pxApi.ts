/**
 * PlannerXchange API integration layer.
 *
 * Hosted API calls must go through ShellRuntimeContext.authenticatedFetch. The
 * PlannerXchange shell owns auth, tenancy, installation, and governance headers;
 * app code must not read tokens or construct auth headers.
 */

import type { PXClientSummary } from "../types/rtq";
import { hasShellRuntimeSignals, isShellHosted } from "../plannerxchange";
import type { BrandingProfile, LegalProfile, ShellRuntimeContext } from "../plannerxchange";

export function isLive(ctx: ShellRuntimeContext): boolean {
  if (!hasShellRuntimeSignals(ctx)) {
    return false;
  }
  if (!isShellHosted(ctx)) {
    throw new Error(
      "[pxApi] Shell-hosted context detected without authenticatedFetch. " +
      "PX shell must inject ShellRuntimeContext.authenticatedFetch before mounting the app."
    );
  }
  return true;
}

type LiveShellRuntimeContext = ShellRuntimeContext & {
  authenticatedFetch: NonNullable<ShellRuntimeContext["authenticatedFetch"]>;
};

function liveContext(ctx: ShellRuntimeContext): LiveShellRuntimeContext {
  if (!isLive(ctx)) {
    throw new Error("[pxApi] PlannerXchange API call attempted outside a shell-hosted runtime.");
  }
  return ctx as LiveShellRuntimeContext;
}

function withJsonHeader(init: RequestInit = {}): RequestInit {
  if (!init.body) return init;
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  return { ...init, headers };
}

async function pxFetch(ctx: ShellRuntimeContext, path: string, init?: RequestInit): Promise<Response> {
  return liveContext(ctx).authenticatedFetch(path, withJsonHeader(init));
}

export async function fetchClientSummaries(ctx: ShellRuntimeContext): Promise<PXClientSummary[]> {
  if (isLive(ctx)) {
    const res = await pxFetch(ctx, "/client-users");
    if (!res.ok) throw new Error(`GET /client-users failed: ${res.status}`);
    const data = await res.json();
    return data.items as PXClientSummary[];
  }

  await delay(150);
  return [];
}

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

export async function sendTransactionalEmail(
  ctx: ShellRuntimeContext,
  payload: SendEmailRequest
): Promise<{ messageId: string; sentAt: string; status: string }> {
  if (isLive(ctx)) {
    const res = await pxFetch(ctx, "/app-email/send", {
      method: "POST",
      body: JSON.stringify({ ...payload, templateSlug: null }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { message?: string };
      throw new Error(err.message ?? `Email send failed: ${res.status}`);
    }
    return res.json();
  }

  await delay(300);
  console.info(
    "[DEV /app-email/send] No shell-owned PlannerXchange transport; email not sent.",
    {
      subject: payload.subject,
      clientUserId: payload.clientUserId,
      appRecordId: payload.appRecordId,
    }
  );
  return { messageId: "dev-mock-" + Date.now(), sentAt: new Date().toISOString(), status: "dev_logged" };
}

export async function fetchBranding(ctx: ShellRuntimeContext): Promise<BrandingProfile> {
  if (isLive(ctx)) {
    const res = await pxFetch(ctx, "/branding/current");
    if (!res.ok) throw new Error(`GET /branding/current failed: ${res.status}`);
    const { branding } = await res.json() as { branding: BrandingProfile };
    return branding;
  }

  await delay(50);
  return ctx.branding;
}

export async function fetchLegal(ctx: ShellRuntimeContext): Promise<LegalProfile> {
  if (isLive(ctx)) {
    const res = await pxFetch(ctx, "/legal/current");
    if (!res.ok) throw new Error(`GET /legal/current failed: ${res.status}`);
    const { legal } = await res.json() as { legal: LegalProfile };
    return legal;
  }

  await delay(50);
  return ctx.legal;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
