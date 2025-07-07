import { relations } from "drizzle-orm/relations";
import { users, activities, keyResults, checkpoints, objectives, regions, subRegions, solutions, serviceLines, services, actions, strategicIndicators } from "./schema";

export const activitiesRelations = relations(activities, ({one}) => ({
	user: one(users, {
		fields: [activities.userId],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({one, many}) => ({
	activities: many(activities),
	objectives: many(objectives),
	actions: many(actions),
	region: one(regions, {
		fields: [users.regionId],
		references: [regions.id]
	}),
	subRegion: one(subRegions, {
		fields: [users.subRegionId],
		references: [subRegions.id]
	}),
}));

export const checkpointsRelations = relations(checkpoints, ({one}) => ({
	keyResult: one(keyResults, {
		fields: [checkpoints.keyResultId],
		references: [keyResults.id]
	}),
}));

export const keyResultsRelations = relations(keyResults, ({one, many}) => ({
	checkpoints: many(checkpoints),
	objective: one(objectives, {
		fields: [keyResults.objectiveId],
		references: [objectives.id]
	}),
	serviceLine: one(serviceLines, {
		fields: [keyResults.serviceLineId],
		references: [serviceLines.id]
	}),
	service: one(services, {
		fields: [keyResults.serviceId],
		references: [services.id]
	}),
	actions: many(actions),
}));

export const objectivesRelations = relations(objectives, ({one, many}) => ({
	user: one(users, {
		fields: [objectives.ownerId],
		references: [users.id]
	}),
	region: one(regions, {
		fields: [objectives.regionId],
		references: [regions.id]
	}),
	subRegion: one(subRegions, {
		fields: [objectives.subRegionId],
		references: [subRegions.id]
	}),
	keyResults: many(keyResults),
}));

export const regionsRelations = relations(regions, ({many}) => ({
	objectives: many(objectives),
	subRegions: many(subRegions),
	users: many(users),
}));

export const subRegionsRelations = relations(subRegions, ({one, many}) => ({
	objectives: many(objectives),
	region: one(regions, {
		fields: [subRegions.regionId],
		references: [regions.id]
	}),
	users: many(users),
}));

export const serviceLinesRelations = relations(serviceLines, ({one, many}) => ({
	solution: one(solutions, {
		fields: [serviceLines.solutionId],
		references: [solutions.id]
	}),
	services: many(services),
	keyResults: many(keyResults),
}));

export const solutionsRelations = relations(solutions, ({many}) => ({
	serviceLines: many(serviceLines),
}));

export const servicesRelations = relations(services, ({one, many}) => ({
	serviceLine: one(serviceLines, {
		fields: [services.serviceLineId],
		references: [serviceLines.id]
	}),
	keyResults: many(keyResults),
}));

export const actionsRelations = relations(actions, ({one}) => ({
	keyResult: one(keyResults, {
		fields: [actions.keyResultId],
		references: [keyResults.id]
	}),
	strategicIndicator: one(strategicIndicators, {
		fields: [actions.strategicIndicatorId],
		references: [strategicIndicators.id]
	}),
	user: one(users, {
		fields: [actions.responsibleId],
		references: [users.id]
	}),
}));

export const strategicIndicatorsRelations = relations(strategicIndicators, ({many}) => ({
	actions: many(actions),
}));