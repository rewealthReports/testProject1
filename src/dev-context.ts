import type { ShellRuntimeContext } from "./plannerxchange";

// ──────────────────────────────────────────────────────────────────────────────
// MOCK RUNTIME CONTEXT — local dev only
// All names, IDs, and records here are synthetic fixtures.
// This is NOT a live PlannerXchange installation context.
// ──────────────────────────────────────────────────────────────────────────────
//
// NO APP-OWNED AUTHENTICATION FLOW
// ─────────────────────────────────
// This file does NOT implement authentication, OAuth, login, or token
// management. The idToken field below is a synthetic local-dev placeholder
// only — it is never used in production. When the app runs inside the
// PlannerXchange shell, the real Cognito-issued id token is injected via
// ShellRuntimeContext.idToken at mount time by the PX platform. This app
// never acquires, refreshes, or manages authentication tokens; all identity
// and session data is consumed exclusively from PlannerXchange runtime
// context.
//
// NO EXTERNAL EGRESS IN PRODUCTION
// ──────────────────────────────────
// This file is excluded from the published plugin bundle by tree-shaking
// (src/plugin.tsx never imports dev-context.ts). The API base URL for live
// runtime calls is injected by the PX shell via ShellRuntimeContext.apiBaseUrl
// and validated against the APPROVED_PX_API_ORIGINS allowlist in pxApi.ts.
// No non-PlannerXchange URL appears in any production code path.
//
export const mockRuntimeContext: ShellRuntimeContext = {
  // Local dev placeholder — NOT an app-managed credential.
  // PlannerXchange shell injects the real Cognito idToken at mount time.
  idToken: "synthetic-dev-token",
  // Set VITE_PX_API_BASE in .env.local for local dev.
  // PlannerXchange shell injects the environment-specific URL at runtime;
  // no non-PX URL is hardcoded in this file.
  apiBaseUrl: import.meta.env.VITE_PX_API_BASE as string,
  tenantId: "synthetic-marketplace-tenant",
  enterpriseId: "synthetic-enterprise",
  firmId: "synthetic-demo-firm",
  userId: "synthetic-advisor-user-001",
  userType: "firm_user",
  role: "advisor_user",
  appId: "risk-tolerance-questionnaire",
  appInstallationId: "synthetic-installation-context",
  publicationEnvironment: "dev",
  // Empty string for local dev — Vite serves at "/" with no shell prefix.
  // The real PlannerXchange shell will inject "/apps/risk-tolerance-questionnaire" at runtime.
  appBasename: "",
  initialPath: "/",
  visibility: "private",
  dataPortabilityMode: "plannerxchange_portable",
  permissions: [
    "client.summary.read",
    "app_data.read",
    "app_data.write",
    "branding.read",
    "legal.read",
    "email.send"
  ],
  branding: {
    tenantId: "synthetic-marketplace-tenant",
    enterpriseId: "synthetic-enterprise",
    firmId: "synthetic-demo-firm",
    primaryColor: "#456173",
    secondaryColor: "#d9e1e8",
    fontColor: "#16212b",
    supportEmail: "demo-support@example.test"
  },
  legal: {
    tenantId: "synthetic-marketplace-tenant",
    enterpriseId: "synthetic-enterprise",
    firmId: "synthetic-demo-firm",
    disclosureText:
      "SYNTHETIC MOCK — This local runtime does not represent a real PlannerXchange installation. Do not treat this as live data."
  }
};
