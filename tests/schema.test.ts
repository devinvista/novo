import { describe, it, expect } from "vitest";
import {
  insertObjectiveSchema,
  insertKeyResultSchema,
  insertActionSchema,
  insertCheckpointSchema,
  insertUserSchema,
  objectiveFormSchema,
  keyResultFormSchema,
  actionFormSchema,
} from "@shared/schema";

/**
 * Schema contract tests — guarantee that the Zod schemas derived from the
 * Drizzle tables accept valid payloads and reject obviously invalid ones.
 * These are the first line of defense for API request validation.
 */
describe("insert schemas", () => {
  it("accepts a minimal valid objective", () => {
    const result = insertObjectiveSchema.safeParse({
      title: "Aumentar atendimentos",
      ownerId: 1,
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      status: "active",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an objective without title", () => {
    const result = insertObjectiveSchema.safeParse({
      ownerId: 1,
      startDate: "2026-01-01",
      endDate: "2026-12-31",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a minimal valid key result", () => {
    const result = insertKeyResultSchema.safeParse({
      objectiveId: 1,
      title: "Atingir 1000 atendimentos",
      targetValue: "1000.00",
      startDate: "2026-01-01",
      endDate: "2026-03-31",
      frequency: "monthly",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a key result without targetValue", () => {
    const result = insertKeyResultSchema.safeParse({
      objectiveId: 1,
      title: "x",
      startDate: "2026-01-01",
      endDate: "2026-03-31",
      frequency: "monthly",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a minimal valid action", () => {
    const result = insertActionSchema.safeParse({
      keyResultId: 1,
      title: "Mapear leads",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a checkpoint with all required fields", () => {
    const result = insertCheckpointSchema.safeParse({
      keyResultId: 1,
      period: "2026-T1",
      targetValue: "100.00",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a valid user payload", () => {
    const result = insertUserSchema.safeParse({
      username: "joao",
      password: "hashed",
      name: "João",
      email: "joao@example.com",
    });
    expect(result.success).toBe(true);
  });
});

describe("form schemas omit auto-generated fields", () => {
  it("objectiveFormSchema does not require id/createdAt/updatedAt/progress", () => {
    const result = objectiveFormSchema.safeParse({
      title: "Test",
      ownerId: 1,
      startDate: "2026-01-01",
      endDate: "2026-12-31",
    });
    expect(result.success).toBe(true);
  });

  it("keyResultFormSchema does not require currentValue/progress", () => {
    const result = keyResultFormSchema.safeParse({
      objectiveId: 1,
      title: "x",
      targetValue: "100.00",
      startDate: "2026-01-01",
      endDate: "2026-03-31",
      frequency: "monthly",
    });
    expect(result.success).toBe(true);
  });

  it("actionFormSchema does not require number", () => {
    const result = actionFormSchema.safeParse({
      keyResultId: 1,
      title: "x",
    });
    expect(result.success).toBe(true);
  });
});
