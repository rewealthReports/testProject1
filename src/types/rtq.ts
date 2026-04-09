// ── RTQ Domain Types ────────────────────────────────────────────────────────

export interface RTQChoice {
  id: string;
  text: string;
  /** Raw points for this choice (1–4). */
  points: number;
}

export interface RTQQuestion {
  id: string;
  text: string;
  /** Multiplier applied during weighted scoring. Default 1. Min 0.5, Max 3. */
  weight: number;
  choices: RTQChoice[];
}

export interface RTQTemplate {
  id: string;
  firmId: string;
  questions: RTQQuestion[];
  updatedAt: string;
}

// ── Invitation ───────────────────────────────────────────────────────────────

export type InvitationStatus = "pending" | "completed" | "expired";

export interface RTQInvitation {
  id: string;
  firmId: string;
  clientId: string;
  clientDisplayName: string;
  /** Populated from canonical.client.sensitive.read at invite time. */
  clientEmail: string;
  /** URL-safe token embedded in the questionnaire link. */
  token: string;
  status: InvitationStatus;
  sentAt: string;
  completedAt?: string;
  responseId?: string;
}

// ── Response ─────────────────────────────────────────────────────────────────

export interface RTQAnswer {
  questionId: string;
  choiceId: string;
  points: number;
}

export type RiskBand =
  | "conservative"
  | "moderately_conservative"
  | "moderate"
  | "moderately_aggressive"
  | "aggressive";

export interface RTQScoreResult {
  rawScore: number;
  maxRawScore: number;
  weightedScore: number;
  maxWeightedScore: number;
  /** Normalised 0–100. */
  normalizedScore: number;
  riskBand: RiskBand;
}

export interface RTQResponse {
  id: string;
  firmId: string;
  invitationId: string;
  clientId: string;
  clientDisplayName: string;
  answers: RTQAnswer[];
  score: RTQScoreResult;
  completedAt: string;
}

// ── PX canonical client shapes (summary-scoped) ───────────────────────────

export interface PXClientSummary {
  id: string;
  firmId: string;
  householdId: string;
  displayName: string;
  status: string;
}

/** Returned when canonical.client.sensitive.read is available. */
export interface PXClientSensitive extends PXClientSummary {
  firstName: string;
  lastName: string;
  emailPrimary?: string;
  phonePrimary?: string;
  dateOfBirth?: string;
}
