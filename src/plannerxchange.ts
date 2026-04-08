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
export type AppPermissionScope =
  | "tenant.read"
  | "user.read"
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
  | "canonical.tax.summary.read"
  | "canonical.tax.detail.read"
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
  appBasename: string;
  initialPath: string;
  containerElement: HTMLElement;
}

export interface PlannerXchangePluginModule {
  manifest: PlannerXchangeManifest;
  mount: (context: ShellRuntimeContext) => Promise<void> | void;
  unmount: () => Promise<void> | void;
}

export interface PageInfo {
  limit: number;
  nextCursor?: string | null;
}

export interface ListResponse<TItem> {
  items: TItem[];
  pageInfo: PageInfo;
}

export interface CanonicalHousehold {
  id: string;
  firmId: string;
  name: string;
  status: string;
  externalId?: string | null;
  taxFilingStatus?: string | null;
  taxState?: string | null;
  latestTaxYear?: number | null;
  latestTaxFilingId?: string | null;
  latestTaxDataSource?: string | null;
  latestTaxSyncedAt?: string | null;
  taxDataStatus?: string | null;
  assignedAdvisorUserIds?: string[];
  customFields?: Record<string, string>;
}

export interface CanonicalClientSummary {
  id: string;
  firmId: string;
  householdId: string;
  displayName: string;
  status: string;
  summaryFlags?: {
    hasRestrictedPii?: boolean;
    hasLinkedAccounts?: boolean;
  };
}

export interface AppDataSourceRef {
  sourceType: string;
  sourceId: string;
  sourceSystem?: string;
  asOf: string;
}

export interface AppDataRecord<TPayload> {
  recordId: string;
  recordType: string;
  title: string;
  status: "draft" | "final" | "archived";
  schemaVersion: number;
  appId: string;
  appInstallationId: string;
  firmId: string;
  clientUserId?: string | null;
  householdId?: string | null;
  accountId?: string | null;
  sourceRefs: AppDataSourceRef[];
  payload: TPayload;
  createdAt: string;
  updatedAt: string;
  createdByUserId: string;
  updatedByUserId: string;
}

export interface QuestionnaireAnswer {
  questionId: string;
  prompt: string;
  label: string;
  score: number;
}

export interface QuestionnaireAllocation {
  equity: number;
  fixedIncome: number;
  cash: number;
}

export interface QuestionnaireResponsePayload {
  questionnaireVersion: number;
  householdName: string;
  respondentName: string;
  respondentRole: "advisor_facilitated" | "client_self_guided";
  respondentClientId?: string;
  riskBand: string;
  riskScore: number;
  maxScore: number;
  percentage: number;
  recommendedAllocation: QuestionnaireAllocation;
  narrative: string;
  notes: string;
  answers: QuestionnaireAnswer[];
  completedAt: string;
  recommendedReviewDate: string;
}
