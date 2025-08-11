import { mysqlTable, varchar, text, int, timestamp, decimal, json, boolean } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
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

// Objectives table (snake_case fields)
export const objectives = mysqlTable("objectives", {
  id: int("id").primaryKey().autoincrement(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  ownerId: int("owner_id").notNull().references(() => users.id),
  regionId: int("region_id").references(() => regions.id),
  subRegionIds: json("sub_region_ids").default("[]"),
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
  serviceLineId: int("service_line_id").references(() => serviceLines.id),
  serviceId: int("service_id").references(() => services.id),
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

// Reference Data Tables
export const regions = mysqlTable("regions", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).notNull().unique(),
});

export const subRegions = mysqlTable("sub_regions", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  regionId: int("region_id").notNull().references(() => regions.id),
});

export const solutions = mysqlTable("solutions", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
});

export const serviceLines = mysqlTable("service_lines", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  solutionId: int("solution_id").notNull().references(() => solutions.id),
});

export const services = mysqlTable("services", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  serviceLineId: int("service_line_id").notNull().references(() => serviceLines.id),
});

export const strategicIndicators = mysqlTable("strategic_indicators", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
});

export const activities = mysqlTable("activities", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("userId").references(() => users.id),
  action: varchar("action", { length: 255 }).notNull(),
  entityType: varchar("entityType", { length: 50 }).notNull(),
  entityId: int("entityId").notNull(),
  details: text("details"),
  createdAt: timestamp("createdAt").default(sql`CURRENT_TIMESTAMP`),
});

export const sessions = mysqlTable("sessions", {
  sessionId: varchar("session_id", { length: 128 }).primaryKey(),
  userId: int("user_id").references(() => users.id),
  expires: timestamp("expires").notNull(),
  data: text("data"),
});

export const quarterlyPeriods = mysqlTable("quarterly_periods", {
  id: int("id").primaryKey().autoincrement(),
  period: varchar("period", { length: 10 }).notNull().unique(),
  year: int("year").notNull(),
  quarter: int("quarter").notNull(),
  startDate: varchar("startDate", { length: 10 }).notNull(),
  endDate: varchar("endDate", { length: 10 }).notNull(),
});

// Types
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

// Zod schemas
export const insertUserSchema = createInsertSchema(users);
export const insertObjectiveSchema = createInsertSchema(objectives);
export const insertKeyResultSchema = createInsertSchema(keyResults);
export const insertActionSchema = createInsertSchema(actions);
export const insertCheckpointSchema = createInsertSchema(checkpoints);
export const insertActionCommentSchema = createInsertSchema(actionComments);

// Form schemas
export const userFormSchema = insertUserSchema.omit({ 
  id: true, 
  createdAt: true, 
  approvedAt: true, 
  approvedBy: true,
  approvedAttimestamp: true,
  approvedByInt: true
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

// Additional schemas for configuration management
export const solutionSchema = createInsertSchema(solutions).omit({ id: true });
export const serviceLineSchema = createInsertSchema(serviceLines).omit({ id: true });
export const serviceSchema = createInsertSchema(services).omit({ id: true });
export const strategicIndicatorSchema = createInsertSchema(strategicIndicators).omit({ id: true });

// Export types for use in other modules
export type InsertUserType = z.infer<typeof insertUserSchema>;
export type InsertObjectiveType = z.infer<typeof insertObjectiveSchema>;
export type InsertKeyResultType = z.infer<typeof insertKeyResultSchema>;
export type InsertActionType = z.infer<typeof insertActionSchema>;
export type InsertCheckpointType = z.infer<typeof insertCheckpointSchema>;
export type InsertActionCommentType = z.infer<typeof insertActionCommentSchema>;