import { mysqlTable, int, varchar, text, decimal, timestamp, json, boolean } from "drizzle-orm/mysql-core";
import { relations, sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table with role-based access
export const users: any = mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  role: varchar("role", { length: 50 }).notNull().default("operacional"), // admin, gestor, operacional
  regionIds: json("regionIds").$type<number[]>().default([]), // Multiple regions
  subRegionIds: json("subRegionIds").$type<number[]>().default([]), // Multiple sub-regions
  solutionIds: json("solutionIds").$type<number[]>().default([]), // Multiple solutions
  serviceLineIds: json("serviceLineIds").$type<number[]>().default([]), // Multiple service lines
  serviceIds: json("serviceIds").$type<number[]>().default([]), // Multiple services
  gestorId: int("gestorId").references(() => users.id), // Reference to manager
  approved: boolean("approved").notNull().default(false), // Approval status
  approvedAt: timestamp("approvedAt"), // When was approved
  approvedBy: int("approvedBy").references(() => users.id), // Who approved
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// Regions table (10 specific regions)
export const regions = mysqlTable("regions", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  code: varchar("code", { length: 50 }).notNull().unique(),
});

// Sub-regions table (21 specific sub-regions)
export const subRegions = mysqlTable("sub_regions", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  regionId: int("region_id").notNull().references(() => regions.id),
});

// Solutions (Educação, Saúde)
export const solutions = mysqlTable("solutions", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  description: text("description"),
});

// Service Lines under solutions
export const serviceLines = mysqlTable("service_lines", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  solutionId: int("solution_id").notNull().references(() => solutions.id),
});

// Services under service lines
export const services = mysqlTable("services", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  serviceLineId: int("service_line_id").notNull().references(() => serviceLines.id),
});

// Strategic Indicators (7 indicators)
export const strategicIndicators = mysqlTable("strategic_indicators", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  description: text("description"),
  unit: varchar("unit", { length: 50 }),
});

