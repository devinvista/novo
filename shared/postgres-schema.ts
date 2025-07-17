import { pgTable, serial, varchar, text, decimal, timestamp, json, boolean, integer } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table with role-based access
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  role: varchar("role", { length: 50 }).notNull().default("operacional"), // admin, gestor, operacional
  regionId: integer("region_id"),
  subRegionId: integer("sub_region_id"),
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
  strategicIndicatorIds: json("strategic_indicator_ids").notNull(),
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
  actualValue: decimal("actual_value", { precision: 15, scale: 2 }),
  status: varchar("status", { length: 50 }).notNull().default("pending"), // pending, completed, delayed
  checkDate: timestamp("check_date").notNull(),
  comments: text("comments"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Define relationships
export const usersRelations = relations(users, ({ one, many }) => ({
  region: one(regions, { fields: [users.regionId], references: [regions.id] }),
  subRegion: one(subRegions, { fields: [users.subRegionId], references: [subRegions.id] }),
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
  startDate: z.string().transform((val) => new Date(val)),
  endDate: z.string().transform((val) => new Date(val)),
});

export const insertKeyResultSchema = createInsertSchema(keyResults).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  startDate: z.string().transform((val) => new Date(val)),
  endDate: z.string().transform((val) => new Date(val)),
  strategicIndicatorIds: z.array(z.number()).min(1),
});

export const insertActionSchema = createInsertSchema(actions).omit({
  id: true,
  number: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  dueDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
});

export const insertCheckpointSchema = createInsertSchema(checkpoints).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  checkDate: z.string().transform((val) => new Date(val)),
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