import type { QuestionnaireAllocation } from "./plannerxchange";

export interface QuestionOption {
  score: number;
  label: string;
  description: string;
}

export interface RtqQuestion {
  id: string;
  title: string;
  prompt: string;
  options: QuestionOption[];
}

export interface RiskProfile {
  key: string;
  label: string;
  tone: string;
  narrative: string;
  allocation: QuestionnaireAllocation;
  guidance: string[];
}

export const rtqQuestions: RtqQuestion[] = [
  {
    id: "horizon",
    title: "Time horizon",
    prompt: "When do you expect this pool of assets to start funding meaningful withdrawals?",
    options: [
      { score: 1, label: "Less than 3 years", description: "Short runway. Stability matters most." },
      { score: 2, label: "3 to 5 years", description: "Moderate runway with limited drawdown room." },
      { score: 3, label: "5 to 8 years", description: "Balanced need for growth and resilience." },
      { score: 4, label: "8 to 12 years", description: "Longer runway supports measured volatility." },
      { score: 5, label: "More than 12 years", description: "Longest runway. Growth can dominate." }
    ]
  },
  {
    id: "drawdown",
    title: "Market decline response",
    prompt: "If the portfolio dropped 20% in a broad market selloff, what reaction feels most realistic?",
    options: [
      { score: 1, label: "Sell to stop losses", description: "Capital protection is the priority." },
      { score: 2, label: "Reduce risk quickly", description: "Would want a noticeably safer mix." },
      { score: 3, label: "Hold and reassess", description: "Would wait for facts before acting." },
      { score: 4, label: "Stay invested", description: "Would tolerate the decline with a plan." },
      { score: 5, label: "Add to risk assets", description: "Would treat the selloff as an opportunity." }
    ]
  },
  {
    id: "objective",
    title: "Primary goal",
    prompt: "Which objective is closest to the way you define success for this portfolio?",
    options: [
      { score: 1, label: "Preserve principal", description: "Avoid losses even if returns stay modest." },
      { score: 2, label: "Income and stability", description: "Steady cash flow matters more than upside." },
      { score: 3, label: "Balanced growth", description: "Equal focus on growth and downside control." },
      { score: 4, label: "Long-term appreciation", description: "Accept swings for stronger compounding." },
      { score: 5, label: "Maximum growth", description: "High upside matters more than short-term volatility." }
    ]
  },
  {
    id: "liquidity",
    title: "Liquidity needs",
    prompt: "How likely is it that this portfolio will need to fund a large planned expense in the next two years?",
    options: [
      { score: 1, label: "Very likely", description: "Funds may be needed soon." },
      { score: 2, label: "Somewhat likely", description: "Some near-term liquidity should stay available." },
      { score: 3, label: "Uncertain", description: "Need flexibility without fully sacrificing growth." },
      { score: 4, label: "Unlikely", description: "Short-term liquidity is not a major constraint." },
      { score: 5, label: "Very unlikely", description: "Can stay invested through multiple market cycles." }
    ]
  },
  {
    id: "experience",
    title: "Experience level",
    prompt: "How comfortable are you interpreting portfolio risk, volatility, and performance over time?",
    options: [
      { score: 1, label: "Very limited", description: "Need a simple and stable experience." },
      { score: 2, label: "Limited", description: "Some familiarity, but volatility still feels disruptive." },
      { score: 3, label: "Moderate", description: "Comfortable with balanced tradeoffs." },
      { score: 4, label: "Strong", description: "Understand the payoff for taking measured risk." },
      { score: 5, label: "Very strong", description: "Comfortable with complex or volatile strategies." }
    ]
  },
  {
    id: "consistency",
    title: "Return consistency",
    prompt: "Which statement best matches the type of return path you prefer?",
    options: [
      { score: 1, label: "Small fluctuations", description: "Consistency matters more than upside." },
      { score: 2, label: "Mostly steady", description: "Can handle limited volatility." },
      { score: 3, label: "Moderate swings", description: "Comfortable with a balanced path." },
      { score: 4, label: "Noticeable volatility", description: "Can tolerate rough periods for better returns." },
      { score: 5, label: "Large swings are acceptable", description: "Outcome matters more than the ride." }
    ]
  }
];

