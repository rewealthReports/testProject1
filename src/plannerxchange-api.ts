import {
  mockClientsByHousehold,
  mockHouseholds,
  mockResponseSeeds
} from "./mock-data";
import type {
  AppDataRecord,
  CanonicalClientSummary,
  CanonicalHousehold,
  ListResponse,
  QuestionnaireResponsePayload,
  ShellRuntimeContext
} from "./plannerxchange";

export interface SaveQuestionnaireInput {
  householdId: string;
  householdName: string;
  respondentClientId?: string;
  respondentName: string;
  respondentRole: QuestionnaireResponsePayload["respondentRole"];
  payload: QuestionnaireResponsePayload;
}

export interface CreateHouseholdInput {
  name: string;
  status?: string;
}

export interface CreateClientInput {
  householdId: string;
  displayName: string;
  status?: string;
}

export interface RtqGateway {
  mode: "mock" | "plannerxchange";
  supportsCanonicalWrites: boolean;
  listHouseholds: (signal?: AbortSignal) => Promise<CanonicalHousehold[]>;
  listClients: (householdId: string, signal?: AbortSignal) => Promise<CanonicalClientSummary[]>;
  listResponses: (
    householdId: string,
    signal?: AbortSignal
  ) => Promise<AppDataRecord<QuestionnaireResponsePayload>[]>;
  createHousehold: (
    input: CreateHouseholdInput,
    signal?: AbortSignal
  ) => Promise<CanonicalHousehold>;
  createClient: (
    input: CreateClientInput,
    signal?: AbortSignal
  ) => Promise<CanonicalClientSummary>;
  saveResponse: (
    input: SaveQuestionnaireInput,
    signal?: AbortSignal
  ) => Promise<AppDataRecord<QuestionnaireResponsePayload>>;
}

interface GatewayConfig {
  context: ShellRuntimeContext;
  apiBaseUrl?: string;
  idToken?: string;
  fetchImpl?: typeof fetch;
}

const mockRecords: AppDataRecord<QuestionnaireResponsePayload>[] = [...mockResponseSeeds];

export function createRtqGateway({
  context,
  apiBaseUrl,
  idToken,
  fetchImpl = fetch
}: GatewayConfig): RtqGateway {
  if (apiBaseUrl && idToken) {
    return createPlannerXchangeGateway({
      context,
      apiBaseUrl,
      idToken,
      fetchImpl
    });
  }

  return createMockGateway(context);
}

function createMockGateway(context: ShellRuntimeContext): RtqGateway {
  return {
    mode: "mock",
    supportsCanonicalWrites: true,
    async listHouseholds(signal) {
      await pause(180, signal);
      return [...mockHouseholds];
    },
    async listClients(householdId, signal) {
      await pause(140, signal);
      return [...(mockClientsByHousehold[householdId] ?? [])];
    },
    async listResponses(householdId, signal) {
      await pause(180, signal);
      return mockRecords
        .filter((record) => record.householdId === householdId)
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    },
    async createHousehold(input, signal) {
      await pause(180, signal);
      const household: CanonicalHousehold = {
        id: buildId("hh", input.name),
        firmId: context.firmId,
        name: input.name.trim(),
        status: input.status ?? "prospect",
        assignedAdvisorUserIds: [context.userId]
      };

      mockHouseholds.unshift(household);
      mockClientsByHousehold[household.id] = [];
      return household;
    },
    async createClient(input, signal) {
      await pause(180, signal);
      const client: CanonicalClientSummary = {
        id: buildId("cl", input.displayName),
        firmId: context.firmId,
        householdId: input.householdId,
        displayName: input.displayName.trim(),
        status: input.status ?? "prospect",
        summaryFlags: {
          hasRestrictedPii: true,
          hasLinkedAccounts: false
        }
      };

      const clientList = mockClientsByHousehold[input.householdId] ?? [];
      clientList.unshift(client);
      mockClientsByHousehold[input.householdId] = clientList;
      return client;
    },
    async saveResponse(input, signal) {
      await pause(220, signal);
      const now = new Date().toISOString();
      const record: AppDataRecord<QuestionnaireResponsePayload> = {
        recordId: `appdata_${Date.now()}`,
        recordType: "questionnaire_response",
        title: `${input.respondentName} risk tolerance profile`,
        status: "final",
        schemaVersion: 1,
        appId: context.appId,
        appInstallationId: context.appInstallationId,
        firmId: context.firmId,
        clientUserId: null,
        householdId: input.householdId,
        accountId: null,
        sourceRefs: [
          {
            sourceType: "canonical_household",
            sourceId: input.householdId,
            asOf: now
          },
          ...(input.respondentClientId
            ? [
                {
                  sourceType: "canonical_client",
                  sourceId: input.respondentClientId,
                  asOf: now
                }
              ]
            : []),
          {
            sourceType: "manual_entry",
            sourceId: `advisor-session-${Date.now()}`,
            asOf: now
          }
        ],
        payload: input.payload,
        createdAt: now,
        updatedAt: now,
        createdByUserId: context.userId,
        updatedByUserId: context.userId
      };

      mockRecords.unshift(record);
      return record;
    }
  };
}

