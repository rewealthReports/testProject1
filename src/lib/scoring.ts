import type { RTQAnswer, RTQQuestion, RTQScoreResult, RiskBand } from "../types/rtq";

export const RISK_BANDS: Record<
  RiskBand,
  { label: string; description: string; color: string; bgColor: string; range: [number, number] }
> = {
  conservative: {
    label: "Conservative",
    description:
      "You prefer stability and capital preservation over growth. You are comfortable with modest returns in exchange for reduced volatility.",
    color: "#1d4ed8",
    bgColor: "#dbeafe",
    range: [0, 25],
  },
  moderately_conservative: {
    label: "Moderately Conservative",
    description:
      "You seek some growth but prioritize protecting your principal. You can tolerate minor fluctuations but prefer a mostly stable portfolio.",
    color: "#0369a1",
    bgColor: "#e0f2fe",
    range: [26, 45],
  },
  moderate: {
    label: "Moderate",
    description:
      "You balance growth and stability. You can accept moderate market swings in pursuit of reasonable long-term returns.",
    color: "#d97706",
    bgColor: "#fef3c7",
    range: [46, 65],
  },
  moderately_aggressive: {
    label: "Moderately Aggressive",
    description:
      "You lean toward growth and can tolerate significant short-term market volatility. You have a long time horizon and confidence in market recovery.",
    color: "#ea580c",
    bgColor: "#ffedd5",
    range: [66, 80],
  },
  aggressive: {
    label: "Aggressive",
    description:
      "You seek maximum long-term growth and are comfortable with substantial market swings. Short-term losses do not deter your investment strategy.",
    color: "#dc2626",
    bgColor: "#fee2e2",
    range: [81, 100],
  },
};

export function scoreQuestionnaire(
  questions: RTQQuestion[],
  answers: RTQAnswer[]
): RTQScoreResult {
  let rawScore = 0;
  let maxRawScore = 0;
  let weightedScore = 0;
  let maxWeightedScore = 0;

  for (const question of questions) {
    const answer = answers.find((a) => a.questionId === question.id);
    const maxPoints = Math.max(...question.choices.map((c) => c.points));
    maxRawScore += maxPoints;
    maxWeightedScore += maxPoints * question.weight;

    if (answer) {
      rawScore += answer.points;
      weightedScore += answer.points * question.weight;
    }
  }

  const normalizedScore =
    maxWeightedScore > 0 ? Math.round((weightedScore / maxWeightedScore) * 100) : 0;

  const riskBand = resolveBand(normalizedScore);

  return { rawScore, maxRawScore, weightedScore, maxWeightedScore, normalizedScore, riskBand };
}

function resolveBand(score: number): RiskBand {
  if (score <= 25) return "conservative";
  if (score <= 45) return "moderately_conservative";
  if (score <= 65) return "moderate";
  if (score <= 80) return "moderately_aggressive";
  return "aggressive";
}

/** Human-readable label for a risk band. */
export function bandLabel(band: RiskBand): string {
  return RISK_BANDS[band].label;
}
