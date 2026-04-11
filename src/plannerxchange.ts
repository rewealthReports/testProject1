export type UserType = "firm_user" | "client_user";
export type KnownFrontendFramework = "react" | "vue" | "nextjs" | "html-js";
export type FrontendFramework = KnownFrontendFramework | (string & {});
export type AppVisibility =
  | "private"
  | "shared_with_specific_users"
  | "marketplace_listed";
export type AppDataPortabilityMode =
  | "plannerxchange_portable"
  | "app_managed_nonportable";
// Legacy summary-safe client-user routes and current canonical entity routes
// use different scope families. Student apps should prefer the `canonical.*`
// scopes when targeting `/canonical/*` APIs.
export type AppPermissionScope =
  | "tenant.read"
  | "user.read"
  | "household.read"
  | "client.summary.read"
  | "client.sensitive.read"
  | "canonical.household.read"
  | "canonical.client.summary.read"
  | "canonical.client.sensitive.read"
  | "canonical.account.read"
  | "canonical.position.read"
  | "canonical.transaction.read"
  | "canonical.cost_basis.read"
  | "canonical.security.read"
  | "canonical.model.read"
  | "canonical.sleeve.read"
  | "account.read"
  | "position.read"
  | "transaction.read"
  | "cost_basis.read"
  | "security.read"
  | "model.read"
  | "app_access.read"
  | "feature_entitlements.read"
  | "branding.read"
  | "legal.read"
  | "app_data.read"
  | "app_data.write"
  | "email.send";

export interface BrandingProfile {
  tenantId: string;
  enterpriseId?: string;
  firmId?: string;
  primaryColor: string;
  secondaryColor?: string;
  fontColor?: string;
  logoUrl?: string;
  faviconUrl?: string;
  supportEmail?: string;
}

export interface LegalProfile {
  tenantId: string;
  enterpriseId?: string;
  firmId?: string;
  appId?: string;
  disclosureText: string;
  privacyPolicyUrl?: string;
  termsUrl?: string;
}

export interface PlannerXchangeManifest {
  slug: string;
  name: string;
  version: string;
  summary?: string;
  description?: string;
  priceLabel?: string;
  thumbnailUrl?: string;
  previewVideoUrl?: string;
  framework: FrontendFramework;
  entryPoint: string;
  permissions: AppPermissionScope[];
  configSchemaVersion: number;
  visibility: AppVisibility;
  dataPortabilityMode: AppDataPortabilityMode;
  categories: string[];
}

export interface ShellRuntimeContext {
  tenantId: string;
  enterpriseId: string;
  firmId: string;
  userId: string;
  userType: UserType;
  role: string;
  appId: string;
  appInstallationId: string;
  publicationEnvironment: "dev" | "prod";
  visibility: AppVisibility;
  dataPortabilityMode: AppDataPortabilityMode;
  permissions: AppPermissionScope[];
  branding: BrandingProfile;
  legal: LegalProfile;
  /**
   * The shell-scoped path prefix for this app, e.g. "/apps/my-tool".
   * Use this as the `basename` for your client-side router so in-app
   * navigation stays within the shell-owned URL space.
   */
  appBasename: string;
  /**
   * The current in-app path relative to `appBasename`, e.g. "/households/abc123".
   * Initialize your router at this path so deep links render the correct view.
   * Defaults to "/" when the user navigates to the app root.
   */
  initialPath: string;
  /**
   * Bearer token for the current PX auth session.
   * Injected by the PlannerXchange shell at runtime; provided by dev-context.ts
   * in local preview. Pass this as `Authorization: Bearer {idToken}` on all
   * PX API calls. The app must never create a parallel auth system or store
   * this token.
   */
  idToken: string;
  /**
   * The base URL for PlannerXchange API calls.
   * Apps should use this instead of hardcoding API URLs so they work correctly
   * across dev, staging, and production environments. The shell injects the
   * correct base URL for the current environment.
   */
  apiBaseUrl: string;
}

export interface PlannerXchangePluginModule {
  manifest: PlannerXchangeManifest;
  mount: (context: ShellRuntimeContext) => Promise<void> | void;
}

// ── Canonical data types ──────────────────────────────────────────────────────

/** Firm-scoped household record (canonical.household.read or canonical.client.*.read) */
export interface CanonicalHousehold {
  id: string;
  firmId: string;
  name: string;
  status: string;
  taxState?: string;
  latestTaxYear?: number | null;
  latestTaxDataSource?: string | null;
  taxDataStatus?: string | null;
  assignedAdvisorUserIds?: string[];
}

/** Summary-safe canonical client record (no raw PII fields) */
export interface CanonicalClientSummary {
  id: string;
  firmId: string;
  householdId: string;
  displayName: string;
  status: string;
  summaryFlags?: {
    hasRestrictedPii: boolean;
    hasLinkedAccounts: boolean;
  };
}

/** Generic paginated list response returned by PX list endpoints */
export interface ListResponse<T> {
  items: T[];
  pageInfo?: {
    hasNextPage: boolean;
    cursor?: string;
  };
}

/** Source reference linking an app-data record to a canonical entity */
export interface SourceRef {
  sourceType: "canonical_household" | "canonical_client" | "canonical_account" | "manual_entry" | (string & {});
  sourceId: string;
  asOf: string;
}

/** Generic builder-owned app-data record (app_data.read / app_data.write) */
export interface AppDataRecord<TPayload = Record<string, unknown>> {
  recordId: string;
  recordType: string;
  title: string;
  status: "draft" | "final" | "archived" | (string & {});
  schemaVersion: number;
  appId: string;
  appInstallationId: string;
  firmId: string;
  householdId?: string | null;
  clientUserId?: string | null;
  accountId?: string | null;
  sourceRefs: SourceRef[];
  payload: TPayload;
  createdAt: string;
  updatedAt: string;
  createdByUserId: string;
  updatedByUserId: string;
}

// ── RTQ-specific payload types ────────────────────────────────────────────────

/** Recommended portfolio allocation stored in a questionnaire response */
export interface QuestionnaireAllocation {
  equity: number;
  fixedIncome: number;
  cash: number;
}

/** Payload stored inside an AppDataRecord for a completed RTQ response */
export interface QuestionnaireResponsePayload {
  questionnaireVersion: number;
  householdName: string;
  respondentName: string;
  respondentRole: "advisor_facilitated" | "self_service" | "joint";
  respondentClientId?: string | null;
  riskBand: string;
  riskScore: number;
  maxScore: number;
  percentage: number;
  recommendedAllocation: QuestionnaireAllocation;
  narrative: string;
  notes?: string | null;
  answers: unknown[];
  completedAt: string;
  recommendedReviewDate: string;
}
