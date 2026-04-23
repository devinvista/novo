import { pgTable, varchar, text, integer, timestamp, numeric, json, boolean, serial, index, unique, type AnyPgColumn } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  role: varchar("role", { length: 50 }).notNull().default("operacional"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  regionIds: json("regionIds").default([]),
  subRegionIds: json("subRegionIds").default([]),
  solutionIds: json("solutionIds").default([]),
  serviceLineIds: json("serviceLineIds").default([]),
  serviceIds: json("serviceIds").default([]),
  gestorId: integer("gestorId"),
  approved: boolean("approved").notNull().default(false),
  approvedAt: timestamp("approved_at"),
  approvedBy: integer("approved_by"),
}, (t) => [
  index("idx_users_role").on(t.role),
  index("idx_users_approved").on(t.approved),
  index("idx_users_gestor_id").on(t.gestorId),
]);

export const objectives = pgTable("objectives", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  ownerId: integer("owner_id").notNull().references(() => users.id),
  regionId: integer("region_id").references(() => regions.id),
  subRegionIds: json("sub_region_ids").default([]),
  startDate: varchar("start_date", { length: 10 }).notNull(),
  endDate: varchar("end_date", { length: 10 }).notNull(),
  status: varchar("status", { length: 50 }).notNull().default("active"),
  progress: numeric("progress", { precision: 5, scale: 2 }).default("0.00"),
  period: varchar("period", { length: 50 }),
  serviceLineId: integer("service_line_id").references(() => serviceLines.id),
  parentObjectiveId: integer("parent_objective_id").references((): AnyPgColumn => objectives.id),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
}, (t) => [
  index("idx_objectives_owner_id").on(t.ownerId),
  index("idx_objectives_region_id").on(t.regionId),
  index("idx_objectives_service_line_id").on(t.serviceLineId),
  index("idx_objectives_status").on(t.status),
  index("idx_objectives_period").on(t.period),
  index("idx_objectives_parent_id").on(t.parentObjectiveId),
  index("idx_objectives_deleted_at").on(t.deletedAt),
]);

export const keyResults = pgTable("key_results", {
  id: serial("id").primaryKey(),
  objectiveId: integer("objective_id").notNull().references(() => objectives.id),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  targetValue: numeric("target_value", { precision: 15, scale: 2 }).notNull(),
  currentValue: numeric("current_value", { precision: 15, scale: 2 }).default("0.00"),
  unit: varchar("unit", { length: 50 }),
  strategicIndicatorIds: json("strategicIndicatorIds").default([]),
  serviceLineIds: json("serviceLineIds").default([]),
  serviceLineId: integer("service_line_id").references(() => serviceLines.id),
  serviceId: integer("service_id").references(() => services.id),
  startDate: varchar("start_date", { length: 10 }).notNull(),
  endDate: varchar("end_date", { length: 10 }).notNull(),
  frequency: varchar("frequency", { length: 50 }).notNull(),
  status: varchar("status", { length: 50 }).notNull().default("active"),
  progress: numeric("progress", { precision: 5, scale: 2 }).default("0.00"),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
}, (t) => [
  index("idx_key_results_objective_id").on(t.objectiveId),
  index("idx_key_results_service_line_id").on(t.serviceLineId),
  index("idx_key_results_service_id").on(t.serviceId),
  index("idx_key_results_status").on(t.status),
  index("idx_key_results_deleted_at").on(t.deletedAt),
]);

export const actions = pgTable("actions", {
  id: serial("id").primaryKey(),
  keyResultId: integer("key_result_id").notNull().references(() => keyResults.id),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  number: integer("number").notNull().default(1),
  strategicIndicatorId: integer("strategic_indicator_id").references(() => strategicIndicators.id),
  serviceLineId: integer("service_line_id").references(() => serviceLines.id),
  serviceId: integer("service_id").references(() => services.id),
  responsibleId: integer("responsible_id").references(() => users.id),
  dueDate: varchar("due_date", { length: 10 }),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  priority: varchar("priority", { length: 50 }).notNull().default("medium"),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
}, (t) => [
  index("idx_actions_key_result_id").on(t.keyResultId),
  index("idx_actions_responsible_id").on(t.responsibleId),
  index("idx_actions_strategic_indicator_id").on(t.strategicIndicatorId),
  index("idx_actions_service_line_id").on(t.serviceLineId),
  index("idx_actions_service_id").on(t.serviceId),
  index("idx_actions_status").on(t.status),
  index("idx_actions_deleted_at").on(t.deletedAt),
]);

