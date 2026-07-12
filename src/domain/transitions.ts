import type { ItemStatus } from "./schemas";

const transitions: Record<ItemStatus, ReadonlySet<ItemStatus>> = {
  queued: new Set(["proposed", "scheduled", "completed", "archived", "deleted"]),
  proposed: new Set(["queued", "scheduled", "archived", "deleted"]),
  scheduled: new Set(["in_progress", "queued", "completed", "archived"]),
  in_progress: new Set(["completed", "queued", "archived"]),
  completed: new Set(["queued", "archived", "deleted"]),
  archived: new Set(["queued", "deleted"]),
  deleted: new Set(["queued"])
};

export const canTransitionItem = (from: ItemStatus, to: ItemStatus): boolean =>
  from === to || transitions[from].has(to);
