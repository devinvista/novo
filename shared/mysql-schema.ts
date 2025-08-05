import { mysqlTable, varchar, text, int, timestamp, decimal, json, boolean } from "drizzle-orm/mysql-core";
import { relations, sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table (mixed naming: camelCase JSON fields + snake_case date fields)
export const users = mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  role: varchar("role", { length: 50 }).notNull().default("operacional"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  regionIds: json("regionIds").default("[]"),
  subRegionIds: json("subRegionIds").default("[]"),
  solutionIds: json("solutionIds").default("[]"),
  serviceLineIds: json("serviceLineIds").default("[]"),
  serviceIds: json("serviceIds").default("[]"),
  gestorId: int("gestorId"),
  approved: boolean("approved").notNull().default(false),
  approvedAt: timestamp("approved_at"),
  approvedBy: int("approved_by"),
  // Duplicate fields for compatibility
  approvedAttimestamp: timestamp("approvedAt"),
  approvedByInt: int("approvedBy"),
});

// Regions table (10 specific regions)
export const regions = mysqlTable("regions", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
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

// Objectives table (snake_case fields)
export const objectives = mysqlTable("objectives", {
  id: int("id").primaryKey().autoincrement(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  ownerId: int("owner_id").notNull().references(() => users.id),
  regionId: int("region_id").references(() => regions.id),
  subRegionId: int("sub_region_id").references(() => subRegions.id),
  startDate: varchar("start_date", { length: 10 }).notNull(),
  endDate: varchar("end_date", { length: 10 }).notNull(),
  status: varchar("status", { length: 50 }).notNull().default("active"),
  progress: decimal("progress", { precision: 5, scale: 2 }).default("0.00"),
  period: varchar("period", { length: 50 }),
  serviceLineId: int("service_line_id").references(() => serviceLines.id),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});

// Key Results table (snake_case fields + JSON fields)
export const keyResults = mysqlTable("key_results", {
  id: int("id").primaryKey().autoincrement(),
  objectiveId: int("objective_id").notNull().references(() => objectives.id),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  targetValue: decimal("target_value", { precision: 15, scale: 2 }).notNull(),
  currentValue: decimal("current_value", { precision: 15, scale: 2 }).default("0.00"),
  unit: varchar("unit", { length: 50 }),
  strategicIndicatorIds: json("strategicIndicatorIds").default("[]"),
  serviceLineIds: json("serviceLineIds").default("[]"),
  serviceLineId: int("service_line_id").references(() => serviceLines.id),
  serviceId: int("service_id").references(() => services.id),
  startDate: varchar("start_date", { length: 10 }).notNull(),
  endDate: varchar("end_date", { length: 10 }).notNull(),
  frequency: varchar("frequency", { length: 50 }).notNull(),
  status: varchar("status", { length: 50 }).notNull().default("active"),
  progress: decimal("progress", { precision: 5, scale: 2 }).default("0.00"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});

// Actions table (snake_case fields based on MySQL structure)
export const actions = mysqlTable("actions", {
  id: int("id").primaryKey().autoincrement(),
  keyResultId: int("key_result_id").notNull().references(() => keyResults.id),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  number: int("number").notNull().default(1),
  strategicIndicatorId: int("strategic_indicator_id").references(() => strategicIndicators.id),
  responsibleId: int("responsible_id").references(() => users.id),
  dueDate: varchar("due_date", { length: 10 }),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  priority: varchar("priority", { length: 50 }).notNull().default("medium"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});

// Checkpoints table (snake_case fields based on MySQL structure)
export const checkpoints = mysqlTable("checkpoints", {
  id: int("id").primaryKey().autoincrement(),
  keyResultId: int("key_result_id").notNull().references(() => keyResults.id),
  title: varchar("title", { length: 255 }).notNull().default("Checkpoint"),
  period: varchar("period", { length: 50 }).notNull(),
  targetValue: decimal("target_value", { precision: 15, scale: 2 }).notNull(),
  actualValue: decimal("actual_value", { precision: 15, scale: 2 }),
  progress: decimal("progress", { precision: 5, scale: 2 }).default("0.00"),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  dueDate: timestamp("due_date"),
  completedDate: timestamp("completed_date"),
  notes: text("notes"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});

// Action Comments table (camelCase matching MySQL structure)
export const actionComments = mysqlTable("action_comments", {
  id: int("id").primaryKey().autoincrement(),
  actionId: int("actionId").notNull().references(() => actions.id),
  userId: int("userId").notNull().references(() => users.id),
  comment: text("comment").notNull(),
  createdAt: timestamp("createdAt").default(sql`CURRENT_TIMESTAMP`),
});

// Activity log for audit trail
export const activities = mysqlTable("activities", {
  id: int("id").primaryKey({ autoIncrement: true }),
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

export const actionsRelations = relations(actions, ({ one, many }) => ({
  keyResult: one(keyResults, { fields: [actions.keyResultId], references: [keyResults.id] }),
  strategicIndicator: one(strategicIndicators, { fields: [actions.strategicIndicatorId], references: [strategicIndicators.id] }),
  responsible: one(users, { fields: [actions.responsibleId], references: [users.id] }),
  actionComments: many(actionComments),
}));

export const checkpointsRelations = relations(checkpoints, ({ one }) => ({
  keyResult: one(keyResults, { fields: [checkpoints.keyResultId], references: [keyResults.id] }),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  user: one(users, { fields: [activities.userId], references: [users.id] }),
}));

export const actionCommentsRelations = relations(actionComments, ({ one }) => ({
  action: one(actions, { fields: [actionComments.actionId], references: [actions.id] }),
  user: one(users, { fields: [actionComments.userId], references: [users.id] }),
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
export type ActionComment = typeof actionComments.$inferSelect;
export type InsertActionComment = typeof actionComments.$inferInsert;

// Zod schemas
export const insertUserSchema = createInsertSchema(users);
export const insertObjectiveSchema = createInsertSchema(objectives);
export const insertKeyResultSchema = createInsertSchema(keyResults);
export const insertActionSchema = createInsertSchema(actions);
export const insertCheckpointSchema = createInsertSchema(checkpoints);
export const insertActionCommentSchema = createInsertSchema(actionComments);

// Export types for use in other modules
export type InsertUserType = z.infer<typeof insertUserSchema>;
export type InsertObjectiveType = z.infer<typeof insertObjectiveSchema>;
export type InsertKeyResultType = z.infer<typeof insertKeyResultSchema>;
export type InsertActionType = z.infer<typeof insertActionSchema>;
export type InsertCheckpointType = z.infer<typeof insertCheckpointSchema>;
export type InsertActionCommentType = z.infer<typeof insertActionCommentSchema>;