function createPlannerXchangeGateway({
  context,
  apiBaseUrl,
  idToken,
  fetchImpl
}: Required<GatewayConfig>): RtqGateway {
  const baseUrl = apiBaseUrl.replace(/\/$/, "");

  async function requestJson<T>(
    path: string,
    init: RequestInit = {},
    signal?: AbortSignal
  ): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");
    headers.set("Authorization", `Bearer ${idToken}`);
    headers.set("x-plannerxchange-app-installation-id", context.appInstallationId);

    if (init.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const response = await fetchImpl(`${baseUrl}${path}`, {
      ...init,
      headers,
      signal
    });

    if (!response.ok) {
      let message = `PlannerXchange request failed with status ${response.status}.`;

      if (response.headers.get("content-type")?.includes("application/json")) {
        const errorBody = (await response.json()) as {
          message?: string;
        };
        message = errorBody.message ?? message;
      }

      throw new Error(message);
    }

    return (await response.json()) as T;
  }

  return {
    mode: "plannerxchange",
    supportsCanonicalWrites: false,
    async listHouseholds(signal) {
      const response = await requestJson<ListResponse<CanonicalHousehold>>(
        "/canonical/households?limit=50",
        undefined,
        signal
      );
      return response.items;
    },
    async listClients(householdId, signal) {
      const response = await requestJson<ListResponse<CanonicalClientSummary>>(
        `/canonical/households/${encodeURIComponent(householdId)}/clients?limit=50`,
        undefined,
        signal
      );
      return response.items;
    },
    async listResponses(householdId, signal) {
      const searchParams = new URLSearchParams({
        recordType: "questionnaire_response",
        householdId,
        limit: "20"
      });
      const response = await requestJson<ListResponse<AppDataRecord<QuestionnaireResponsePayload>>>(
        `/app-data?${searchParams.toString()}`,
        undefined,
        signal
      );
      return response.items;
    },
    async createHousehold() {
      throw new Error(
        "PlannerXchange's current builder docs only expose canonical household reads. Household creation is documented as a shell-owned workflow, not a builder-app API."
      );
    },
    async createClient() {
      throw new Error(
        "PlannerXchange's current builder docs only expose canonical client reads. Client creation is documented as a shell-owned workflow, not a builder-app API."
      );
    },
    async saveResponse(input, signal) {
      return requestJson<AppDataRecord<QuestionnaireResponsePayload>>(
        "/app-data",
        {
          method: "POST",
          body: JSON.stringify({
            recordType: "questionnaire_response",
            title: `${input.respondentName} risk tolerance profile`,
            status: "final",
            schemaVersion: 1,
            householdId: input.householdId,
            sourceRefs: [
              {
                sourceType: "canonical_household",
                sourceId: input.householdId,
                asOf: input.payload.completedAt
              },
              ...(input.respondentClientId
                ? [
                    {
                      sourceType: "canonical_client",
                      sourceId: input.respondentClientId,
                      asOf: input.payload.completedAt
                    }
                  ]
                : []),
              {
                sourceType: "manual_entry",
                sourceId: `advisor-session-${Date.now()}`,
                asOf: input.payload.completedAt
              }
            ],
            payload: input.payload
          })
        },
        signal
      );
    }
  };
}

function pause(durationMs: number, signal?: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(createAbortError());
      return;
    }

    const timeoutId = window.setTimeout(() => {
      cleanup();
      resolve();
    }, durationMs);

    const handleAbort = () => {
      cleanup();
      reject(createAbortError());
    };

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      signal?.removeEventListener("abort", handleAbort);
    };

    signal?.addEventListener("abort", handleAbort);
  });
}

function createAbortError(): DOMException {
  return new DOMException("The request was aborted.", "AbortError");
}

function buildId(prefix: string, value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);

  return `${prefix}_${normalized || "record"}_${Date.now().toString(36)}`;
}
