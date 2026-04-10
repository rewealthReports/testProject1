import type { ShellRuntimeContext } from "./plannerxchange";

// ──────────────────────────────────────────────────────────────────────────────
// MOCK RUNTIME CONTEXT — local dev only
// All names, IDs, and records here are synthetic fixtures.
// This is NOT a live PlannerXchange installation context.
// ──────────────────────────────────────────────────────────────────────────────
export const mockRuntimeContext: ShellRuntimeContext = {
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
