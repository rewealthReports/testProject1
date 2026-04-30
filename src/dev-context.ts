import type { ShellRuntimeContext } from "./plannerxchange";

// Local preview context only. Hosted PlannerXchange API calls use the
// shell-injected ShellRuntimeContext.authenticatedFetch transport; this mock
// context intentionally omits that transport so dev storage/mock paths remain
// isolated from production runtime behavior.
export const mockRuntimeContext: ShellRuntimeContext = {
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
      "SYNTHETIC MOCK - This local runtime does not represent a real PlannerXchange installation. Do not treat this as live data."
  }
};
