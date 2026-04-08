import type { ShellRuntimeContext } from "./plannerxchange";

export function createMockRuntimeContext(
  containerElement: HTMLElement
): ShellRuntimeContext {
  return {
    tenantId: "plannerxchange-marketplace",
    enterpriseId: "plannerxchange-marketplace-enterprise",
    firmId: "north-harbor-advisors",
    userId: "advisor-user-001",
    userType: "firm_user",
    role: "advisor_user",
    appId: "risk-tolerance-questionnaire",
    appInstallationId: "rtq-installation-dev",
    publicationEnvironment: "dev",
    appBasename: "/apps/risk-tolerance-questionnaire",
    initialPath: "/questionnaire",
    visibility: "private",
    dataPortabilityMode: "plannerxchange_portable",
    permissions: [
      "tenant.read",
      "user.read",
      "branding.read",
      "legal.read",
      "canonical.household.read",
      "canonical.client.summary.read",
      "app_data.read",
      "app_data.write"
    ],
    branding: {
      tenantId: "plannerxchange-marketplace",
      enterpriseId: "plannerxchange-marketplace-enterprise",
      firmId: "north-harbor-advisors",
      primaryColor: "#184e77",
      secondaryColor: "#f4a261",
      fontColor: "#f7f5ef",
      supportEmail: "service@northharbor.example"
    },
    legal: {
      tenantId: "plannerxchange-marketplace",
      enterpriseId: "plannerxchange-marketplace-enterprise",
      firmId: "north-harbor-advisors",
      disclosureText:
        "For advisor-use demonstration only. Confirm suitability, review firm policy, and retain acknowledgements in the book of record."
    },
    containerElement
  };
}