const riskProfiles: Array<{ ceiling: number; profile: RiskProfile }> = [
  {
    ceiling: 35,
    profile: {
      key: "capital-preservation",
      label: "Capital Preservation",
      tone: "#50748a",
      narrative: "The answers point to a shorter runway, a stronger preference for stability, and lower tolerance for drawdowns.",
      allocation: { equity: 20, fixedIncome: 60, cash: 20 },
      guidance: [
        "Keep liquidity visible and explicit.",
        "Frame downside protection before upside targets.",
        "Review whenever spending needs change."
      ]
    }
  },
  {
    ceiling: 50,
    profile: {
      key: "guarded-growth",
      label: "Guarded Growth",
      tone: "#7b8e47",
      narrative: "The answers support measured growth, but only with meaningful ballast and a lower-volatility experience.",
      allocation: { equity: 40, fixedIncome: 45, cash: 15 },
      guidance: [
        "Use plain-language risk framing.",
        "Stress test the plan against a moderate selloff.",
        "Keep near-term liquidity carved out."
      ]
    }
  },
  {
    ceiling: 68,
    profile: {
      key: "balanced-opportunity",
      label: "Balanced Opportunity",
      tone: "#d08b3a",
      narrative: "The answers reflect a balanced investor who can accept market swings in exchange for long-term compounding.",
      allocation: { equity: 60, fixedIncome: 30, cash: 10 },
      guidance: [
        "Anchor the recommendation to long-term goals.",
        "Document the expected recovery path after declines.",
        "Revisit after major life or cash-flow changes."
      ]
    }
  },
  {
    ceiling: 84,
    profile: {
      key: "long-horizon-growth",
      label: "Long-Horizon Growth",
      tone: "#c25731",
      narrative: "The answers suggest a long time horizon and a willingness to absorb volatility in pursuit of stronger growth.",
      allocation: { equity: 75, fixedIncome: 20, cash: 5 },
      guidance: [
        "Set expectations for larger interim drawdowns.",
        "Keep rebalancing rules explicit.",
        "Pair growth posture with periodic suitability reviews."
      ]
    }
  },
  {
    ceiling: 100,
    profile: {
      key: "assertive-growth",
      label: "Assertive Growth",
      tone: "#9b2d1f",
      narrative: "The answers indicate high volatility tolerance, limited near-term liquidity needs, and a strong preference for upside capture.",
      allocation: { equity: 85, fixedIncome: 10, cash: 5 },
      guidance: [
        "Confirm capacity for loss matches stated tolerance.",
        "Use a written re-risking and de-risking discipline.",
        "Monitor concentration and sequence-of-return risk."
      ]
    }
  }
];

export interface RtqEvaluation {
  answeredCount: number;
  totalQuestions: number;
  totalScore: number;
  maxScore: number;
  percentage: number;
  isComplete: boolean;
  profile: RiskProfile;
}

export function evaluateQuestionnaire(
  answers: Record<string, number | undefined>
): RtqEvaluation {
  const totalQuestions = rtqQuestions.length;
  const answeredCount = rtqQuestions.filter((question) => answers[question.id]).length;
  const totalScore = rtqQuestions.reduce(
    (sum, question) => sum + (answers[question.id] ?? 0),
    0
  );
  const maxScore = totalQuestions * 5;
  const percentage = totalScore === 0 ? 0 : Math.round((totalScore / maxScore) * 100);
  const profile =
    riskProfiles.find((candidate) => percentage <= candidate.ceiling)?.profile ??
    riskProfiles[riskProfiles.length - 1].profile;

  return {
    answeredCount,
    totalQuestions,
    totalScore,
    maxScore,
    percentage,
    isComplete: answeredCount === totalQuestions,
    profile
  };
}
