import { sqliteTable, integer, text, real, blob } from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table with role-based access
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("operacional"), // admin, gestor, operacional
  regionIds: text("region_ids", { mode: "json" }).$type<number[]>().default([]), // Multiple regions
  subRegionIds: text("sub_region_ids", { mode: "json" }).$type<number[]>().default([]), // Multiple sub-regions
  solutionIds: text("solution_ids", { mode: "json" }).$type<number[]>().default([]), // Multiple solutions
  serviceLineIds: text("service_line_ids", { mode: "json" }).$type<number[]>().default([]), // Multiple service lines
  serviceIds: text("service_ids", { mode: "json" }).$type<number[]>().default([]), // Multiple services
  gestorId: integer("gestor_id").references(() => users.id), // Reference to manager
  approved: integer("approved", { mode: "boolean" }).notNull().default(false), // Approval status
  approvedAt: text("approved_at"), // When was approved
  approvedBy: integer("approved_by").references(() => users.id), // Who approved
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// Regions table (10 specific regions)
export const regions = sqliteTable("regions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  code: text("code").notNull().unique(),
});

// Sub-regions table (21 specific sub-regions)
export const subRegions = sqliteTable("sub_regions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  regionId: integer("region_id").notNull().references(() => regions.id),
});

// Solutions (Educação, Saúde)
export const solutions = sqliteTable("solutions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  description: text("description"),
});

// Service Lines under solutions
export const serviceLines = sqliteTable("service_lines", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  solutionId: integer("solution_id").notNull().references(() => solutions.id),
});

// Services under service lines
export const services = sqliteTable("services", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  serviceLineId: integer("service_line_id").notNull().references(() => serviceLines.id),
});

// Strategic Indicators (7 indicators)
export const strategicIndicators = sqliteTable("strategic_indicators", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  description: text("description"),
  unit: text("unit"),
});