// Objectives
export const objectives = mysqlTable("objectives", {
  id: int("id").primaryKey().autoincrement(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  ownerId: int("owner_id").notNull().references(() => users.id),
  regionId: int("region_id").references(() => regions.id),
  subRegionId: int("sub_region_id").references(() => subRegions.id),
  startDate: varchar("start_date", { length: 10 }).notNull(),
  endDate: varchar("end_date", { length: 10 }).notNull(),
  status: varchar("status", { length: 50 }).notNull().default("active"), // active, completed, cancelled, delayed
  progress: decimal("progress", { precision: 5, scale: 2 }).default("0"),
  period: varchar("period", { length: 50 }),
  serviceLineId: int("service_line_id"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});

// Key Results
export const keyResults = mysqlTable("key_results", {
  id: int("id").primaryKey().autoincrement(),
  objectiveId: int("objective_id").notNull().references(() => objectives.id),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  targetValue: decimal("target_value", { precision: 15, scale: 2 }).notNull(),
  currentValue: decimal("current_value", { precision: 15, scale: 2 }).default("0"),
  unit: varchar("unit", { length: 50 }),
  strategicIndicatorIds: json("strategicIndicatorIds").$type<number[]>().default([]), // Optional multiple strategic indicators
  serviceLineIds: json("serviceLineIds").$type<number[]>().default([]), // Optional multiple service lines
  serviceId: int("service_id").references(() => services.id),
  startDate: varchar("start_date", { length: 10 }).notNull(),
  endDate: varchar("end_date", { length: 10 }).notNull(),
  frequency: varchar("frequency", { length: 50 }).notNull(), // monthly, quarterly, weekly
  status: varchar("status", { length: 50 }).notNull().default("active"), // active, completed, cancelled, delayed
  progress: decimal("progress", { precision: 5, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});

// Actions
export const actions = mysqlTable("actions", {
  id: int("id").primaryKey().autoincrement(),
  keyResultId: int("key_result_id").notNull().references(() => keyResults.id),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  number: int("number").notNull(), // Auto-generated sequential number
  responsibleId: int("responsible_id").references(() => users.id),
  dueDate: varchar("due_date", { length: 10 }),
  status: varchar("status", { length: 50 }).notNull().default("pending"), // pending, in_progress, completed, cancelled
  priority: varchar("priority", { length: 50 }).notNull().default("medium"), // low, medium, high
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});

// Checkpoints (automatically generated based on KR frequency)
export const checkpoints = mysqlTable("checkpoints", {
  id: int("id").primaryKey().autoincrement(),
  keyResultId: int("key_result_id").notNull().references(() => keyResults.id),
  title: varchar("title", { length: 255 }).notNull(),
  targetValue: decimal("target_value", { precision: 15, scale: 2 }).notNull(),
  actualValue: decimal("actual_value", { precision: 15, scale: 2 }).default("0"),
  status: varchar("status", { length: 50 }).notNull().default("pending"), // pending, achieved, missed
  dueDate: varchar("due_date", { length: 10 }).notNull(),
  completedDate: varchar("completed_date", { length: 10 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});

// Action Comments
export const actionComments = mysqlTable("action_comments", {
  id: int("id").primaryKey().autoincrement(),
  actionId: int("action_id").notNull().references(() => actions.id),
  userId: int("user_id").notNull().references(() => users.id),
  comment: text("comment").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// Relations
export const usersRelations: any = relations(users, ({ many, one }) => ({
  objectives: many(objectives),
  keyResults: many(keyResults),
  actions: many(actions),
  checkpoints: many(checkpoints),
  actionComments: many(actionComments),
  gestor: one(users, {
    fields: [users.gestorId],
    references: [users.id],
    relationName: "gestor"
  }),
  subordinates: many(users, {
    relationName: "gestor"
  }),
  approver: one(users, {
    fields: [users.approvedBy],
    references: [users.id],
    relationName: "approver"
  }),
}));

export const regionsRelations = relations(regions, ({ many }) => ({
  subRegions: many(subRegions),
  objectives: many(objectives),
}));

export const subRegionsRelations = relations(subRegions, ({ one, many }) => ({
  region: one(regions, {
    fields: [subRegions.regionId],
    references: [regions.id],
  }),
  objectives: many(objectives),
}));

export const solutionsRelations = relations(solutions, ({ many }) => ({
  serviceLines: many(serviceLines),
}));

export const serviceLinesRelations = relations(serviceLines, ({ one, many }) => ({
  solution: one(solutions, {
    fields: [serviceLines.solutionId],
    references: [solutions.id],
  }),
  services: many(services),
  objectives: many(objectives),
  keyResults: many(keyResults),
}));

export const servicesRelations = relations(services, ({ one, many }) => ({
  serviceLine: one(serviceLines, {
    fields: [services.serviceLineId],
    references: [serviceLines.id],
  }),
  keyResults: many(keyResults),
}));

export const objectivesRelations = relations(objectives, ({ one, many }) => ({
  owner: one(users, {
    fields: [objectives.ownerId],
    references: [users.id],
  }),
  region: one(regions, {
    fields: [objectives.regionId],
    references: [regions.id],
  }),
  subRegion: one(subRegions, {
    fields: [objectives.subRegionId],
    references: [subRegions.id],
  }),
  serviceLine: one(serviceLines, {
    fields: [objectives.serviceLineId],
    references: [serviceLines.id],
  }),
  keyResults: many(keyResults),
}));

export const keyResultsRelations = relations(keyResults, ({ one, many }) => ({
  objective: one(objectives, {
    fields: [keyResults.objectiveId],
    references: [objectives.id],
  }),
  service: one(services, {
    fields: [keyResults.serviceId],
    references: [services.id],
  }),
  actions: many(actions),
  checkpoints: many(checkpoints),
}));

export const actionsRelations = relations(actions, ({ one, many }) => ({
  keyResult: one(keyResults, {
    fields: [actions.keyResultId],
    references: [keyResults.id],
  }),
  responsible: one(users, {
    fields: [actions.responsibleId],
    references: [users.id],
  }),
  comments: many(actionComments),
}));

export const checkpointsRelations = relations(checkpoints, ({ one }) => ({
  keyResult: one(keyResults, {
    fields: [checkpoints.keyResultId],
    references: [keyResults.id],
  }),
}));

export const actionCommentsRelations = relations(actionComments, ({ one }) => ({
  action: one(actions, {
    fields: [actionComments.actionId],
    references: [actions.id],
  }),
  user: one(users, {
    fields: [actionComments.userId],
    references: [users.id],
  }),
}));

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  approved: true,
  approvedAt: true,
  approvedBy: true,
});

export const insertObjectiveSchema = createInsertSchema(objectives).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  progress: true,
});

export const insertKeyResultSchema = createInsertSchema(keyResults).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  progress: true,
  currentValue: true,
}).extend({
  targetValue: z.string(),
  initialValue: z.string().optional().default("0"),
});

export const insertActionSchema = createInsertSchema(actions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  number: true,
});

export const insertCheckpointSchema = createInsertSchema(checkpoints).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertActionCommentSchema = createInsertSchema(actionComments).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Region = typeof regions.$inferSelect;
export type SubRegion = typeof subRegions.$inferSelect;
export type Solution = typeof solutions.$inferSelect;
export type ServiceLine = typeof serviceLines.$inferSelect;
export type Service = typeof services.$inferSelect;
export type StrategicIndicator = typeof strategicIndicators.$inferSelect;
export type Objective = typeof objectives.$inferSelect;
export type InsertObjective = z.infer<typeof insertObjectiveSchema>;
export type KeyResult = typeof keyResults.$inferSelect;
export type InsertKeyResult = z.infer<typeof insertKeyResultSchema>;
export type Action = typeof actions.$inferSelect;
export type InsertAction = z.infer<typeof insertActionSchema>;
export type Checkpoint = typeof checkpoints.$inferSelect;
export type InsertCheckpoint = z.infer<typeof insertCheckpointSchema>;
export type ActionComment = typeof actionComments.$inferSelect;
export type InsertActionComment = z.infer<typeof insertActionCommentSchema>;