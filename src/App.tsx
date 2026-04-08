import { type CSSProperties, type FormEvent, type ReactNode, useEffect, useState } from "react";
import {
  createRtqGateway,
  type CreateClientInput,
  type CreateHouseholdInput,
  type RtqGateway
} from "./plannerxchange-api";
import { evaluateQuestionnaire, rtqQuestions } from "./rtq-config";
import type {
  AppDataRecord,
  CanonicalClientSummary,
  CanonicalHousehold,
  PlannerXchangeManifest,
  QuestionnaireAnswer,
  QuestionnaireResponsePayload,
  ShellRuntimeContext
} from "./plannerxchange";

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function addOneYear(date: Date): string {
  const nextReviewDate = new Date(date);
  nextReviewDate.setFullYear(nextReviewDate.getFullYear() + 1);
  return nextReviewDate.toISOString().slice(0, 10);
}

function formatTimestamp(timestamp: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(timestamp));
}

function getBrandFallback(text: string): string {
  return text
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function EntitySheet({
  open,
  title,
  subtitle,
  children,
  onClose
}: {
  open: boolean;
  title: string;
  subtitle: string;
  children: ReactNode;
  onClose: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="sheet-backdrop" role="presentation">
      <section
        aria-label={title}
        aria-modal="true"
        className="sheet-panel"
        role="dialog"
      >
        <div className="sheet-header">
          <div>
            <p className="section-kicker">New Profile Setup</p>
            <h3>{title}</h3>
            <p className="sheet-copy">{subtitle}</p>
          </div>
          <button className="ghost-button" type="button" onClick={onClose}>
            Close
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

export function App({
  context,
  manifest
}: {
  context: ShellRuntimeContext;
  manifest: PlannerXchangeManifest;
}) {
  const [gateway] = useState<RtqGateway>(() =>
    createRtqGateway({
      context,
      apiBaseUrl: import.meta.env.VITE_PX_API_BASE_URL?.trim(),
      idToken: import.meta.env.VITE_PX_ID_TOKEN?.trim()
    })
  );
  const [households, setHouseholds] = useState<CanonicalHousehold[]>([]);
  const [clients, setClients] = useState<CanonicalClientSummary[]>([]);
  const [responses, setResponses] = useState<AppDataRecord<QuestionnaireResponsePayload>[]>([]);
  const [selectedHouseholdId, setSelectedHouseholdId] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [respondentRole, setRespondentRole] =
    useState<QuestionnaireResponsePayload["respondentRole"]>("advisor_facilitated");
  const [notes, setNotes] = useState("");
  const [answers, setAnswers] = useState<Record<string, number | undefined>>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [isBootLoading, setIsBootLoading] = useState(true);
  const [isContextLoading, setIsContextLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [lastSavedRecord, setLastSavedRecord] =
    useState<AppDataRecord<QuestionnaireResponsePayload> | null>(null);
  const [isHouseholdSheetOpen, setIsHouseholdSheetOpen] = useState(false);
  const [isClientSheetOpen, setIsClientSheetOpen] = useState(false);
  const [createState, setCreateState] = useState<"idle" | "creating_household" | "creating_client">(
    "idle"
  );
  const [newHouseholdName, setNewHouseholdName] = useState("");
  const [newClientName, setNewClientName] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadHouseholds() {
      setIsBootLoading(true);
      setLoadError(null);

      try {
        const nextHouseholds = await gateway.listHouseholds(controller.signal);
        setHouseholds(nextHouseholds);
        setSelectedHouseholdId((current) => current || nextHouseholds[0]?.id || "");
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }

        setLoadError(error instanceof Error ? error.message : "Unable to load households.");
      } finally {
        setIsBootLoading(false);
      }
    }

    void loadHouseholds();

    return () => controller.abort();
  }, [gateway]);

  useEffect(() => {
    if (!selectedHouseholdId) {
      setClients([]);
      setResponses([]);
      setSelectedClientId("");
      return;
    }

    const controller = new AbortController();

    async function loadHouseholdContext() {
      setIsContextLoading(true);
      setLoadError(null);

      try {
        const [nextClients, nextResponses] = await Promise.all([
          gateway.listClients(selectedHouseholdId, controller.signal),
          gateway.listResponses(selectedHouseholdId, controller.signal)
        ]);

        setClients(nextClients);
        setResponses(nextResponses);
        setSelectedClientId((current) => {
          if (current && nextClients.some((client) => client.id === current)) {
            return current;
          }

          return nextClients[0]?.id ?? "";
        });
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }

        setLoadError(error instanceof Error ? error.message : "Unable to load respondent details.");
      } finally {
        setIsContextLoading(false);
      }
    }

    void loadHouseholdContext();

    return () => controller.abort();
  }, [gateway, selectedHouseholdId]);

  const selectedHousehold =
    households.find((household) => household.id === selectedHouseholdId) ?? null;
  const selectedClient = clients.find((client) => client.id === selectedClientId) ?? null;
  const latestResponse =
    responses[0] ??
    (lastSavedRecord?.householdId === selectedHouseholdId ? lastSavedRecord : null);
  const evaluation = evaluateQuestionnaire(answers);
  const questionCount = rtqQuestions.length;
  const summaryStep = questionCount + 1;
  const activeQuestion = currentStep > 0 && currentStep <= questionCount ? rtqQuestions[currentStep - 1] : null;
  const activeAnswer = activeQuestion ? answers[activeQuestion.id] : undefined;
  const respondentDisplayName =
    selectedClient?.displayName ?? selectedHousehold?.name ?? "Select a household";
  const brandFallback = getBrandFallback(selectedHousehold?.name ?? manifest.name);
  const progressValue = Math.round((Math.max(currentStep, 0) / summaryStep) * 100);
  const shellStyle = {
    "--rtq-primary": context.branding.primaryColor,
    "--rtq-secondary": context.branding.secondaryColor ?? "#d87b4f",
    "--rtq-font": context.branding.fontColor ?? "#fff8f0",
    "--rtq-risk-accent": evaluation.profile.tone
  } as CSSProperties;

  async function handleCreateHousehold(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload: CreateHouseholdInput = {
      name: newHouseholdName.trim(),
      status: "prospect"
    };

    if (!payload.name) {
      setCreateError("Enter a household name before continuing.");
      return;
    }

    setCreateState("creating_household");
    setCreateError(null);

    try {
      const created = await gateway.createHousehold(payload);
      setHouseholds((current) => [created, ...current.filter((item) => item.id !== created.id)]);
      setSelectedHouseholdId(created.id);
      setSelectedClientId("");
      setNewHouseholdName("");
      setIsHouseholdSheetOpen(false);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "Unable to create household.");
    } finally {
      setCreateState("idle");
    }
  }

  async function handleCreateClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedHousehold) {
      setCreateError("Choose a household before adding a client.");
      return;
    }

    const payload: CreateClientInput = {
      householdId: selectedHousehold.id,
      displayName: newClientName.trim(),
      status: "prospect"
    };

    if (!payload.displayName) {
      setCreateError("Enter a client name before continuing.");
      return;
    }

    setCreateState("creating_client");
    setCreateError(null);

    try {
      const created = await gateway.createClient(payload);
      setClients((current) => [created, ...current.filter((item) => item.id !== created.id)]);
      setSelectedClientId(created.id);
      setNewClientName("");
      setIsClientSheetOpen(false);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "Unable to create client.");
    } finally {
      setCreateState("idle");
    }
  }

  async function handleSave() {
    if (!selectedHousehold || !evaluation.isComplete) {
      return;
    }

    setSaveState("saving");
    setSaveError(null);

    const completedAt = new Date();
    const answerPayload: QuestionnaireAnswer[] = rtqQuestions.map((question) => {
      const selectedOption = question.options.find((option) => option.score === answers[question.id]);

      if (!selectedOption) {
        throw new Error(`Missing answer for ${question.title}.`);
      }

      return {
        questionId: question.id,
        prompt: question.prompt,
        label: selectedOption.label,
        score: selectedOption.score
      };
    });

    try {
      const savedRecord = await gateway.saveResponse({
        householdId: selectedHousehold.id,
        householdName: selectedHousehold.name,
        respondentClientId: selectedClient?.id,
        respondentName: respondentDisplayName,
        respondentRole,
        payload: {
          questionnaireVersion: 1,
          householdName: selectedHousehold.name,
          respondentName: respondentDisplayName,
          respondentRole,
          respondentClientId: selectedClient?.id,
          riskBand: evaluation.profile.label,
          riskScore: evaluation.totalScore,
          maxScore: evaluation.maxScore,
          percentage: evaluation.percentage,
          recommendedAllocation: evaluation.profile.allocation,
          narrative: evaluation.profile.narrative,
          notes: notes.trim(),
          answers: answerPayload,
          completedAt: completedAt.toISOString(),
          recommendedReviewDate: addOneYear(completedAt)
        }
      });

      setSaveState("saved");
      setLastSavedRecord(savedRecord);
      setResponses((current) => [
        savedRecord,
        ...current.filter((record) => record.recordId !== savedRecord.recordId)
      ]);
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }

      setSaveState("idle");
      setSaveError(error instanceof Error ? error.message : "Unable to save questionnaire.");
    }
  }

  function resetQuestionnaire() {
    setAnswers({});
    setNotes("");
    setCurrentStep(0);
    setSaveState("idle");
    setSaveError(null);
  }

  function handleContinue() {
    if (currentStep === 0) {
      if (selectedHousehold) {
        setCurrentStep(1);
      }
      return;
    }

    if (currentStep <= questionCount && activeAnswer) {
      setCurrentStep((step) => Math.min(step + 1, summaryStep));
    }
  }

  function openHouseholdSheet() {
    setCreateError(null);
    setIsHouseholdSheetOpen(true);
  }

  function openClientSheet() {
    setCreateError(null);
    setIsClientSheetOpen(true);
  }

  const canContinue =
    currentStep === 0 ? Boolean(selectedHousehold) : Boolean(currentStep > questionCount || activeAnswer);

  return (
    <main className="rtq-shell" style={shellStyle}>
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <section className="experience-frame">
        <aside className="experience-side">
          <div className="brand-chip">
            {context.branding.logoUrl ? (
              <img
                alt={`${context.firmId} logo`}
                className="brand-avatar-image"
                src={context.branding.logoUrl}
              />
            ) : (
              <span className="brand-avatar">{brandFallback}</span>
            )}

            <div>
              <p className="section-kicker">REWealth Reports</p>
              <h1>{manifest.name}</h1>
              <p className="brand-copy">
                A calm, guided conversation designed to translate comfort with uncertainty into an
                investment posture.
              </p>
            </div>
          </div>

          <div className="progress-card">
            <div className="progress-card-head">
              <div>
                <p className="section-kicker">Progress</p>
                <strong>
                  {currentStep === 0
                    ? "Profile setup"
                    : currentStep > questionCount
                      ? "Review and finalize"
                      : `Question ${currentStep} of ${questionCount}`}
                </strong>
              </div>
              <span>{progressValue}%</span>
            </div>

            <div className="progress-track" aria-hidden="true">
              <div className="progress-fill" style={{ width: `${progressValue}%` }} />
            </div>

            <div className="respondent-summary">
              <span className="mini-label">Prepared for</span>
              <strong>{respondentDisplayName}</strong>
              <small>{selectedHousehold?.name ?? "Choose a household to begin."}</small>
            </div>

            <div className="profile-snapshot">
              <span className="mini-label">Current fit</span>
              <strong>{evaluation.profile.label}</strong>
              <p>{evaluation.profile.narrative}</p>
            </div>
          </div>

          <div className="allocation-preview">
            <div className="allocation-bar">
              <span
                className="allocation-segment equity"
                style={{ width: `${evaluation.profile.allocation.equity}%` }}
              />
              <span
                className="allocation-segment fixed-income"
                style={{ width: `${evaluation.profile.allocation.fixedIncome}%` }}
              />
              <span
                className="allocation-segment cash"
                style={{ width: `${evaluation.profile.allocation.cash}%` }}
              />
            </div>

            <div className="allocation-key">
              <span>Equity {evaluation.profile.allocation.equity}%</span>
              <span>Fixed Income {evaluation.profile.allocation.fixedIncome}%</span>
              <span>Cash {evaluation.profile.allocation.cash}%</span>
            </div>
          </div>

          {latestResponse && (
            <div className="memory-card">
              <p className="section-kicker">Most Recent Profile</p>
              <strong>{latestResponse.payload.respondentName}</strong>
              <p>
                {latestResponse.payload.riskBand} on {formatTimestamp(latestResponse.updatedAt)}
              </p>
            </div>
          )}
        </aside>

        <article className="experience-stage">
          <header className="stage-topbar">
            <button
              className="ghost-button"
              disabled={currentStep === 0}
              type="button"
              onClick={() => setCurrentStep((step) => Math.max(step - 1, 0))}
            >
              Back
            </button>

            <button
              className="ghost-button"
              type="button"
              onClick={() => {
                setCurrentStep(0);
                setSaveState("idle");
              }}
            >
              Edit Respondent
            </button>
          </header>

          {loadError && <p className="feedback error">{loadError}</p>}
          {saveError && <p className="feedback error">{saveError}</p>}
          {saveState === "saved" && lastSavedRecord && (
            <p className="feedback success">
              Profile saved for {lastSavedRecord.payload.respondentName} at{" "}
              {formatTimestamp(lastSavedRecord.updatedAt)}.
            </p>
          )}

          {currentStep === 0 && (
            <section className="stage-card">
              <div className="stage-copy">
                <p className="section-kicker">Step 1</p>
                <h2>Choose who this profile is for</h2>
                <p>
                  Start with an existing household or create a new one, then choose the person who
                  should answer the questionnaire.
                </p>
              </div>

              <div className="selection-block">
                <div className="block-head">
                  <div>
                    <p className="mini-label">Households</p>
                    <strong>Existing relationships</strong>
                  </div>
                  <button className="ghost-button" type="button" onClick={openHouseholdSheet}>
                    Add household
                  </button>
                </div>

                <div className="selection-grid">
                  {households.map((household) => (
                    <button
                      className={`selection-card ${selectedHouseholdId === household.id ? "selected" : ""}`}
                      key={household.id}
                      type="button"
                      onClick={() => setSelectedHouseholdId(household.id)}
                    >
                      <span>{household.name}</span>
                      <small>{household.status}</small>
                    </button>
                  ))}
                </div>

                {!isBootLoading && households.length === 0 && (
                  <p className="empty-note">
                    No households are available in this workspace yet. Create one here in mock mode,
                    or add it in PlannerXchange if your connected environment keeps canonical writes
                    shell-owned.
                  </p>
                )}
              </div>

              <div className="selection-block">
                <div className="block-head">
                  <div>
                    <p className="mini-label">Respondent</p>
                    <strong>Choose the person completing the RTQ</strong>
                  </div>
                  <button
                    className="ghost-button"
                    disabled={!selectedHousehold}
                    type="button"
                    onClick={openClientSheet}
                  >
                    Add client
                  </button>
                </div>

                <div className="selection-grid">
                  <button
                    className={`selection-card ${selectedClientId === "" ? "selected" : ""}`}
                    type="button"
                    onClick={() => setSelectedClientId("")}
                  >
                    <span>Household conversation</span>
                    <small>Use when the discussion is being held jointly.</small>
                  </button>

                  {clients.map((client) => (
                    <button
                      className={`selection-card ${selectedClientId === client.id ? "selected" : ""}`}
                      key={client.id}
                      type="button"
                      onClick={() => setSelectedClientId(client.id)}
                    >
                      <span>{client.displayName}</span>
                      <small>{client.status}</small>
                    </button>
                  ))}
                </div>

                {!isContextLoading && selectedHousehold && clients.length === 0 && (
                  <p className="empty-note">
                    No clients are attached to this household yet. Add one to create a more
                    personalized respondent record.
                  </p>
                )}
              </div>

              <div className="selection-block compact">
                <div className="block-head">
                  <div>
                    <p className="mini-label">Facilitation</p>
                    <strong>How is the questionnaire being completed?</strong>
                  </div>
                </div>

                <div className="segmented-control">
                  <button
                    className={respondentRole === "advisor_facilitated" ? "selected" : ""}
                    type="button"
                    onClick={() => setRespondentRole("advisor_facilitated")}
                  >
                    Advisor guided
                  </button>
                  <button
                    className={respondentRole === "client_self_guided" ? "selected" : ""}
                    type="button"
                    onClick={() => setRespondentRole("client_self_guided")}
                  >
                    Client self-guided
                  </button>
                </div>
              </div>

              <footer className="stage-actions">
                <button
                  className="primary-button"
                  disabled={!canContinue}
                  type="button"
                  onClick={handleContinue}
                >
                  Begin questionnaire
                </button>
              </footer>
            </section>
          )}

          {activeQuestion && (
            <section className="stage-card question-stage">
              <div className="question-shell">
                <div className="question-ordinal">0{currentStep}</div>
                <div className="stage-copy">
                  <p className="section-kicker">Question {currentStep}</p>
                  <h2>{activeQuestion.prompt}</h2>
                  <p>Choose the response that feels most natural, not the one that sounds best.</p>
                </div>
              </div>

              <div className="option-stack">
                {activeQuestion.options.map((option, optionIndex) => (
                  <button
                    className={`answer-card ${activeAnswer === option.score ? "selected" : ""}`}
                    key={option.label}
                    type="button"
                    onClick={() =>
                      setAnswers((current) => ({
                        ...current,
                        [activeQuestion.id]: option.score
                      }))
                    }
                  >
                    <span className="answer-index">{String.fromCharCode(65 + optionIndex)}</span>
                    <span className="answer-body">
                      <strong>{option.label}</strong>
                      <small>{option.description}</small>
                    </span>
                  </button>
                ))}
              </div>

              <footer className="stage-actions">
                <button className="ghost-button" type="button" onClick={() => setCurrentStep((step) => Math.max(step - 1, 0))}>
                  Previous
                </button>
                <button
                  className="primary-button"
                  disabled={!canContinue}
                  type="button"
                  onClick={handleContinue}
                >
                  {currentStep === questionCount ? "Review result" : "Continue"}
                </button>
              </footer>
            </section>
          )}

          {currentStep === summaryStep && (
            <section className="stage-card summary-stage">
              <div className="stage-copy">
                <p className="section-kicker">Summary</p>
                <h2>{evaluation.profile.label}</h2>
                <p>{evaluation.profile.narrative}</p>
              </div>

              <div className="result-grid">
                <article className="result-panel">
                  <span className="mini-label">Score</span>
                  <strong>
                    {evaluation.totalScore} / {evaluation.maxScore}
                  </strong>
                  <small>{evaluation.percentage}% alignment with this profile</small>
                </article>
                <article className="result-panel">
                  <span className="mini-label">Recommended review</span>
                  <strong>{addOneYear(new Date())}</strong>
                  <small>Refresh after life, cash-flow, or market-capacity changes.</small>
                </article>
              </div>

              <div className="allocation-summary">
                <div className="allocation-readout">
                  <span>Equity</span>
                  <strong>{evaluation.profile.allocation.equity}%</strong>
                </div>
                <div className="allocation-readout">
                  <span>Fixed Income</span>
                  <strong>{evaluation.profile.allocation.fixedIncome}%</strong>
                </div>
                <div className="allocation-readout">
                  <span>Cash</span>
                  <strong>{evaluation.profile.allocation.cash}%</strong>
                </div>
              </div>

              <ul className="guidance-list">
                {evaluation.profile.guidance.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>

              <label className="notes-field">
                <span className="mini-label">Advisor notes</span>
                <textarea
                  placeholder="Capture context, language the client used, or follow-up reminders."
                  rows={6}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </label>

              <footer className="stage-actions">
                <button className="ghost-button" type="button" onClick={() => setCurrentStep(questionCount)}>
                  Revisit last question
                </button>
                <button
                  className="primary-button"
                  disabled={saveState === "saving"}
                  type="button"
                  onClick={() => void handleSave()}
                >
                  {saveState === "saving" ? "Saving profile..." : "Save profile"}
                </button>
              </footer>
            </section>
          )}
        </article>
      </section>

      <footer className="disclosure-footer">
        <p>{context.legal.disclosureText}</p>
        <button className="ghost-button" type="button" onClick={resetQuestionnaire}>
          Start a new questionnaire
        </button>
      </footer>

      <EntitySheet
        open={isHouseholdSheetOpen}
        title="Add a household"
        subtitle="New households are immediately available to this questionnaire. In live PlannerXchange environments, creation depends on whether canonical writes are exposed to the app."
        onClose={() => setIsHouseholdSheetOpen(false)}
      >
        <form className="sheet-form" onSubmit={(event) => void handleCreateHousehold(event)}>
          <label className="sheet-field">
            <span>Household name</span>
            <input
              placeholder="e.g. Anderson Family"
              value={newHouseholdName}
              onChange={(event) => setNewHouseholdName(event.target.value)}
            />
          </label>

          {!gateway.supportsCanonicalWrites && (
            <p className="feedback error">
              This connected PlannerXchange contract only documents shell-owned household creation.
            </p>
          )}

          {createError && <p className="feedback error">{createError}</p>}

          <div className="sheet-actions">
            <button className="ghost-button" type="button" onClick={() => setIsHouseholdSheetOpen(false)}>
              Cancel
            </button>
            <button
              className="primary-button"
              disabled={createState === "creating_household"}
              type="submit"
            >
              {createState === "creating_household" ? "Creating..." : "Create household"}
            </button>
          </div>
        </form>
      </EntitySheet>

      <EntitySheet
        open={isClientSheetOpen}
        title="Add a client"
        subtitle="Attach a new respondent to the selected household so the profile can be saved against that relationship."
        onClose={() => setIsClientSheetOpen(false)}
      >
        <form className="sheet-form" onSubmit={(event) => void handleCreateClient(event)}>
          <label className="sheet-field">
            <span>Client name</span>
            <input
              placeholder="e.g. Emma Anderson"
              value={newClientName}
              onChange={(event) => setNewClientName(event.target.value)}
            />
          </label>

          {!gateway.supportsCanonicalWrites && (
            <p className="feedback error">
              This connected PlannerXchange contract only documents shell-owned client creation.
            </p>
          )}

          {createError && <p className="feedback error">{createError}</p>}

          <div className="sheet-actions">
            <button className="ghost-button" type="button" onClick={() => setIsClientSheetOpen(false)}>
              Cancel
            </button>
            <button
              className="primary-button"
              disabled={createState === "creating_client"}
              type="submit"
            >
              {createState === "creating_client" ? "Creating..." : "Create client"}
            </button>
          </div>
        </form>
      </EntitySheet>
    </main>
  );
}
