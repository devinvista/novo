import { pgTable, serial, varchar, text, decimal, timestamp, json, boolean, integer } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table with role-based access
export const users: ReturnType<typeof pgTable> = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  role: varchar("role", { length: 50 }).notNull().default("operacional"), // admin, gestor, operacional
  regionId: integer("region_id"),
  subRegionId: integer("sub_region_id"),
  gestorId: integer("gestor_id").references((): any => users.id), // Reference to manager
  approved: boolean("approved").notNull().default(false), // Approval status
  approvedAt: timestamp("approved_at"), // When was approved
  approvedBy: integer("approved_by").references((): any => users.id), // Who approved
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// Regions table (10 specific regions)
export const regions = pgTable("regions", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  code: varchar("code", { length: 50 }).notNull().unique(),
});

// Sub-regions table (21 specific sub-regions)
export const subRegions = pgTable("sub_regions", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  regionId: integer("region_id").notNull().references(() => regions.id),
});

// Solutions (Educação, Saúde)
export const solutions = pgTable("solutions", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  description: text("description"),
});

// Service Lines under solutions
export const serviceLines = pgTable("service_lines", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  solutionId: integer("solution_id").notNull().references(() => solutions.id),
});

// Services under service lines
export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  serviceLineId: integer("service_line_id").notNull().references(() => serviceLines.id),
});

// Strategic Indicators (7 indicators)
export const strategicIndicators = pgTable("strategic_indicators", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  description: text("description"),
  unit: varchar("unit", { length: 50 }),
});

// Objectives
export const objectives = pgTable("objectives", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  ownerId: integer("owner_id").notNull().references(() => users.id),
  regionId: integer("region_id").references(() => regions.id),
  subRegionId: integer("sub_region_id").references(() => subRegions.id),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("active"), // active, completed, cancelled, delayed
  progress: decimal("progress", { precision: 5, scale: 2 }).default("0"),
  period: varchar("period", { length: 50 }),
  serviceLineId: integer("service_line_id"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Key Results
export const keyResults = pgTable("key_results", {
  id: serial("id").primaryKey(),
  objectiveId: integer("objective_id").notNull().references(() => objectives.id),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  targetValue: decimal("target_value", { precision: 15, scale: 2 }).notNull(),
  currentValue: decimal("current_value", { precision: 15, scale: 2 }).default("0"),
  unit: varchar("unit", { length: 50 }),
  strategicIndicatorIds: json("strategic_indicator_ids").notNull().$type<number[]>(), // Array of indicator IDs
  serviceLineId: integer("service_line_id").references(() => serviceLines.id),
  serviceId: integer("service_id").references(() => services.id),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  frequency: varchar("frequency", { length: 50 }).notNull(), // monthly, quarterly, weekly
  status: varchar("status", { length: 50 }).notNull().default("active"), // active, completed, cancelled, delayed
  progress: decimal("progress", { precision: 5, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Actions
export const actions = pgTable("actions", {
  id: serial("id").primaryKey(),
  keyResultId: integer("key_result_id").notNull().references(() => keyResults.id),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  number: integer("number").notNull(), // Auto-generated sequential number
  strategicIndicatorId: integer("strategic_indicator_id").references(() => strategicIndicators.id),
  responsibleId: integer("responsible_id").references(() => users.id),
  dueDate: timestamp("due_date"),
  status: varchar("status", { length: 50 }).notNull().default("pending"), // pending, in_progress, completed, cancelled
  priority: varchar("priority", { length: 50 }).notNull().default("medium"), // low, medium, high
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Checkpoints (automatically generated based on KR frequency)
export const checkpoints = pgTable("checkpoints", {
  id: serial("id").primaryKey(),
  keyResultId: integer("key_result_id").notNull().references(() => keyResults.id),
  period: varchar("period", { length: 50 }).notNull(), // 2024-01, 2024-Q1, 2024-W01
  targetValue: decimal("target_value", { precision: 15, scale: 2 }).notNull(),
  actualValue: decimal("actual_value", { precision: 15, scale: 2 }).default("0"),
  status: varchar("status", { length: 50 }).notNull().default("pending"), // pending, completed, delayed
  notes: text("notes"),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Define relationships
export const usersRelations = relations(users, ({ one, many }) => ({
  region: one(regions, { fields: [users.regionId], references: [regions.id] }),
  subRegion: one(subRegions, { fields: [users.subRegionId], references: [subRegions.id] }),
  gestor: one(users, { fields: [users.gestorId], references: [users.id], relationName: "gestorRelation" }),
  subordinates: many(users, { relationName: "gestorRelation" }),
  approvedBy: one(users, { fields: [users.approvedBy], references: [users.id], relationName: "approvedByRelation" }),
  approvedUsers: many(users, { relationName: "approvedByRelation" }),
  objectives: many(objectives),
  responsibleActions: many(actions),
}));

export const regionsRelations = relations(regions, ({ many }) => ({
  subRegions: many(subRegions),
  users: many(users),
  objectives: many(objectives),
}));

export const subRegionsRelations = relations(subRegions, ({ one, many }) => ({
  region: one(regions, { fields: [subRegions.regionId], references: [regions.id] }),
  users: many(users),
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

export const strategicIndicatorsRelations = relations(strategicIndicators, ({ many }) => ({
  actions: many(actions),
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

// Export types for the entities
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Region = typeof regions.$inferSelect;
export type SubRegion = typeof subRegions.$inferSelect;
export type Solution = typeof solutions.$inferSelect;
export type ServiceLine = typeof serviceLines.$inferSelect;
export type Service = typeof services.$inferSelect;
export type StrategicIndicator = typeof strategicIndicators.$inferSelect;
export type Objective = typeof objectives.$inferSelect;
export type InsertObjective = typeof objectives.$inferInsert;
export type KeyResult = typeof keyResults.$inferSelect;
export type InsertKeyResult = typeof keyResults.$inferInsert;
export type Action = typeof actions.$inferSelect;
export type InsertAction = typeof actions.$inferInsert;
export type Checkpoint = typeof checkpoints.$inferSelect;
export type InsertCheckpoint = typeof checkpoints.$inferInsert;

// Validation schemas using drizzle-zod
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertObjectiveSchema = createInsertSchema(objectives).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  progress: true,
}).extend({
  startDate: z.string().transform((val) => new Date(val)),
  endDate: z.string().transform((val) => new Date(val)),
});

export const insertKeyResultSchema = createInsertSchema(keyResults).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  currentValue: true,
  progress: true,
}).extend({
  startDate: z.string().transform((val) => new Date(val)),
  endDate: z.string().transform((val) => new Date(val)),
  targetValue: z.number().or(z.string().transform((val) => parseFloat(val))),
  strategicIndicatorIds: z.array(z.number()).min(1, "At least one strategic indicator must be selected"),
});

export const insertActionSchema = createInsertSchema(actions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  number: true,
}).extend({
  dueDate: z.string().optional().nullable().transform((val) => val ? new Date(val) : null),
});

export const insertCheckpointSchema = createInsertSchema(checkpoints).omit({
  id: true,
  updatedAt: true,
}).extend({
  targetValue: z.number().or(z.string().transform((val) => parseFloat(val))),
  actualValue: z.number().or(z.string().transform((val) => parseFloat(val))),
});

export type InsertUserType = z.infer<typeof insertUserSchema>;
export type InsertObjectiveType = z.infer<typeof insertObjectiveSchema>;
export type InsertKeyResultType = z.infer<typeof insertKeyResultSchema>;
export type InsertActionType = z.infer<typeof insertActionSchema>;
export type InsertCheckpointType = z.infer<typeof insertCheckpointSchema>;