export const checkpoints = pgTable("checkpoints", {
  id: serial("id").primaryKey(),
  keyResultId: integer("key_result_id").notNull().references(() => keyResults.id),
  title: varchar("title", { length: 255 }).notNull().default("Checkpoint"),
  period: varchar("period", { length: 50 }).notNull(),
  targetValue: numeric("target_value", { precision: 15, scale: 2 }).notNull(),
  actualValue: numeric("actual_value", { precision: 15, scale: 2 }),
  progress: numeric("progress", { precision: 5, scale: 2 }).default("0.00"),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  dueDate: timestamp("due_date"),
  completedDate: timestamp("completed_date"),
  notes: text("notes"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
}, (t) => [
  index("idx_checkpoints_key_result_id").on(t.keyResultId),
  index("idx_checkpoints_status").on(t.status),
  index("idx_checkpoints_period").on(t.period),
  index("idx_checkpoints_due_date").on(t.dueDate),
]);

export const actionComments = pgTable("action_comments", {
  id: serial("id").primaryKey(),
  actionId: integer("actionId").notNull().references(() => actions.id),
  userId: integer("userId").notNull().references(() => users.id),
  comment: text("comment").notNull(),
  createdAt: timestamp("createdAt").default(sql`CURRENT_TIMESTAMP`),
}, (t) => [
  index("idx_action_comments_action_id").on(t.actionId),
  index("idx_action_comments_user_id").on(t.userId),
]);

export const regions = pgTable("regions", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).notNull().unique(),
});

export const subRegions = pgTable("sub_regions", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  regionId: integer("region_id").notNull().references(() => regions.id),
}, (t) => [
  index("idx_sub_regions_region_id").on(t.regionId),
]);

export const solutions = pgTable("solutions", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  description: text("description"),
});

export const serviceLines = pgTable("service_lines", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  description: text("description"),
  solutionId: integer("solution_id").notNull().references(() => solutions.id),
}, (t) => [
  index("idx_service_lines_solution_id").on(t.solutionId),
]);

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  description: text("description"),
  serviceLineId: integer("service_line_id").notNull().references(() => serviceLines.id),
}, (t) => [
  index("idx_services_service_line_id").on(t.serviceLineId),
]);

export const strategicIndicators = pgTable("strategic_indicators", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  description: text("description"),
  unit: varchar("unit", { length: 50 }),
});

export const quarterlyPeriods = pgTable("quarterly_periods", {
  id: serial("id").primaryKey(),
  period: varchar("period", { length: 10 }).notNull().unique(),
  year: integer("year").notNull(),
  quarter: integer("quarter").notNull(),
  startDate: varchar("startDate", { length: 10 }).notNull(),
  endDate: varchar("endDate", { length: 10 }).notNull(),
});

// Dependências entre ações (finish-to-start para Gantt)
export const actionDependencies = pgTable("action_dependencies", {
  id: serial("id").primaryKey(),
  actionId: integer("action_id").notNull().references(() => actions.id, { onDelete: "cascade" }),
  dependsOnId: integer("depends_on_id").notNull().references(() => actions.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
}, (t) => [
  index("idx_action_deps_action_id").on(t.actionId),
  index("idx_action_deps_depends_on_id").on(t.dependsOnId),
  unique("uq_action_dependency").on(t.actionId, t.dependsOnId),
]);

// Audit log — registra create/update/delete/restore em qualquer entidade
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  userId: integer("userId").references(() => users.id),
  action: varchar("action", { length: 50 }).notNull(), // create | update | delete | restore | check_in
  entityType: varchar("entityType", { length: 50 }).notNull(),
  entityId: integer("entityId").notNull(),
  details: text("details"), // JSON serializado com diff
  createdAt: timestamp("createdAt").default(sql`CURRENT_TIMESTAMP`),
}, (t) => [
  index("idx_activities_user_id").on(t.userId),
  index("idx_activities_entity").on(t.entityType, t.entityId),
  index("idx_activities_created_at").on(t.createdAt),
]);

