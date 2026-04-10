import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Modal } from "../components/Modal";
import type { RTQInvitation } from "../types/rtq";
import type { PXClientSummary } from "../types/rtq";
import { fetchClientSummaries, sendTransactionalEmail } from "../lib/pxApi";
import { createInvitation, getInvitations } from "../lib/store";
import type { ShellRuntimeContext } from "../plannerxchange";

const STATUS_CONFIG: Record<
  RTQInvitation["status"],
  { label: string; className: string }
> = {
  pending: { label: "Pending", className: "bg-yellow-100 text-yellow-800" },
  completed: { label: "Completed", className: "bg-green-100 text-green-800" },
  expired: { label: "Expired", className: "bg-gray-100 text-gray-500" },
};

export function AdvisorDashboard({ context }: { context: ShellRuntimeContext }) {
  const navigate = useNavigate();
  const [invitations, setInvitations] = useState<RTQInvitation[]>([]);
  const [clients, setClients] = useState<PXClientSummary[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [justSent, setJustSent] = useState(false);
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getInvitations(context.firmId).then(setInvitations);
    fetchClientSummaries(context).then(setClients);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function reload() {
    setInvitations(await getInvitations(context.firmId));
  }

  async function handleSendInvite() {
    if (!selectedClientId || !inviteEmail) return;
    const client = clients.find((c) => c.id === selectedClientId);
    if (!client) return;
    setSending(true);
    setSendError(null);
    try {
      const invitation = await createInvitation(
        context.firmId,
        client.id,
        client.displayName,
        inviteEmail
      );
      await reload();

      const basePath = context.appBasename ? context.appBasename : "";
      const questionnaireUrl = `${window.location.origin}${basePath}/rtq/${invitation.token}`;

      await sendTransactionalEmail(context, {
        to: inviteEmail,
        toName: client.displayName,
        subject: "Your Risk Tolerance Questionnaire is ready",
        htmlBody: `<p>Hi ${client.displayName},</p>
<p>Your advisor has invited you to complete a short risk tolerance questionnaire.</p>
<p><a href="${questionnaireUrl}">Start questionnaire →</a></p>
<p>This takes approximately 5 minutes. Your answers will be used to understand your investment preferences.</p>`,
        textBody: `Hi ${client.displayName},\n\nYour advisor has invited you to complete a short risk tolerance questionnaire.\n\nStart here: ${questionnaireUrl}\n\nThis takes approximately 5 minutes.`,
        clientUserId: client.id,
        appRecordId: invitation.id,
        fromLabel: "Risk Tolerance Questionnaire via PlannerXchange",
      });

      setLastInviteUrl(questionnaireUrl);
      setJustSent(true);
      setInviteOpen(false);
      setSelectedClientId("");
      setInviteEmail("");
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Failed to send invitation.");
    } finally {
      setSending(false);
    }
  }

  const pending = invitations.filter((i) => i.status === "pending").length;
  const completed = invitations.filter((i) => i.status === "completed").length;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Invited" value={invitations.length} />
        <StatCard label="Completed" value={completed} color="text-green-700" />
        <StatCard label="Pending" value={pending} color="text-yellow-700" />
      </div>

      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-gray-900">Client Invitations</h1>
        <button
          onClick={() => {
            setInviteOpen(true);
            setSendError(null);
          }}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: context.branding.primaryColor }}
        >
          + Invite Client
        </button>
      </div>

      {justSent && lastInviteUrl && (
        <div className="mb-4 px-4 py-4 bg-green-50 border border-green-200 text-green-800 rounded-lg text-sm space-y-2">
          <p className="font-medium">
            Invitation created!{" "}
            <span className="font-normal opacity-80">
              Mock mode: email logged to console, not delivered.
            </span>
          </p>
          <p className="text-xs text-green-700">
            Use this link to open the client questionnaire flow directly:
          </p>
          <div className="flex items-center gap-2">
            <a
              href={lastInviteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 truncate text-xs font-mono underline break-all"
              style={{ color: context.branding.primaryColor }}
            >
              {lastInviteUrl}
            </a>
            <button
              onClick={() => {
                void navigator.clipboard.writeText(lastInviteUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="flex-shrink-0 px-3 py-1 rounded text-xs font-medium border border-green-300 hover:bg-green-100 transition-colors"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      )}

      {/* Invitations table */}
      {invitations.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📋</p>
          <p className="font-medium">No invitations yet.</p>
          <p className="text-sm mt-1">Click &ldquo;Invite Client&rdquo; to send the first questionnaire.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-left">
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Invited</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Completed</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[...invitations]
                .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
                .map((inv) => {
                  const cfg = STATUS_CONFIG[inv.status];
                  return (
                    <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {inv.clientDisplayName}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{inv.clientEmail}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {formatDate(inv.sentAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {inv.completedAt ? formatDate(inv.completedAt) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {inv.status === "completed" && inv.responseId ? (
                          <button
                            onClick={() => navigate(`/report/${inv.responseId}`)}
                            className="text-xs font-medium underline"
                            style={{ color: context.branding.primaryColor }}
                          >
                            View Report
                          </button>
                        ) : inv.status === "pending" ? (
                          <button
                            onClick={() => navigate(`/rtq/${inv.token}`)}
                            className="text-xs font-medium underline text-gray-400"
                            title="Preview questionnaire link"
                          >
                            Preview link
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}

      {/* Invite modal */}
      <Modal
        open={inviteOpen}
        onClose={() => { setInviteOpen(false); setInviteEmail(""); setSelectedClientId(""); }}
        title="Invite Client to RTQ"
        primaryColor={context.branding.primaryColor}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Select a client and enter their email address. An invitation link will
            be sent via the PlannerXchange relay.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
              style={{ "--tw-ring-color": context.branding.primaryColor } as React.CSSProperties}
            >
              <option value="">— Select a client —</option>
              {clients
                .filter((c) => c.status === "active")
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.displayName}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client email</label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="client@example.com"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
              style={{ "--tw-ring-color": context.branding.primaryColor } as React.CSSProperties}
            />
          </div>

          {sendError && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{sendError}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setInviteOpen(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSendInvite}
              disabled={!selectedClientId || !inviteEmail || sending}
              className="px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 transition-opacity hover:opacity-90"
              style={{ backgroundColor: context.branding.primaryColor }}
            >
              {sending ? "Sending…" : "Send Invitation"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function StatCard({
  label,
  value,
  color = "text-gray-900",
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
