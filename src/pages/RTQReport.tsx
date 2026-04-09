import { useParams, useNavigate } from "react-router-dom";
import { getResponseById, getTemplate } from "../lib/store";
import { RISK_BANDS } from "../lib/scoring";
import type { ShellRuntimeContext } from "../plannerxchange";
import type { RTQQuestion, RTQAnswer } from "../types/rtq";

export function RTQReport({ context }: { context: ShellRuntimeContext }) {
  const { responseId } = useParams<{ responseId: string }>();
  const navigate = useNavigate();

  const response = responseId ? getResponseById(responseId) : undefined;
  const template = getTemplate(context.firmId);

  if (!response) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <p className="text-4xl mb-3">📄</p>
          <h2 className="text-lg font-semibold text-gray-700 mb-1">Report not found</h2>
          <p className="text-sm text-gray-500">
            This report does not exist or has been removed.
          </p>
          <button
            onClick={() => navigate("/")}
            className="mt-4 text-sm underline"
            style={{ color: context.branding.primaryColor }}
          >
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  const { score } = response;
  const band = RISK_BANDS[score.riskBand];
  const completedDate = new Date(response.completedAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      {/* Print / Back toolbar — hidden when printing */}
      <div
        className="print:hidden flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 sticky top-0 z-10"
      >
        <button
          onClick={() => navigate("/")}
          className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          ← Back to dashboard
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: context.branding.primaryColor }}
        >
          <span>⬇</span> Export PDF
        </button>
      </div>

      {/* Report area */}
      <div
        className="max-w-2xl mx-auto my-8 print:my-0 bg-white rounded-2xl shadow-sm print:shadow-none print:rounded-none overflow-hidden"
        id="rtq-report"
      >
        {/* Report header */}
        <div
          className="px-8 py-7 print:py-6"
          style={{ backgroundColor: context.branding.primaryColor }}
        >
          <div className="flex items-start justify-between">
            <div>
              {context.branding.logoUrl ? (
                <img
                  src={context.branding.logoUrl}
                  alt="Firm logo"
                  className="h-8 max-w-[160px] object-contain mb-4"
                />
              ) : null}
              <h1
                className="text-2xl font-bold leading-tight"
                style={{ color: context.branding.fontColor ?? "#ffffff" }}
              >
                Risk Tolerance Report
              </h1>
              <p
                className="text-sm mt-1 opacity-80"
                style={{ color: context.branding.fontColor ?? "#ffffff" }}
              >
                Prepared for {response.clientDisplayName}
              </p>
            </div>
            <div className="text-right">
              <p
                className="text-xs opacity-70"
                style={{ color: context.branding.fontColor ?? "#ffffff" }}
              >
                Completed
              </p>
              <p
                className="text-sm font-medium"
                style={{ color: context.branding.fontColor ?? "#ffffff" }}
              >
                {completedDate}
              </p>
            </div>
          </div>
        </div>

        <div className="px-8 py-6 space-y-8">
          {/* Risk Band */}
          <section>
            <div
              className="rounded-xl px-6 py-5 flex items-center gap-5"
              style={{ backgroundColor: band.bgColor }}
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                style={{ backgroundColor: band.color }}
              >
                {score.normalizedScore}
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest mb-0.5" style={{ color: band.color }}>
                  Risk Profile
                </p>
                <p className="text-xl font-bold text-gray-900">{band.label}</p>
                <p className="text-sm text-gray-600 mt-1">{band.description}</p>
              </div>
            </div>
          </section>

          {/* Score bar */}
          <section>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
              Risk Spectrum
            </p>
            <div className="relative">
              <div className="h-3 rounded-full overflow-hidden bg-gradient-to-r from-blue-500 via-yellow-400 to-red-500" />
              <div
                className="absolute top-0 w-4 h-4 rounded-full border-2 border-white shadow -translate-y-0.5 -translate-x-2"
                style={{
                  left: `${score.normalizedScore}%`,
                  backgroundColor: band.color,
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-2">
              <span>Conservative</span>
              <span>Moderate</span>
              <span>Aggressive</span>
            </div>
          </section>

          {/* Score detail */}
          <section>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
              Score Breakdown
            </p>
            <div className="grid grid-cols-2 gap-3">
              <ScoreCell label="Risk Score" value={`${score.normalizedScore} / 100`} />
              <ScoreCell
                label="Weighted Score"
                value={`${score.weightedScore.toFixed(1)} / ${score.maxWeightedScore.toFixed(1)}`}
              />
            </div>
          </section>

          {/* Per-question answers */}
          <section>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
              Question Responses
            </p>
            <div className="space-y-3">
              {template.questions.map((q, idx) => (
                <QuestionRow
                  key={q.id}
                  index={idx + 1}
                  question={q}
                  answer={response.answers.find((a) => a.questionId === q.id)}
                  primaryColor={context.branding.primaryColor}
                />
              ))}
            </div>
          </section>

          {/* Disclosure */}
          {context.legal.disclosureText && (
            <section className="border-t border-gray-100 pt-5">
              <p className="text-xs text-gray-400 leading-relaxed">
                {context.legal.disclosureText}
              </p>
              {context.legal.privacyPolicyUrl && (
                <a
                  href={context.legal.privacyPolicyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs underline mt-1 inline-block"
                  style={{ color: context.branding.primaryColor }}
                >
                  Privacy Policy
                </a>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function ScoreCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg px-4 py-3">
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function QuestionRow({
  index,
  question,
  answer,
  primaryColor,
}: {
  index: number;
  question: RTQQuestion;
  answer: RTQAnswer | undefined;
  primaryColor: string;
}) {
  const choice = answer ? question.choices.find((c) => c.id === answer.choiceId) : undefined;
  const maxPoints = Math.max(...question.choices.map((c) => c.points));

  return (
    <div className="border border-gray-100 rounded-xl px-4 py-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-400 mb-0.5">Q{index}</p>
          <p className="text-sm text-gray-700 leading-snug">{question.text}</p>
          {choice && (
            <p className="text-sm font-medium text-gray-900 mt-1.5">
              <span className="text-gray-400 mr-1">→</span>
              {choice.text}
            </p>
          )}
        </div>
        {answer && (
          <div className="flex-shrink-0 text-right">
            <p className="text-xs text-gray-400">Points</p>
            <p className="font-semibold text-sm" style={{ color: primaryColor }}>
              {answer.points}/{maxPoints}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              ×{question.weight}w
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
