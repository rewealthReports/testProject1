import type {
  AppDataRecord,
  CanonicalClientSummary,
  CanonicalHousehold,
  QuestionnaireResponsePayload
} from "./plannerxchange";

export const mockHouseholds: CanonicalHousehold[] = [
  {
    id: "hh_nelson",
    firmId: "north-harbor-advisors",
    name: "Nelson Household",
    status: "active",
    taxState: "MA",
    latestTaxYear: 2024,
    latestTaxDataSource: "holistiplan",
    taxDataStatus: "synced",
    assignedAdvisorUserIds: ["advisor-user-001"]
  },
  {
    id: "hh_ramirez",
    firmId: "north-harbor-advisors",
    name: "Ramirez Family",
    status: "active",
    taxState: "NY",
    latestTaxYear: 2024,
    latestTaxDataSource: "manual_entry",
    taxDataStatus: "partial",
    assignedAdvisorUserIds: ["advisor-user-001"]
  },
  {
    id: "hh_shah",
    firmId: "north-harbor-advisors",
    name: "Shah Household",
    status: "prospect",
    assignedAdvisorUserIds: ["advisor-user-001"]
  }
];

export const mockClientsByHousehold: Record<string, CanonicalClientSummary[]> = {
  hh_nelson: [
    {
      id: "cl_lena_nelson",
      firmId: "north-harbor-advisors",
      householdId: "hh_nelson",
      displayName: "Lena Nelson",
      status: "active",
      summaryFlags: {
        hasRestrictedPii: true,
        hasLinkedAccounts: true
      }
    },
    {
      id: "cl_mark_nelson",
      firmId: "north-harbor-advisors",
      householdId: "hh_nelson",
      displayName: "Mark Nelson",
      status: "active",
      summaryFlags: {
        hasRestrictedPii: true,
        hasLinkedAccounts: true
      }
    }
  ],
  hh_ramirez: [
    {
      id: "cl_ana_ramirez",
      firmId: "north-harbor-advisors",
      householdId: "hh_ramirez",
      displayName: "Ana Ramirez",
      status: "active",
      summaryFlags: {
        hasRestrictedPii: true,
        hasLinkedAccounts: true
      }
    }
  ],
  hh_shah: [
    {
      id: "cl_raj_shah",
      firmId: "north-harbor-advisors",
      householdId: "hh_shah",
      displayName: "Raj Shah",
      status: "prospect",
      summaryFlags: {
        hasRestrictedPii: true,
        hasLinkedAccounts: false
      }
    }
  ]
};

export const mockResponseSeeds: AppDataRecord<QuestionnaireResponsePayload>[] = [
  {
    recordId: "appdata_seed_rtq_001",
    recordType: "questionnaire_response",
    title: "Lena Nelson risk tolerance profile",
    status: "final",
    schemaVersion: 1,
    appId: "risk-tolerance-questionnaire",
    appInstallationId: "rtq-installation-dev",
    firmId: "north-harbor-advisors",
    householdId: "hh_nelson",
    clientUserId: null,
    accountId: null,
    sourceRefs: [
      {
        sourceType: "canonical_household",
        sourceId: "hh_nelson",
        asOf: "2026-04-02T13:10:00Z"
      },
      {
        sourceType: "canonical_client",
        sourceId: "cl_lena_nelson",
        asOf: "2026-04-02T13:10:00Z"
      },
      {
        sourceType: "manual_entry",
        sourceId: "advisor-session-seed",
        asOf: "2026-04-02T13:10:00Z"
      }
    ],
    payload: {
      questionnaireVersion: 1,
      householdName: "Nelson Household",
      respondentName: "Lena Nelson",
      respondentRole: "advisor_facilitated",
      respondentClientId: "cl_lena_nelson",
      riskBand: "Balanced Opportunity",
      riskScore: 22,
      maxScore: 30,
      percentage: 73,
      recommendedAllocation: {
        equity: 75,
        fixedIncome: 20,
        cash: 5
      },
      narrative:
        "The answers suggest a long time horizon and a willingness to absorb volatility in pursuit of stronger growth.",
      notes: "Client emphasized long-term retirement growth and moderate comfort with volatility.",
      answers: [],
      completedAt: "2026-04-02T13:10:00Z",
      recommendedReviewDate: "2027-04-02"
    },
    createdAt: "2026-04-02T13:10:00Z",
    updatedAt: "2026-04-02T13:10:00Z",
    createdByUserId: "advisor-user-001",
    updatedByUserId: "advisor-user-001"
  }
];