// Check-ins semanais estruturados em KRs (status, confiança, próximos passos, bloqueios)
export const krCheckIns = pgTable("kr_check_ins", {
  id: serial("id").primaryKey(),
  keyResultId: integer("key_result_id").notNull().references(() => keyResults.id),
  authorId: integer("author_id").notNull().references(() => users.id),
  weekStart: varchar("week_start", { length: 10 }).notNull(), // YYYY-MM-DD da segunda-feira
  status: varchar("status", { length: 20 }).notNull().default("on_track"), // on_track | at_risk | off_track
  confidence: integer("confidence").notNull().default(5), // 1..10
  currentValue: numeric("current_value", { precision: 15, scale: 2 }),
  nextSteps: text("next_steps"),
  blockers: text("blockers"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
}, (t) => [
  index("idx_kr_check_ins_kr_id").on(t.keyResultId),
  index("idx_kr_check_ins_week").on(t.weekStart),
  index("idx_kr_check_ins_author").on(t.authorId),
]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Objective = typeof objectives.$inferSelect;
export type InsertObjective = typeof objectives.$inferInsert;
export type KeyResult = typeof keyResults.$inferSelect;
export type InsertKeyResult = typeof keyResults.$inferInsert;
export type Action = typeof actions.$inferSelect;
export type InsertAction = typeof actions.$inferInsert;
export type Checkpoint = typeof checkpoints.$inferSelect;
export type InsertCheckpoint = typeof checkpoints.$inferInsert;
export type ActionComment = typeof actionComments.$inferSelect;
export type InsertActionComment = typeof actionComments.$inferInsert;
export type Region = typeof regions.$inferSelect;
export type SubRegion = typeof subRegions.$inferSelect;
export type Solution = typeof solutions.$inferSelect;
export type ServiceLine = typeof serviceLines.$inferSelect;
export type Service = typeof services.$inferSelect;
export type StrategicIndicator = typeof strategicIndicators.$inferSelect;
export type Activity = typeof activities.$inferSelect;
export type InsertActivity = typeof activities.$inferInsert;
export type ActionDependency = typeof actionDependencies.$inferSelect;
export type InsertActionDependency = typeof actionDependencies.$inferInsert;
export type KrCheckIn = typeof krCheckIns.$inferSelect;
export type InsertKrCheckIn = typeof krCheckIns.$inferInsert;

export const insertUserSchema = createInsertSchema(users);
export const insertObjectiveSchema = createInsertSchema(objectives);
export const insertKeyResultSchema = createInsertSchema(keyResults);
export const insertActionSchema = createInsertSchema(actions);
export const insertCheckpointSchema = createInsertSchema(checkpoints);
export const insertActionCommentSchema = createInsertSchema(actionComments);
export const insertKrCheckInSchema = createInsertSchema(krCheckIns).omit({
  id: true,
  authorId: true,
  createdAt: true,
}).extend({
  status: z.enum(["on_track", "at_risk", "off_track"]),
  confidence: z.number().int().min(1).max(10),
});

export const userFormSchema = insertUserSchema.omit({
  id: true,
  createdAt: true,
  approvedAt: true,
  approvedBy: true,
});

export const objectiveFormSchema = insertObjectiveSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  progress: true,
  deletedAt: true,
});

export const keyResultFormSchema = insertKeyResultSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  currentValue: true,
  progress: true,
  deletedAt: true,
});

export const actionFormSchema = insertActionSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  number: true,
  deletedAt: true,
});

export const checkpointFormSchema = insertCheckpointSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const actionCommentFormSchema = insertActionCommentSchema.omit({
  id: true,
  createdAt: true
});

export const solutionSchema = createInsertSchema(solutions).omit({ id: true });
export const serviceLineSchema = createInsertSchema(serviceLines).omit({ id: true });
export const serviceSchema = createInsertSchema(services).omit({ id: true });
export const strategicIndicatorSchema = createInsertSchema(strategicIndicators).omit({ id: true });

export type InsertUserType = z.infer<typeof insertUserSchema>;
export type InsertObjectiveType = z.infer<typeof insertObjectiveSchema>;
export type InsertKeyResultType = z.infer<typeof insertKeyResultSchema>;
export type InsertActionType = z.infer<typeof insertActionSchema>;
export type InsertCheckpointType = z.infer<typeof insertCheckpointSchema>;
export type InsertActionCommentType = z.infer<typeof insertActionCommentSchema>;
export type InsertKrCheckInType = z.infer<typeof insertKrCheckInSchema>;
