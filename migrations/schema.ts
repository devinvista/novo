import { pgTable, foreignKey, serial, integer, text, jsonb, timestamp, numeric, unique, boolean } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const activities = pgTable("activities", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	entityType: text("entity_type").notNull(),
	entityId: integer("entity_id").notNull(),
	action: text().notNull(),
	description: text().notNull(),
	oldValues: jsonb("old_values"),
	newValues: jsonb("new_values"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "activities_user_id_users_id_fk"
		}),
]);

export const checkpoints = pgTable("checkpoints", {
	id: serial().primaryKey().notNull(),
	keyResultId: integer("key_result_id").notNull(),
	period: text().notNull(),
	targetValue: numeric("target_value", { precision: 15, scale:  2 }).notNull(),
	actualValue: numeric("actual_value", { precision: 15, scale:  2 }),
	progress: numeric({ precision: 5, scale:  2 }).default('0'),
	status: text().default('pending').notNull(),
	notes: text(),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.keyResultId],
			foreignColumns: [keyResults.id],
			name: "checkpoints_key_result_id_key_results_id_fk"
		}).onDelete("cascade"),
]);

export const objectives = pgTable("objectives", {
	id: serial().primaryKey().notNull(),
	title: text().notNull(),
	description: text(),
	ownerId: integer("owner_id").notNull(),
	regionId: integer("region_id"),
	subRegionId: integer("sub_region_id"),
	startDate: timestamp("start_date", { mode: 'string' }).notNull(),
	endDate: timestamp("end_date", { mode: 'string' }).notNull(),
	status: text().default('active').notNull(),
	progress: numeric({ precision: 5, scale:  2 }).default('0'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.ownerId],
			foreignColumns: [users.id],
			name: "objectives_owner_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.regionId],
			foreignColumns: [regions.id],
			name: "objectives_region_id_regions_id_fk"
		}),
	foreignKey({
			columns: [table.subRegionId],
			foreignColumns: [subRegions.id],
			name: "objectives_sub_region_id_sub_regions_id_fk"
		}),
]);

export const serviceLines = pgTable("service_lines", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	solutionId: integer("solution_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.solutionId],
			foreignColumns: [solutions.id],
			name: "service_lines_solution_id_solutions_id_fk"
		}),
]);

export const services = pgTable("services", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	serviceLineId: integer("service_line_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.serviceLineId],
			foreignColumns: [serviceLines.id],
			name: "services_service_line_id_service_lines_id_fk"
		}),
]);

export const keyResults = pgTable("key_results", {
	id: serial().primaryKey().notNull(),
	objectiveId: integer("objective_id").notNull(),
	title: text().notNull(),
	description: text(),
	number: integer().notNull(),
	serviceLineId: integer("service_line_id"),
	serviceId: integer("service_id"),
	initialValue: numeric("initial_value", { precision: 15, scale:  2 }).notNull(),
	targetValue: numeric("target_value", { precision: 15, scale:  2 }).notNull(),
	currentValue: numeric("current_value", { precision: 15, scale:  2 }).default('0'),
	unit: text(),
	frequency: text().notNull(),
	startDate: timestamp("start_date", { mode: 'string' }).notNull(),
	endDate: timestamp("end_date", { mode: 'string' }).notNull(),
	progress: numeric({ precision: 5, scale:  2 }).default('0'),
	status: text().default('active').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	strategicIndicatorIds: integer("strategic_indicator_ids").array(),
}, (table) => [
	foreignKey({
			columns: [table.objectiveId],
			foreignColumns: [objectives.id],
			name: "key_results_objective_id_objectives_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.serviceLineId],
			foreignColumns: [serviceLines.id],
			name: "key_results_service_line_id_service_lines_id_fk"
		}),
	foreignKey({
			columns: [table.serviceId],
			foreignColumns: [services.id],
			name: "key_results_service_id_services_id_fk"
		}),
]);

export const regions = pgTable("regions", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	code: text().notNull(),
}, (table) => [
	unique("regions_name_unique").on(table.name),
	unique("regions_code_unique").on(table.code),
]);

export const subRegions = pgTable("sub_regions", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	code: text().notNull(),
	regionId: integer("region_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.regionId],
			foreignColumns: [regions.id],
			name: "sub_regions_region_id_regions_id_fk"
		}),
	unique("sub_regions_code_unique").on(table.code),
]);

export const solutions = pgTable("solutions", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("solutions_name_unique").on(table.name),
]);

export const actions = pgTable("actions", {
	id: serial().primaryKey().notNull(),
	keyResultId: integer("key_result_id").notNull(),
	title: text().notNull(),
	description: text(),
	number: integer().notNull(),
	strategicIndicatorId: integer("strategic_indicator_id"),
	responsibleId: integer("responsible_id"),
	dueDate: timestamp("due_date", { mode: 'string' }),
	status: text().default('pending').notNull(),
	priority: text().default('medium').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.keyResultId],
			foreignColumns: [keyResults.id],
			name: "actions_key_result_id_key_results_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.strategicIndicatorId],
			foreignColumns: [strategicIndicators.id],
			name: "actions_strategic_indicator_id_strategic_indicators_id_fk"
		}),
	foreignKey({
			columns: [table.responsibleId],
			foreignColumns: [users.id],
			name: "actions_responsible_id_users_id_fk"
		}),
]);

export const strategicIndicators = pgTable("strategic_indicators", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	unit: text(),
	active: boolean().default(true).notNull(),
}, (table) => [
	unique("strategic_indicators_name_unique").on(table.name),
]);

export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	username: text().notNull(),
	password: text().notNull(),
	name: text().notNull(),
	email: text().notNull(),
	role: text().default('operacional').notNull(),
	regionId: integer("region_id"),
	subRegionId: integer("sub_region_id"),
	active: boolean().default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.regionId],
			foreignColumns: [regions.id],
			name: "users_region_id_regions_id_fk"
		}),
	foreignKey({
			columns: [table.subRegionId],
			foreignColumns: [subRegions.id],
			name: "users_sub_region_id_sub_regions_id_fk"
		}),
	unique("users_username_unique").on(table.username),
	unique("users_email_unique").on(table.email),
]);
