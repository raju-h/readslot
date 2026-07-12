import { StrictMode, useEffect, useMemo, useState, type FormEvent } from "react";
import { createRoot } from "react-dom/client";
import type { Backup, ItemStatus, Priority, ReadingItem } from "../domain/schemas";
import { extensionUrl, sendMessage } from "../shared/client";
import { EmptyState, Notice, PageShell, formatMinutes } from "../shared/ui";

type View = "all" | ItemStatus;

interface Stats {
  totalItems: number;
  queuedItems: number;
  scheduledItems: number;
  completedItems: number;
  queueMinutes: number;
  completedSessions: number;
}

const views: Array<{ value: View; label: string }> = [
  { value: "all", label: "All" },
  { value: "queued", label: "Inbox" },
  { value: "proposed", label: "Proposed" },
  { value: "scheduled", label: "Scheduled" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
  { value: "deleted", label: "Trash" }
];

const App = () => {
  const [items, setItems] = useState<ReadingItem[]>([]);
  const [stats, setStats] = useState<Stats>();
  const [view, setView] = useState<View>("queued");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [url, setUrl] = useState("");
  const [notice, setNotice] = useState<{ tone: "success" | "danger" | "info"; text: string }>();
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [itemResult, statsResult] = await Promise.all([
      sendMessage<ReadingItem[]>({
        type: "items.list",
        payload: {
          status: view === "all" ? undefined : view,
          search,
          includeDeleted: view === "deleted"
        }
      }),
      sendMessage<Stats>({ type: "dashboard.stats", payload: {} })
    ]);
    if (itemResult.ok) setItems(itemResult.value);
    else setNotice({ tone: "danger", text: itemResult.error.message });
    if (statsResult.ok) setStats(statsResult.value);
    setLoading(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => void load(), 120);
    return () => clearTimeout(timer);
  }, [view, search]);

  const selectedItems = useMemo(
    () => items.filter((item) => selected.has(item.id)),
    [items, selected]
  );

  const handleAdd = async (event: FormEvent) => {
    event.preventDefault();
    const result = await sendMessage<{ item: ReadingItem; duplicate: boolean }>({
      type: "capture.url",
      payload: { url }
    });
    if (result.ok) {
      setUrl("");
      setNotice({
        tone: result.value.duplicate ? "info" : "success",
        text: result.value.duplicate ? "That URL is already in ReadSlot." : "Saved to your queue."
      });
      await load();
    } else setNotice({ tone: "danger", text: result.error.message });
  };

  const update = async (
    id: string,
    changes: { status?: ItemStatus; priority?: Priority; plannedMinutes?: number }
  ) => {
    const result = await sendMessage<ReadingItem>({
      type: "items.update",
      payload: { id, changes }
    });
    if (!result.ok) setNotice({ tone: "danger", text: result.error.message });
    await load();
  };

  const remove = async (id: string, permanent = false) => {
    const result = await sendMessage<void>({ type: "items.remove", payload: { id, permanent } });
    if (!result.ok) setNotice({ tone: "danger", text: result.error.message });
    setSelected((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
    await load();
  };

  const bulkStatus = async (status: ItemStatus) => {
    await Promise.all(selectedItems.map((item) => update(item.id, { status })));
    setSelected(new Set());
  };

  const exportBackup = async () => {
    const result = await sendMessage<Backup>({ type: "backup.export", payload: {} });
    if (!result.ok) return setNotice({ tone: "danger", text: result.error.message });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(
      new Blob([JSON.stringify(result.value, null, 2)], { type: "application/json" })
    );
    link.download = `readslot-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const downloadExport = async (format: "csv" | "markdown" | "bookmarks" | "urls") => {
    const result = await sendMessage<{ filename: string; mimeType: string; text: string }>({
      type: "items.export",
      payload: { format }
    });
    if (!result.ok) return setNotice({ tone: "danger", text: result.error.message });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([result.value.text], { type: result.value.mimeType }));
    link.download = result.value.filename;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const importBackup = async (file?: File) => {
    if (!file) return;
    try {
      const backup = JSON.parse(await file.text()) as Backup;
      if (
        !window.confirm(
          `Import ${backup.items?.length ?? 0} items from this ReadSlot backup? Existing URLs will be preserved.`
        )
      )
        return;
      const result = await sendMessage<{ added: number; skipped: number }>({
        type: "backup.import",
        payload: { backup }
      });
      if (!result.ok) throw new Error(result.error.message);
      setNotice({
        tone: "success",
        text: `Imported ${result.value.added} items; skipped ${result.value.skipped} duplicates.`
      });
      await load();
    } catch (error) {
      setNotice({
        tone: "danger",
        text: error instanceof Error ? error.message : "That backup is not valid."
      });
    }
  };

  const importText = async (file?: File) => {
    if (!file) return;
    const extension = file.name.split(".").at(-1)?.toLowerCase();
    const format =
      extension === "csv"
        ? "csv"
        : extension === "html" || extension === "htm"
          ? "html"
          : extension === "md"
            ? "markdown"
            : "urls";
    const text = await file.text();
    const preview = await sendMessage<{ added: number; skipped: number; invalid: number }>({
      type: "items.importText",
      payload: { format, text, preview: true }
    });
    if (!preview.ok) return setNotice({ tone: "danger", text: preview.error.message });
    if (
      !window.confirm(
        `Import ${preview.value.added} new URLs? ${preview.value.skipped} duplicates and ${preview.value.invalid} invalid entries will be skipped.`
      )
    )
      return;
    const result = await sendMessage<{ added: number; skipped: number; invalid: number }>({
      type: "items.importText",
      payload: { format, text, preview: false }
    });
    if (result.ok) {
      setNotice({ tone: "success", text: `Imported ${result.value.added} URLs.` });
      await load();
    } else setNotice({ tone: "danger", text: result.error.message });
  };

  return (
    <PageShell
      eyebrow="Reading queue"
      title="Make later happen."
      actions={
        <>
          <a className="button button-primary" href={extensionUrl("planner.html")}>
            Plan reading time
          </a>
          <button className="button button-secondary" onClick={() => void exportBackup()}>
            Export backup
          </button>
        </>
      }
    >
      {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}
      <section className="grid grid-3" aria-label="Queue summary">
        <div className="panel stat">
          <span>Waiting to read</span>
          <strong>{stats?.queuedItems ?? "—"}</strong>
        </div>
        <div className="panel stat">
          <span>Queue commitment</span>
          <strong>{stats ? formatMinutes(stats.queueMinutes) : "—"}</strong>
        </div>
        <div className="panel stat">
          <span>Completed</span>
          <strong>{stats?.completedItems ?? "—"}</strong>
        </div>
      </section>

      <section className="panel" style={{ marginTop: 22 }}>
        <form className="toolbar" onSubmit={(event) => void handleAdd(event)}>
          <label className="search">
            Save a URL
            <input
              type="url"
              required
              placeholder="https://example.com/article"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
            />
          </label>
          <button className="button button-primary" type="submit">
            Add to queue
          </button>
          <label className="button button-secondary" style={{ display: "inline-flex" }}>
            Import backup
            <input
              type="file"
              accept="application/json"
              hidden
              onChange={(event) => void importBackup(event.target.files?.[0])}
            />
          </label>
          <label className="button button-secondary" style={{ display: "inline-flex" }}>
            Import links
            <input
              type="file"
              accept=".csv,.html,.htm,.md,.txt"
              hidden
              onChange={(event) => void importText(event.target.files?.[0])}
            />
          </label>
          <select
            aria-label="Export queue format"
            defaultValue=""
            onChange={(event) => {
              if (event.target.value)
                void downloadExport(
                  event.target.value as "csv" | "markdown" | "bookmarks" | "urls"
                );
              event.target.value = "";
            }}
          >
            <option value="" disabled>
              Export format…
            </option>
            <option value="csv">CSV</option>
            <option value="markdown">Markdown</option>
            <option value="bookmarks">Bookmarks HTML</option>
            <option value="urls">URL list</option>
          </select>
        </form>
      </section>

      <section aria-labelledby="items-heading" style={{ marginTop: 28 }}>
        <div className="toolbar" style={{ justifyContent: "space-between" }}>
          <div className="tabs" role="tablist" aria-label="Queue views">
            {views.map((entry) => (
              <button
                key={entry.value}
                role="tab"
                aria-selected={view === entry.value}
                onClick={() => {
                  setView(entry.value);
                  setSelected(new Set());
                }}
              >
                {entry.label}
              </button>
            ))}
          </div>
          <label className="search">
            Search queue
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Title, URL, tag, note…"
            />
          </label>
        </div>

        {selected.size > 0 && (
          <div className="notice notice-info actions">
            <strong>{selected.size} selected</strong>
            <button className="button button-secondary" onClick={() => void bulkStatus("proposed")}>
              Add to proposal
            </button>
            <button className="button button-secondary" onClick={() => void bulkStatus("archived")}>
              Archive
            </button>
            <button className="button button-danger" onClick={() => void bulkStatus("deleted")}>
              Move to trash
            </button>
          </div>
        )}

        {loading ? (
          <Notice>Loading your local queue…</Notice>
        ) : items.length === 0 ? (
          <EmptyState title="Nothing in this view">
            Save a useful page with the toolbar button or paste a URL above.
          </EmptyState>
        ) : (
          <ul className="item-list" id="items-heading">
            {items.map((item) => (
              <li className="item-card" key={item.id}>
                <input
                  type="checkbox"
                  aria-label={`Select ${item.title}`}
                  checked={selected.has(item.id)}
                  onChange={(event) =>
                    setSelected((current) => {
                      const next = new Set(current);
                      if (event.target.checked) next.add(item.id);
                      else next.delete(item.id);
                      return next;
                    })
                  }
                />
                <div>
                  <a
                    className="item-title"
                    href={item.originalUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {item.title}
                  </a>
                  <div className="meta">
                    <span>{item.domain}</span>
                    <span>·</span>
                    <span>{formatMinutes(item.plannedMinutes ?? item.estimatedMinutes)}</span>
                    <span className="pill">{item.contentType}</span>
                    <span className={item.priority === "high" ? "pill pill-high" : "pill"}>
                      {item.priority}
                    </span>
                    <span className="pill">{item.status}</span>
                  </div>
                </div>
                <div className="actions">
                  <select
                    aria-label={`Priority for ${item.title}`}
                    value={item.priority}
                    onChange={(event) =>
                      void update(item.id, { priority: event.target.value as Priority })
                    }
                  >
                    <option value="high">High</option>
                    <option value="normal">Normal</option>
                    <option value="low">Low</option>
                    <option value="someday">Someday</option>
                  </select>
                  <input
                    aria-label={`Planned minutes for ${item.title}`}
                    title="Planned minutes"
                    type="number"
                    min="5"
                    max="10080"
                    value={item.plannedMinutes ?? item.estimatedMinutes}
                    style={{ width: 82 }}
                    onChange={(event) =>
                      void update(item.id, { plannedMinutes: Number(event.target.value) })
                    }
                  />
                  {item.status === "deleted" ? (
                    <>
                      <button
                        className="button button-secondary"
                        onClick={() => void update(item.id, { status: "queued" })}
                      >
                        Restore
                      </button>
                      <button
                        className="button button-danger"
                        onClick={() => void remove(item.id, true)}
                      >
                        Delete forever
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="button button-quiet"
                        onClick={() =>
                          void update(item.id, {
                            status: item.status === "completed" ? "queued" : "completed"
                          })
                        }
                      >
                        {item.status === "completed" ? "Mark unread" : "Complete"}
                      </button>
                      <button className="button button-quiet" onClick={() => void remove(item.id)}>
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageShell>
  );
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
