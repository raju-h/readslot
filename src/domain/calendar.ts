import type { CalendarSummary } from "./ports";

export const writableAccessRoles = ["writer", "owner"] as const;

export const isWritableCalendar = (accessRole: CalendarSummary["accessRole"]): boolean =>
  writableAccessRoles.includes(accessRole as (typeof writableAccessRoles)[number]);
