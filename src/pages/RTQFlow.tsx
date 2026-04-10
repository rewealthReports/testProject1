import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { RTQAnswer, RTQInvitation, RTQTemplate } from "../types/rtq";
import { getTemplate, getInvitationByToken, saveResponse, markInvitationCompleted } from "../lib/store";
import { scoreQuestionnaire } from "../lib/scoring";
import type { ShellRuntimeContext } from "../plannerxchange";

export function RTQFlow({ context }: { context: ShellRuntimeContext }) {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [invitation, setInvitation] = useState<RTQInvitation | undefined>();
  const [template, setTemplate] = useState<RTQTemplate | undefined>();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, RTQAnswer>>({});
  const [submitted, setSubmitted] = useState(false);
  const [responseId, setResponseId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) { setLoadState("ready"); return; }
    Promise.all([
      getInvitationByToken(token),
      getTemplate(context.firmId),
    ]).then(([inv, tpl]) => {
      setInvitation(inv);
      setTemplate(tpl);
      setLoadState("ready");
    }).catch(() => setLoadState("error"));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loadState === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading…</p>
      </div>
    );
  }

  if (loadState === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <p className="text-4xl mb-3">⚠️</p>
          <h2 className="text-lg font-semibold text-gray-700 mb-1">Something went wrong</h2>
          <p className="text-sm text-gray-500">Could not load questionnaire. Please try again.</p>
        </div>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <p className="text-5xl mb-4">🔗</p>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Link not found</h2>
          <p className="text-gray-500 text-sm">
            This questionnaire link is invalid or has expired. Please contact
            your advisor for a new invitation.
          </p>
        </div>
      </div>
    );
  }

  if (invitation.status === "completed") {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <p className="text-5xl mb-4">✅</p>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Already completed</h2>
          <p className="text-gray-500 text-sm">
            You have already submitted this questionnaire. Your advisor can view your
            risk profile report.
          </p>
          {invitation.responseId && (
            <button
              onClick={() => navigate(`/report/${invitation.responseId}`)}
              className="mt-4 px-5 py-2 rounded-lg text-sm font-medium text-white"
              style={{ backgroundColor: context.branding.primaryColor }}
            >
              View My Report
            </button>
          )}
        </div>
      </div>
    );
  }

  if (submitted && responseId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <p className="text-5xl mb-4">🎉</p>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Thank you, {invitation.clientDisplayName.split(" ")[0]}!
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            Your responses have been recorded. Your advisor will review your risk
            profile and discuss the results with you.
          </p>
          <button
            onClick={() => navigate(`/report/${responseId}`)}
            className="px-5 py-2 rounded-lg text-sm font-medium text-white"
            style={{ backgroundColor: context.branding.primaryColor }}
          >
            View My Risk Profile Report
          </button>
        </div>
      </div>
    );
  }

  const questions = template!.questions;
  const total = questions.length;
  const question = questions[currentIndex];
  const selectedChoiceId = answers[question.id]?.choiceId ?? null;
  const progressPct = Math.round((currentIndex / total) * 100);

  function selectChoice(choiceId: string, points: number) {
    setAnswers((prev) => ({
      ...prev,
      [question.id]: { questionId: question.id, choiceId, points },
    }));
  }

  function goNext() {
    if (currentIndex < total - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      void handleSubmit();
    }
  }

  function goBack() {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  }

  async function handleSubmit() {
    if (!invitation || !template) return;
    const answerList = Object.values(answers);
    const score = scoreQuestionnaire(template.questions, answerList);

    const response = await saveResponse({
      firmId: context.firmId,
      invitationId: invitation.id,
      clientId: invitation.clientId,
      clientDisplayName: invitation.clientDisplayName,
      answers: answerList,
      score,
      completedAt: new Date().toISOString(),
    });

    await markInvitationCompleted(invitation.id, response.id);
    setResponseId(response.id);
    setSubmitted(true);
  }

  const isLast = currentIndex === total - 1;
  const canAdvance = selectedChoiceId !== null;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "#f8fafc" }}
    >
      {/* Header */}
      <header
        className="px-6 py-4 flex items-center justify-between"
        style={{ backgroundColor: context.branding.primaryColor }}
      >
        <div className="flex items-center gap-3">
          {context.branding.logoUrl ? (
            <img
              src={context.branding.logoUrl}
              alt="Firm logo"
              className="h-7 max-w-[120px] object-contain"
            />
          ) : null}
          <span className="text-white font-semibold text-sm">
            Risk Tolerance Questionnaire
          </span>
        </div>
        <span className="text-white text-xs opacity-70">
          {invitation.clientDisplayName}
        </span>
      </header>

      {/* Progress bar */}
      <div className="h-1 bg-gray-200">
        <div
          className="h-1 transition-all duration-500"
          style={{
            width: `${progressPct}%`,
            backgroundColor: context.branding.secondaryColor ?? context.branding.primaryColor,
          }}
        />
      </div>

      {/* Main card */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg w-full max-w-xl p-8">
          {/* Step indicator */}
          <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-4">
            Question {currentIndex + 1} of {total}
          </p>

          {/* Question text */}
          <h2 className="text-xl font-semibold text-gray-900 mb-8 leading-snug">
            {question.text}
          </h2>

          {/* Choices */}
          <div className="space-y-3">
            {question.choices.map((choice) => {
              const selected = selectedChoiceId === choice.id;
              return (
                <button
                  key={choice.id}
                  onClick={() => selectChoice(choice.id, choice.points)}
                  className="w-full text-left px-5 py-4 rounded-xl border-2 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1"
                  style={{
                    borderColor: selected ? context.branding.primaryColor : "#e5e7eb",
                    backgroundColor: selected
                      ? `${context.branding.primaryColor}12`
                      : "white",
                    "--tw-ring-color": context.branding.primaryColor,
                  } as React.CSSProperties}
                  aria-pressed={selected}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center"
                      style={{
                        borderColor: selected ? context.branding.primaryColor : "#d1d5db",
                        backgroundColor: selected ? context.branding.primaryColor : "transparent",
                      }}
                    >
                      {selected && (
                        <span className="w-2 h-2 rounded-full bg-white block" />
                      )}
                    </span>
                    <span className="text-sm text-gray-800">{choice.text}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8">
            <button
              onClick={goBack}
              disabled={currentIndex === 0}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-800 disabled:opacity-0 transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={goNext}
              disabled={!canAdvance}
              className="px-6 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-40 transition-opacity hover:opacity-90"
              style={{ backgroundColor: context.branding.primaryColor }}
            >
              {isLast ? "Submit →" : "Next →"}
            </button>
          </div>
        </div>
      </main>

      {/* Disclosure footer */}
      {context.legal.disclosureText && (
        <footer className="px-6 py-4 text-center text-xs text-gray-400">
          {context.legal.disclosureText}
        </footer>
      )}
    </div>
  );
}
