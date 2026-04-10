import { useEffect, useState } from "react";
import { getTemplate, saveTemplate } from "../lib/store";
import type { RTQQuestion, RTQChoice, RTQTemplate } from "../types/rtq";
import type { ShellRuntimeContext } from "../plannerxchange";

const MIN_WEIGHT = 0.5;
const MAX_WEIGHT = 3;
const MIN_CHOICES = 2;
const MAX_CHOICES = 6;

export function QuestionnaireEditor({ context }: { context: ShellRuntimeContext }) {
  const [template, setTemplate] = useState<RTQTemplate>({ id: "", firmId: context.firmId, questions: [], updatedAt: "" });
  const [templateLoaded, setTemplateLoaded] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getTemplate(context.firmId).then((t) => { setTemplate(t); setTemplateLoaded(true); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!templateLoaded) {
    return (
      <div className="p-6 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading…</p>
      </div>
    );
  }

  function uid() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  function updateQuestion(id: string, patch: Partial<RTQQuestion>) {
    setTemplate((t) => ({
      ...t,
      questions: t.questions.map((q) => (q.id === id ? { ...q, ...patch } : q)),
    }));
  }

  function updateChoice(qId: string, cId: string, patch: Partial<RTQChoice>) {
    setTemplate((t) => ({
      ...t,
      questions: t.questions.map((q) =>
        q.id === qId
          ? { ...q, choices: q.choices.map((c) => (c.id === cId ? { ...c, ...patch } : c)) }
          : q
      ),
    }));
  }

  function addChoice(qId: string) {
    setTemplate((t) => ({
      ...t,
      questions: t.questions.map((q) =>
        q.id === qId
          ? {
              ...q,
              choices: [
                ...q.choices,
                { id: uid(), text: "New choice", points: q.choices.length + 1 },
              ],
            }
          : q
      ),
    }));
  }

  function removeChoice(qId: string, cId: string) {
    setTemplate((t) => ({
      ...t,
      questions: t.questions.map((q) =>
        q.id === qId
          ? { ...q, choices: q.choices.filter((c) => c.id !== cId) }
          : q
      ),
    }));
  }

  function addQuestion() {
    const id = uid();
    setTemplate((t) => ({
      ...t,
      questions: [
        ...t.questions,
        {
          id,
          text: "New question",
          weight: 1,
          choices: [
            { id: uid(), text: "Choice A", points: 1 },
            { id: uid(), text: "Choice B", points: 2 },
            { id: uid(), text: "Choice C", points: 3 },
            { id: uid(), text: "Choice D", points: 4 },
          ],
        },
      ],
    }));
    setEditingId(id);
  }

  function removeQuestion(id: string) {
    if (template.questions.length <= 1) return;
    setTemplate((t) => ({
      ...t,
      questions: t.questions.filter((q) => q.id !== id),
    }));
    if (editingId === id) setEditingId(null);
  }

  function moveQuestion(id: string, direction: "up" | "down") {
    const idx = template.questions.findIndex((q) => q.id === id);
    if (idx < 0) return;
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= template.questions.length) return;
    const next = [...template.questions];
    [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
    setTemplate((t) => ({ ...t, questions: next }));
  }

  async function handleSave() {
    const saved = await saveTemplate(template);
    setTemplate(saved);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    setEditingId(null);
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Questionnaire Editor</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {template.questions.length} question{template.questions.length !== 1 ? "s" : ""} ·
            Changes apply to all new invitations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="text-sm text-green-600 font-medium">✓ Saved</span>
          )}
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: context.branding.primaryColor }}
          >
            Save Changes
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {template.questions.map((question, idx) => {
          const isEditing = editingId === question.id;
          return (
            <div
              key={question.id}
              className="bg-white border border-gray-200 rounded-xl overflow-hidden"
            >
              {/* Question header row */}
              <div className="flex items-start gap-3 px-5 py-4">
                <span className="text-xs text-gray-400 font-medium pt-0.5 w-6 flex-shrink-0">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <textarea
                      value={question.text}
                      onChange={(e) => updateQuestion(question.id, { text: e.target.value })}
                      rows={2}
                      className="w-full text-sm text-gray-900 border border-gray-300 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1"
                      style={{ "--tw-ring-color": context.branding.primaryColor } as React.CSSProperties}
                    />
                  ) : (
                    <p className="text-sm text-gray-900 leading-snug">{question.text}</p>
                  )}

                  {/* Weight control */}
                  <div className="flex items-center gap-3 mt-3">
                    <label className="text-xs text-gray-500 w-28 flex-shrink-0">
                      Weight: <strong>{question.weight}×</strong>
                    </label>
                    <input
                      type="range"
                      min={MIN_WEIGHT}
                      max={MAX_WEIGHT}
                      step={0.5}
                      value={question.weight}
                      onChange={(e) =>
                        updateQuestion(question.id, { weight: parseFloat(e.target.value) })
                      }
                      className="flex-1 h-1.5 appearance-none rounded-full cursor-pointer"
                      style={{ accentColor: context.branding.primaryColor }}
                    />
                    <span className="text-xs text-gray-400 w-8">{MAX_WEIGHT}×</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <IconBtn
                    label="Move up"
                    disabled={idx === 0}
                    onClick={() => moveQuestion(question.id, "up")}
                  >
                    ↑
                  </IconBtn>
                  <IconBtn
                    label="Move down"
                    disabled={idx === template.questions.length - 1}
                    onClick={() => moveQuestion(question.id, "down")}
                  >
                    ↓
                  </IconBtn>
                  <IconBtn
                    label={isEditing ? "Collapse" : "Edit"}
                    onClick={() => setEditingId(isEditing ? null : question.id)}
                    active={isEditing}
                    color={context.branding.primaryColor}
                  >
                    ✎
                  </IconBtn>
                  <IconBtn
                    label="Delete question"
                    onClick={() => removeQuestion(question.id)}
                    disabled={template.questions.length <= 1}
                    danger
                  >
                    ✕
                  </IconBtn>
                </div>
              </div>

              {/* Choices (shown when editing) */}
              {isEditing && (
                <div className="border-t border-gray-100 px-5 pb-5 pt-4 bg-gray-50">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                    Answer Choices &amp; Point Values
                  </p>
                  <div className="space-y-2">
                    {question.choices.map((choice, cIdx) => (
                      <div key={choice.id} className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 w-4">{cIdx + 1}.</span>
                        <input
                          value={choice.text}
                          onChange={(e) =>
                            updateChoice(question.id, choice.id, { text: e.target.value })
                          }
                          className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1"
                          style={{ "--tw-ring-color": context.branding.primaryColor } as React.CSSProperties}
                          placeholder="Choice text"
                        />
                        <div className="flex items-center gap-1">
                          <select
                            value={choice.points}
                            onChange={(e) =>
                              updateChoice(question.id, choice.id, {
                                points: parseInt(e.target.value),
                              })
                            }
                            className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none"
                            title="Points for this choice"
                          >
                            {[1, 2, 3, 4].map((p) => (
                              <option key={p} value={p}>
                                {p} pt{p !== 1 ? "s" : ""}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => removeChoice(question.id, choice.id)}
                            disabled={question.choices.length <= MIN_CHOICES}
                            className="text-gray-400 hover:text-red-500 disabled:opacity-30 transition-colors px-1"
                            aria-label="Remove choice"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {question.choices.length < MAX_CHOICES && (
                    <button
                      onClick={() => addChoice(question.id)}
                      className="mt-3 text-xs font-medium underline"
                      style={{ color: context.branding.primaryColor }}
                    >
                      + Add choice
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={addQuestion}
        className="mt-4 w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors"
      >
        + Add Question
      </button>
    </div>
  );
}

function IconBtn({
  children,
  label,
  onClick,
  disabled,
  active,
  danger,
  color,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  danger?: boolean;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="w-7 h-7 rounded text-sm flex items-center justify-center disabled:opacity-30 transition-colors"
      style={{
        backgroundColor: active && color ? `${color}20` : "transparent",
        color: danger ? "#ef4444" : active && color ? color : "#6b7280",
      }}
    >
      {children}
    </button>
  );
}
