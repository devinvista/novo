import { pgTable, varchar, text, integer, timestamp, numeric, json, boolean, serial } from "drizzle-orm/pg-core";
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
});

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
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

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
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

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
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

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
});

export const actionComments = pgTable("action_comments", {
  id: serial("id").primaryKey(),
  actionId: integer("actionId").notNull().references(() => actions.id),
  userId: integer("userId").notNull().references(() => users.id),
  comment: text("comment").notNull(),
  createdAt: timestamp("createdAt").default(sql`CURRENT_TIMESTAMP`),
});

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
});

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
});

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  description: text("description"),
  serviceLineId: integer("service_line_id").notNull().references(() => serviceLines.id),
});

export const strategicIndicators = pgTable("strategic_indicators", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  description: text("description"),
  unit: varchar("unit", { length: 50 }),
});

export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  userId: integer("userId").references(() => users.id),
  action: varchar("action", { length: 255 }).notNull(),
  entityType: varchar("entityType", { length: 50 }).notNull(),
  entityId: integer("entityId").notNull(),
  details: text("details"),
  createdAt: timestamp("createdAt").default(sql`CURRENT_TIMESTAMP`),
});

export const quarterlyPeriods = pgTable("quarterly_periods", {
  id: serial("id").primaryKey(),
  period: varchar("period", { length: 10 }).notNull().unique(),
  year: integer("year").notNull(),
  quarter: integer("quarter").notNull(),
  startDate: varchar("startDate", { length: 10 }).notNull(),
  endDate: varchar("endDate", { length: 10 }).notNull(),
});

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

export const insertUserSchema = createInsertSchema(users);
export const insertObjectiveSchema = createInsertSchema(objectives);
export const insertKeyResultSchema = createInsertSchema(keyResults);
export const insertActionSchema = createInsertSchema(actions);
export const insertCheckpointSchema = createInsertSchema(checkpoints);
export const insertActionCommentSchema = createInsertSchema(actionComments);

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
  progress: true
});

export const keyResultFormSchema = insertKeyResultSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  currentValue: true,
  progress: true
});

export const actionFormSchema = insertActionSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  number: true
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
