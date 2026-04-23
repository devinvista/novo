import { db } from "../pg-db";
import { activities, type InsertActivity } from "@shared/schema";
import { logger } from "../infra/logger";

export type AuditAction = "create" | "update" | "delete" | "restore" | "check_in";
export type AuditEntity =
  | "objective"
  | "key_result"
  | "action"
  | "checkpoint"
  | "kr_check_in"
  | "user";

export interface AuditEntry {
  userId?: number | null;
  action: AuditAction;
  entityType: AuditEntity;
  entityId: number;
  before?: unknown;
  after?: unknown;
  meta?: Record<string, unknown>;
}

/**
 * Registra uma entrada no log de auditoria. Falhas são apenas logadas — auditoria
 * nunca deve quebrar a operação principal.
 */
export async function recordActivity(entry: AuditEntry): Promise<void> {
  try {
    const details = JSON.stringify({
      before: entry.before ?? null,
      after: entry.after ?? null,
      meta: entry.meta ?? null,
    });

    const insert: InsertActivity = {
      userId: entry.userId ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      details,
    };
    await db.insert(activities).values(insert);
  } catch (err) {
    logger.warn({ err, entry }, "audit log write failed");
  }
}
