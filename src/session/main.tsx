import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import type { ReadingItem, ReadingSession } from "../domain/schemas";
import { sendMessage } from "../shared/client";
import { EmptyState, Notice, PageShell, formatDateTime } from "../shared/ui";

type ReviewState = Record<string, "unfinished" | "completed" | "skipped">;
type ReviewNotice = { text: string; tone: "success" | "danger" };

const SessionCard = ({
  session,
  items,
  onReviewed
}: {
  session: ReadingSession;
  items: ReadingItem[];
  onReviewed: () => Promise<void>;
}) => {
  const sessionItems = useMemo(
    () =>
      session.itemIds
        .map((id) => items.find((item) => item.id === id))
        .filter(Boolean) as ReadingItem[],
    [session.itemIds, items]
  );
  const [review, setReview] = useState<ReviewState>(() =>
    Object.fromEntries(
      session.itemIds.map((id) => [
        id,
        session.completedItemIds.includes(id)
          ? "completed"
          : session.skippedItemIds.includes(id)
            ? "skipped"
            : "unfinished"
      ])
    )
  );
  const [notice, setNotice] = useState<ReviewNotice>();
  const [submitting, setSubmitting] = useState(false);
  const now = Date.now();
  const remainingMinutes = Math.max(0, Math.ceil((new Date(session.end).getTime() - now) / 60_000));

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    const result = await sendMessage<ReadingSession>({
      type: "sessions.review",
      payload: {
        sessionId: session.id,
        completedItemIds: Object.entries(review)
          .filter(([, value]) => value === "completed")
          .map(([id]) => id),
        skippedItemIds: Object.entries(review)
          .filter(([, value]) => value === "skipped")
          .map(([id]) => id)
      }
    });
    if (result.ok) {
      setNotice({
        text: "Review saved. Unfinished items returned to your queue.",
        tone: "success"
      });
      await onReviewed();
    } else setNotice({ text: result.error.message, tone: "danger" });
    setSubmitting(false);
  };

  return (
    <article className="panel">
      <div className="proposal-header">
        <div>
          <p className="eyebrow">{session.status.replace("_", " ")}</p>
          <h2>{formatDateTime(session.start)}</h2>
        </div>
        {session.status !== "completed" && (
          <span className="pill">
            {remainingMinutes ? `${remainingMinutes} min remaining` : "Ready to review"}
          </span>
        )}
      </div>
      {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}
      <ul className="session-items">
        {sessionItems.map((item) => (
          <li className="session-item" key={item.id}>
            <a className="item-title" href={item.originalUrl} target="_blank" rel="noreferrer">
              {item.title}
            </a>
            <select
              aria-label={`Outcome for ${item.title}`}
              value={review[item.id]}
              onChange={(event) =>
                setReview({ ...review, [item.id]: event.target.value as ReviewState[string] })
              }
              disabled={session.status === "completed" || submitting}
            >
              <option value="unfinished">Move to later</option>
              <option value="completed">Completed</option>
              <option value="skipped">Archive</option>
            </select>
          </li>
        ))}
      </ul>
      {session.status !== "completed" && (
        <div className="actions">
          <button
            className="button button-secondary"
            disabled={submitting}
            onClick={() =>
              sessionItems.forEach((item) => window.open(item.originalUrl, "_blank", "noopener"))
            }
          >
            Open all
          </button>
          <button
            className="button button-primary"
            disabled={submitting}
            onClick={() => void submit()}
          >
            {submitting ? "Saving review…" : "Finish review"}
          </button>
        </div>
      )}
    </article>
  );
};

export const SessionApp = () => {
  const [sessions, setSessions] = useState<ReadingSession[]>([]);
  const [items, setItems] = useState<ReadingItem[]>([]);
  const [error, setError] = useState<string>();
  const load = async () => {
    const [sessionResult, itemResult] = await Promise.all([
      sendMessage<ReadingSession[]>({ type: "sessions.list", payload: {} }),
      sendMessage<ReadingItem[]>({ type: "items.list", payload: { includeDeleted: true } })
    ]);
    if (sessionResult.ok)
      setSessions(
        sessionResult.value.sort(
          (a, b) => new Date(b.start).getTime() - new Date(a.start).getTime()
        )
      );
    else setError(sessionResult.error.message);
    if (itemResult.ok) setItems(itemResult.value);
  };
  useEffect(() => {
    void load();
  }, []);

  return (
    <PageShell eyebrow="Reading sessions" title="Read with intention.">
      {error && <Notice tone="danger">{error}</Notice>}
      {sessions.length === 0 ? (
        <EmptyState title="No sessions yet">
          Confirm a proposal in the planner and your reading session will appear here.
        </EmptyState>
      ) : (
        <div className="grid">
          {sessions.map((session) => (
            <SessionCard key={session.id} session={session} items={items} onReviewed={load} />
          ))}
        </div>
      )}
    </PageShell>
  );
};

const root = document.getElementById("root");
if (root)
  createRoot(root).render(
    <StrictMode>
      <SessionApp />
    </StrictMode>
  );
