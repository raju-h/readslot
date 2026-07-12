import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { ProposalSchema, type Proposal } from "../domain/schemas";
import { sendMessage } from "../shared/client";
import { EmptyState, Notice, PageShell, formatDateTime, formatMinutes } from "../shared/ui";

interface CalendarStatus {
  configured: boolean;
  connected: boolean;
}
interface WeeklyPlan {
  id: string;
  label: string;
  blocks: number;
  minutes: number;
  description: string;
}

const toLocalInput = (iso: string) => {
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

const App = () => {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [status, setStatus] = useState<CalendarStatus>({ configured: false, connected: false });
  const [notice, setNotice] = useState<{
    tone: "info" | "success" | "warning" | "danger";
    text: string;
  }>();
  const [loading, setLoading] = useState(false);
  const [conflictId, setConflictId] = useState<string>();
  const [weeklyPlans, setWeeklyPlans] = useState<WeeklyPlan[]>([]);

  const load = async () => {
    const [proposalResult, statusResult, weeklyResult] = await Promise.all([
      sendMessage<Proposal[]>({ type: "proposals.list", payload: {} }),
      sendMessage<CalendarStatus>({ type: "calendar.status", payload: {} }),
      sendMessage<WeeklyPlan[]>({ type: "weekly.plan", payload: {} })
    ]);
    if (proposalResult.ok)
      setProposals(
        proposalResult.value
          .filter((proposal) => ["ready", "draft", "stale"].includes(proposal.status))
          .sort((a, b) => b.score - a.score)
      );
    if (statusResult.ok) setStatus(statusResult.value);
    if (weeklyResult.ok) setWeeklyPlans(weeklyResult.value);
  };

  useEffect(() => {
    void load();
  }, []);

  const connect = async () => {
    const result = await sendMessage<{ connected: boolean }>({
      type: "calendar.connect",
      payload: {}
    });
    if (result.ok) {
      setNotice({ tone: "success", text: "Google Calendar connected." });
      await load();
    } else setNotice({ tone: "danger", text: result.error.message });
  };

  const generate = async () => {
    setLoading(true);
    const result = await sendMessage<Proposal[]>({ type: "suggestions.generate", payload: {} });
    setLoading(false);
    if (result.ok) {
      setProposals(result.value);
      setNotice(
        result.value.length
          ? {
              tone: status.connected ? "success" : "warning",
              text: status.connected
                ? "Found your best available reading windows."
                : "Previewing times without Calendar availability. Connect Google before confirmation."
            }
          : {
              tone: "info",
              text: "No fitting times were found. Check your queue and scheduling preferences."
            }
      );
    } else setNotice({ tone: "danger", text: result.error.message });
  };

  const saveProposal = async (proposal: Proposal) => {
    const result = await sendMessage<Proposal>({
      type: "proposals.save",
      payload: { proposal: ProposalSchema.parse(proposal) }
    });
    if (result.ok)
      setProposals((current) =>
        current.map((entry) => (entry.id === proposal.id ? result.value : entry))
      );
    else setNotice({ tone: "danger", text: result.error.message });
  };

  const updateStart = (proposal: Proposal, local: string) => {
    const start = new Date(local);
    const next = ProposalSchema.parse({
      ...proposal,
      suggestedStart: start.toISOString(),
      suggestedEnd: new Date(start.getTime() + proposal.durationMinutes * 60_000).toISOString(),
      status: "draft",
      conflictStatus: "unknown"
    });
    void saveProposal(next);
  };

  const updateDuration = (proposal: Proposal, duration: number) => {
    const next = ProposalSchema.parse({
      ...proposal,
      durationMinutes: duration,
      suggestedEnd: new Date(
        new Date(proposal.suggestedStart).getTime() + duration * 60_000
      ).toISOString(),
      status: "draft",
      conflictStatus: "unknown"
    });
    void saveProposal(next);
  };

  const confirm = async (proposalId: string, conflictOverride = false) => {
    setLoading(true);
    const result = await sendMessage({
      type: "proposals.confirm",
      payload: { proposalId, conflictOverride }
    });
    setLoading(false);
    if (result.ok) {
      setConflictId(undefined);
      setNotice({ tone: "success", text: "Reading block created. Your items are now scheduled." });
      await load();
    } else if (result.error.code === "CONFLICT" && !conflictOverride) {
      setConflictId(proposalId);
      setNotice({ tone: "warning", text: result.error.message });
    } else setNotice({ tone: "danger", text: result.error.message });
  };

  return (
    <PageShell
      eyebrow="Calendar planner"
      title="Choose the time."
      actions={
        <button
          className="button button-primary"
          disabled={loading}
          onClick={() => void generate()}
        >
          {loading ? "Checking…" : "Find reading times"}
        </button>
      }
    >
      {!status.configured && (
        <Notice tone="warning">
          Calendar is not configured in this build. You can preview suggestions, but confirmation is
          disabled.
        </Notice>
      )}
      {status.configured && !status.connected && (
        <Notice tone="info">
          Connect Google Calendar to check real availability.{" "}
          <button className="button button-secondary" onClick={() => void connect()}>
            Connect Google
          </button>
        </Notice>
      )}
      {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}

      <section
        className="grid grid-3"
        aria-label="Weekly planning strategies"
        style={{ marginBottom: 24 }}
      >
        {weeklyPlans.map((plan) => (
          <article className="panel stat" key={plan.id}>
            <div>
              <p className="eyebrow">{plan.label}</p>
              <h2>
                {plan.blocks} {plan.blocks === 1 ? "block" : "blocks"} ·{" "}
                {formatMinutes(plan.minutes)}
              </h2>
            </div>
            <span>{plan.description}</span>
          </article>
        ))}
      </section>

      {proposals.length === 0 ? (
        <EmptyState title="No active suggestions">
          Choose “Find reading times” to turn your queued items into editable proposals.
        </EmptyState>
      ) : (
        <div className="grid grid-2">
          {proposals.map((proposal, index) => (
            <article className="panel proposal" key={proposal.id}>
              <div className="proposal-header">
                <div>
                  <p className="eyebrow">Option {index + 1}</p>
                  <h2>{formatDateTime(proposal.suggestedStart)}</h2>
                </div>
                <span className="pill">{proposal.confidence} confidence</span>
              </div>
              <div className="meta">
                <strong>{formatMinutes(proposal.durationMinutes)}</strong>
                <span>·</span>
                <span>{proposal.itemIds.length} items</span>
                <span>·</span>
                <span>Score {Math.round(proposal.score)}</span>
              </div>
              <ul className="explanations">
                {proposal.explanation.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
              <div className="form-grid">
                <label>
                  Start time
                  <input
                    type="datetime-local"
                    value={toLocalInput(proposal.suggestedStart)}
                    onChange={(event) => updateStart(proposal, event.target.value)}
                  />
                </label>
                <label>
                  Duration
                  <select
                    value={proposal.durationMinutes}
                    onChange={(event) => updateDuration(proposal, Number(event.target.value))}
                  >
                    {[15, 30, 45, 60, 90].map((minutes) => (
                      <option key={minutes} value={minutes}>
                        {minutes} minutes
                      </option>
                    ))}
                  </select>
                </label>
                <label className="wide">
                  Event title
                  <input
                    value={proposal.title}
                    onChange={(event) =>
                      setProposals((current) =>
                        current.map((entry) =>
                          entry.id === proposal.id ? { ...entry, title: event.target.value } : entry
                        )
                      )
                    }
                    onBlur={(event) =>
                      void saveProposal(
                        ProposalSchema.parse({ ...proposal, title: event.target.value })
                      )
                    }
                  />
                </label>
              </div>
              <p className="meta">
                Nothing is added to Calendar until you press the confirmation button.
              </p>
              {conflictId === proposal.id ? (
                <div className="notice notice-warning">
                  <strong>Conflict detected.</strong>
                  <p>
                    This creates over another event. Lydra will proceed only after this second
                    confirmation.
                  </p>
                  <button
                    className="button button-danger"
                    onClick={() => void confirm(proposal.id, true)}
                  >
                    Create conflicting block
                  </button>
                </div>
              ) : (
                <button
                  className="button button-primary"
                  disabled={!status.connected || loading}
                  onClick={() => void confirm(proposal.id)}
                >
                  Create reading block
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </PageShell>
  );
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