// Objectives
export const objectives = sqliteTable("objectives", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description"),
  ownerId: integer("owner_id").notNull().references(() => users.id),
  regionId: integer("region_id").references(() => regions.id),
  subRegionId: integer("sub_region_id").references(() => subRegions.id),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  status: text("status").notNull().default("active"), // active, completed, cancelled, delayed
  progress: real("progress").default(0),
  period: text("period"),
  serviceLineId: integer("service_line_id"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Key Results
export const keyResults = sqliteTable("key_results", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  objectiveId: integer("objective_id").notNull().references(() => objectives.id),
  title: text("title").notNull(),
  description: text("description"),
  targetValue: real("target_value").notNull(),
  currentValue: real("current_value").default(0),
  unit: text("unit"),
  strategicIndicatorIds: text("strategic_indicator_ids").notNull(), // JSON string
  serviceLineId: integer("service_line_id").references(() => serviceLines.id),
  serviceId: integer("service_id").references(() => services.id),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  frequency: text("frequency").notNull(), // monthly, quarterly, weekly
  status: text("status").notNull().default("active"), // active, completed, cancelled, delayed
  progress: real("progress").default(0),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Actions
export const actions = sqliteTable("actions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  keyResultId: integer("key_result_id").notNull().references(() => keyResults.id),
  title: text("title").notNull(),
  description: text("description"),
  number: integer("number").notNull(), // Auto-generated sequential number
  strategicIndicatorId: integer("strategic_indicator_id").references(() => strategicIndicators.id),
  responsibleId: integer("responsible_id").references(() => users.id),
  dueDate: text("due_date"),
  status: text("status").notNull().default("pending"), // pending, in_progress, completed, cancelled
  priority: text("priority").notNull().default("medium"), // low, medium, high
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Checkpoints (automatically generated based on KR frequency)
export const checkpoints = sqliteTable("checkpoints", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  keyResultId: integer("key_result_id").notNull().references(() => keyResults.id),
  period: text("period").notNull(), // 2024-01, 2024-Q1, 2024-W01
  targetValue: real("target_value").notNull(),
  actualValue: real("actual_value").default(0),
  status: text("status").notNull().default("pending"), // pending, completed, delayed
  notes: text("notes"),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Define relationships
export const usersRelations = relations(users, ({ one, many }) => ({
  gestor: one(users, { fields: [users.gestorId], references: [users.id], relationName: "gestorRelation" }),
  subordinates: many(users, { relationName: "gestorRelation" }),
  approvedBy: one(users, { fields: [users.approvedBy], references: [users.id], relationName: "approvedByRelation" }),
  approvedUsers: many(users, { relationName: "approvedByRelation" }),
  objectives: many(objectives),
  responsibleActions: many(actions),
}));

export const regionsRelations = relations(regions, ({ many }) => ({
  subRegions: many(subRegions),
  objectives: many(objectives),
}));

export const subRegionsRelations = relations(subRegions, ({ one, many }) => ({
  region: one(regions, { fields: [subRegions.regionId], references: [regions.id] }),
  objectives: many(objectives),
}));

export const solutionsRelations = relations(solutions, ({ many }) => ({
  serviceLines: many(serviceLines),
}));

export const serviceLinesRelations = relations(serviceLines, ({ one, many }) => ({
  solution: one(solutions, { fields: [serviceLines.solutionId], references: [solutions.id] }),
  services: many(services),
  keyResults: many(keyResults),
}));

export const servicesRelations = relations(services, ({ one, many }) => ({
  serviceLine: one(serviceLines, { fields: [services.serviceLineId], references: [serviceLines.id] }),
  keyResults: many(keyResults),
}));

export const objectivesRelations = relations(objectives, ({ one, many }) => ({
  owner: one(users, { fields: [objectives.ownerId], references: [users.id] }),
  region: one(regions, { fields: [objectives.regionId], references: [regions.id] }),
  subRegion: one(subRegions, { fields: [objectives.subRegionId], references: [subRegions.id] }),
  keyResults: many(keyResults),
}));

export const keyResultsRelations = relations(keyResults, ({ one, many }) => ({
  objective: one(objectives, { fields: [keyResults.objectiveId], references: [objectives.id] }),
  serviceLine: one(serviceLines, { fields: [keyResults.serviceLineId], references: [serviceLines.id] }),
  service: one(services, { fields: [keyResults.serviceId], references: [services.id] }),
  actions: many(actions),
  checkpoints: many(checkpoints),
}));

export const actionsRelations = relations(actions, ({ one }) => ({
  keyResult: one(keyResults, { fields: [actions.keyResultId], references: [keyResults.id] }),
  strategicIndicator: one(strategicIndicators, { fields: [actions.strategicIndicatorId], references: [strategicIndicators.id] }),
  responsible: one(users, { fields: [actions.responsibleId], references: [users.id] }),
}));

export const checkpointsRelations = relations(checkpoints, ({ one }) => ({
  keyResult: one(keyResults, { fields: [checkpoints.keyResultId], references: [keyResults.id] }),
}));

// Insert schemas using drizzle-zod
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  approvedAt: true,
  approvedBy: true,
});

export const insertRegionSchema = createInsertSchema(regions).omit({
  id: true,
});

export const insertSubRegionSchema = createInsertSchema(subRegions).omit({
  id: true,
});

export const insertSolutionSchema = createInsertSchema(solutions).omit({
  id: true,
});

export const insertServiceLineSchema = createInsertSchema(serviceLines).omit({
  id: true,
});

export const insertServiceSchema = createInsertSchema(services).omit({
  id: true,
});

export const insertStrategicIndicatorSchema = createInsertSchema(strategicIndicators).omit({
  id: true,
});

export const insertObjectiveSchema = createInsertSchema(objectives).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  startDate: z.string(),
  endDate: z.string(),
});

export const insertKeyResultSchema = createInsertSchema(keyResults).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  startDate: z.string(),
  endDate: z.string(),
  strategicIndicatorIds: z.array(z.number()).min(1).transform(val => JSON.stringify(val)),
});

export const insertActionSchema = createInsertSchema(actions).omit({
  id: true,
  number: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  dueDate: z.string().optional(),
});

export const insertCheckpointSchema = createInsertSchema(checkpoints).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  checkDate: z.string(),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Region = typeof regions.$inferSelect;
export type InsertRegion = z.infer<typeof insertRegionSchema>;

export type SubRegion = typeof subRegions.$inferSelect;
export type InsertSubRegion = z.infer<typeof insertSubRegionSchema>;

export type Solution = typeof solutions.$inferSelect;
export type InsertSolution = z.infer<typeof insertSolutionSchema>;

export type ServiceLine = typeof serviceLines.$inferSelect;
export type InsertServiceLine = z.infer<typeof insertServiceLineSchema>;

export type Service = typeof services.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;

export type StrategicIndicator = typeof strategicIndicators.$inferSelect;
export type InsertStrategicIndicator = z.infer<typeof insertStrategicIndicatorSchema>;

export type Objective = typeof objectives.$inferSelect;
export type InsertObjective = z.infer<typeof insertObjectiveSchema>;

export type KeyResult = typeof keyResults.$inferSelect;
export type InsertKeyResult = z.infer<typeof insertKeyResultSchema>;

export type Action = typeof actions.$inferSelect;
export type InsertAction = z.infer<typeof insertActionSchema>;

export type Checkpoint = typeof checkpoints.$inferSelect;
export type InsertCheckpoint = z.infer<typeof insertCheckpointSchema>;