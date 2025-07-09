import { pgTable, text, serial, integer, boolean, timestamp, decimal, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table with role-based access
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("operacional"), // admin, gestor, operacional
  regionId: integer("region_id").references(() => regions.id),
  subRegionId: integer("sub_region_id").references(() => subRegions.id),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Regions table (10 specific regions)
export const regions = pgTable("regions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  code: text("code").notNull().unique(),
});

// Sub-regions table (21 specific sub-regions)
export const subRegions = pgTable("sub_regions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  regionId: integer("region_id").notNull().references(() => regions.id),
});

// Solutions (Educação, Saúde)
export const solutions = pgTable("solutions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Service lines
export const serviceLines = pgTable("service_lines", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  solutionId: integer("solution_id").notNull().references(() => solutions.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Services
export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  serviceLineId: integer("service_line_id").notNull().references(() => serviceLines.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Strategic indicators (7 predefined)
export const strategicIndicators = pgTable("strategic_indicators", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  unit: text("unit"), // %, units, currency, etc.
  active: boolean("active").notNull().default(true),
});

// Objectives
export const objectives = pgTable("objectives", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  ownerId: integer("owner_id").notNull().references(() => users.id),
  regionId: integer("region_id").references(() => regions.id),
  subRegionId: integer("sub_region_id").references(() => subRegions.id),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  status: text("status").notNull().default("active"), // active, completed, cancelled
  progress: decimal("progress", { precision: 5, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Key Results
export const keyResults = pgTable("key_results", {
  id: serial("id").primaryKey(),
  objectiveId: integer("objective_id").notNull().references(() => objectives.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  number: integer("number").notNull(), // Auto-generated sequential number
  strategicIndicatorIds: integer("strategic_indicator_ids").array(),
  serviceLineId: integer("service_line_id").references(() => serviceLines.id),
  serviceId: integer("service_id").references(() => services.id),
  initialValue: decimal("initial_value", { precision: 15, scale: 2 }).notNull(),
  targetValue: decimal("target_value", { precision: 15, scale: 2 }).notNull(),
  currentValue: decimal("current_value", { precision: 15, scale: 2 }).default("0"),
  unit: text("unit"),
  frequency: text("frequency").notNull(), // monthly, quarterly, weekly
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  progress: decimal("progress", { precision: 5, scale: 2 }).default("0"),
  status: text("status").notNull().default("active"), // active, completed, cancelled, delayed
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Actions
export const actions = pgTable("actions", {
  id: serial("id").primaryKey(),
  keyResultId: integer("key_result_id").notNull().references(() => keyResults.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  number: integer("number").notNull(), // Auto-generated sequential number
  strategicIndicatorId: integer("strategic_indicator_id").references(() => strategicIndicators.id),
  responsibleId: integer("responsible_id").references(() => users.id),
  dueDate: timestamp("due_date"),
  status: text("status").notNull().default("pending"), // pending, in_progress, completed, cancelled
  priority: text("priority").notNull().default("medium"), // low, medium, high
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Checkpoints (automatically generated based on KR frequency)
export const checkpoints = pgTable("checkpoints", {
  id: serial("id").primaryKey(),
  keyResultId: integer("key_result_id").notNull().references(() => keyResults.id, { onDelete: "cascade" }),
  period: text("period").notNull(), // 2024-01, 2024-Q1, 2024-W01
  targetValue: decimal("target_value", { precision: 15, scale: 2 }).notNull(),
  actualValue: decimal("actual_value", { precision: 15, scale: 2 }),
  progress: decimal("progress", { precision: 5, scale: 2 }).default("0"),
  status: text("status").notNull().default("pendente"), // pendente, no_prazo, em_risco, atrasado, concluido
  notes: text("notes"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Activity log for audit trail
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  entityType: text("entity_type").notNull(), // objective, key_result, action, checkpoint
  entityId: integer("entity_id").notNull(),
  action: text("action").notNull(), // created, updated, deleted, completed
  description: text("description").notNull(),
  oldValues: jsonb("old_values"),
  newValues: jsonb("new_values"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  region: one(regions, { fields: [users.regionId], references: [regions.id] }),
  subRegion: one(subRegions, { fields: [users.subRegionId], references: [subRegions.id] }),
  objectives: many(objectives),
  actions: many(actions),
  activities: many(activities),
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

export const activitiesRelations = relations(activities, ({ one }) => ({
  user: one(users, { fields: [activities.userId], references: [users.id] }),
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

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertObjectiveSchema = createInsertSchema(objectives).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  startDate: z.string().transform((val) => new Date(val)),
  endDate: z.string().transform((val) => new Date(val)),
});

export const insertKeyResultSchema = z.object({
  objectiveId: z.number(),
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().optional(),
  strategicIndicatorId: z.number().optional(), // For backward compatibility
  strategicIndicatorIds: z.array(z.number()).default([]),
  initialValue: z.string(),
  targetValue: z.string(),
  currentValue: z.string(),
  unit: z.string().nullable().optional(),
  frequency: z.enum(["daily", "weekly", "monthly", "quarterly"]),
  startDate: z.string().transform((val) => new Date(val)),
  endDate: z.string().transform((val) => new Date(val)),
  progress: z.string().optional(),
  status: z.enum(["pending", "active", "completed", "delayed", "cancelled"]).optional(),
});

export const insertActionSchema = createInsertSchema(actions).omit({
  id: true,
  number: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  dueDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  status: z.string().optional().default("pending"),
  priority: z.string().optional().default("medium"),
  responsibleId: z.number().optional().nullable(),
  strategicIndicatorId: z.number().optional().nullable(),
});

export const insertCheckpointSchema = createInsertSchema(checkpoints).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Region = typeof regions.$inferSelect;
export type SubRegion = typeof subRegions.$inferSelect;
export type ServiceLine = typeof serviceLines.$inferSelect;
export type StrategicIndicator = typeof strategicIndicators.$inferSelect;
export type Objective = typeof objectives.$inferSelect;
export type InsertObjective = z.infer<typeof insertObjectiveSchema>;
export type KeyResult = typeof keyResults.$inferSelect;
export type InsertKeyResult = z.infer<typeof insertKeyResultSchema>;
export type Action = typeof actions.$inferSelect;
export type InsertAction = z.infer<typeof insertActionSchema>;
export type Checkpoint = typeof checkpoints.$inferSelect;
export type InsertCheckpoint = z.infer<typeof insertCheckpointSchema>;
export type Activity = typeof activities.$inferSelect;
export type Solution = typeof solutions.$inferSelect;
export type Service = typeof services.$inferSelect;