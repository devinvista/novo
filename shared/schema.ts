import { mysqlTable, int, varchar, text, decimal, timestamp, json, boolean } from "drizzle-orm/mysql-core";
import { relations, sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table with role-based access
export const users = mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  role: varchar("role", { length: 50 }).notNull().default("operacional"), // admin, gestor, operacional
  regionId: int("region_id"),
  subRegionId: int("sub_region_id"),
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
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
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
  strategicIndicatorIds: json("strategic_indicator_ids").notNull(),
  serviceLineId: int("service_line_id").references(() => serviceLines.id),
  serviceId: int("service_id").references(() => services.id),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
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
  strategicIndicatorId: int("strategic_indicator_id").references(() => strategicIndicators.id),
  responsibleId: int("responsible_id").references(() => users.id),
  dueDate: timestamp("due_date"),
  status: varchar("status", { length: 50 }).notNull().default("pending"), // pending, in_progress, completed, cancelled
  priority: varchar("priority", { length: 50 }).notNull().default("medium"), // low, medium, high
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});

// Checkpoints (automatically generated based on KR frequency)
export const checkpoints = mysqlTable("checkpoints", {
  id: int("id").primaryKey().autoincrement(),
  keyResultId: int("key_result_id").notNull().references(() => keyResults.id),
  period: varchar("period", { length: 50 }).notNull(), // 2024-01, 2024-Q1, 2024-W01
  targetValue: decimal("target_value", { precision: 15, scale: 2 }).notNull(),
  actualValue: decimal("actual_value", { precision: 15, scale: 2 }),
  progress: decimal("progress", { precision: 5, scale: 2 }).default("0"),
  status: varchar("status", { length: 50 }).notNull().default("pending"), // pending, completed
  notes: text("notes"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});

// Activity log for audit trail
export const activities = mysqlTable("activities", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").notNull().references(() => users.id),
  entityType: varchar("entity_type", { length: 50 }).notNull(), // objective, key_result, action, checkpoint
  entityId: int("entity_id").notNull(),
  action: varchar("action", { length: 50 }).notNull(), // created, updated, deleted, completed
  description: text("description").notNull(),
  oldValues: json("old_values"), // JSON string
  newValues: json("new_values"), // JSON string
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  region: one(regions, { fields: [users.regionId], references: [regions.id] }),
  subRegion: one(subRegions, { fields: [users.subRegionId], references: [subRegions.id] }),
  objectives: many(objectives),
  activities: many(activities),
  actions: many(actions),
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

export const activitiesRelations = relations(activities, ({ one }) => ({
  user: one(users, { fields: [activities.userId], references: [users.id] }),
}));

// Type definitions
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
export type Activity = typeof activities.$inferSelect;

// Zod schemas
export const insertUserSchema = createInsertSchema(users);
export const insertObjectiveSchema = createInsertSchema(objectives).extend({
  startDate: z.string().or(z.date()),
  endDate: z.string().or(z.date()),
  progress: z.string().or(z.number()).transform(val => String(val)),
});
export const insertKeyResultSchema = createInsertSchema(keyResults).extend({
  startDate: z.string().or(z.date()),
  endDate: z.string().or(z.date()),
  progress: z.string().or(z.number()).transform(val => String(val)),
  targetValue: z.string().or(z.number()).transform(val => Number(val)),
  currentValue: z.string().or(z.number()).transform(val => Number(val)),
  strategicIndicatorIds: z.array(z.number()),
});
export const insertActionSchema = createInsertSchema(actions).extend({
  dueDate: z.string().or(z.date()).optional(),
}).omit({ number: true });
export const insertCheckpointSchema = createInsertSchema(checkpoints).extend({
  completedAt: z.string().or(z.date()).optional(),
  targetValue: z.string().or(z.number()).transform(val => Number(val)),
  actualValue: z.string().or(z.number()).optional().transform(val => val ? Number(val) : null),
  progress: z.string().or(z.number()).transform(val => Number(val)),
});

// Export types for use in other modules
export type InsertUserType = z.infer<typeof insertUserSchema>;
export type InsertObjectiveType = z.infer<typeof insertObjectiveSchema>;
export type InsertKeyResultType = z.infer<typeof insertKeyResultSchema>;
export type InsertActionType = z.infer<typeof insertActionSchema>;
export type InsertCheckpointType = z.infer<typeof insertCheckpointSchema>;