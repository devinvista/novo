import {
  users, objectives, actions, actionComments,
  type User, type InsertUser,
} from '@shared/schema';
import { db } from '../pg-db';
import { eq, asc, desc } from 'drizzle-orm';

function parseUserJsonFields(user: any): User {
  return {
    ...user,
    regionIds: Array.isArray(user.regionIds) ? user.regionIds : (user.regionIds ? (typeof user.regionIds === 'string' ? JSON.parse(user.regionIds) : user.regionIds) : []),
    subRegionIds: Array.isArray(user.subRegionIds) ? user.subRegionIds : (user.subRegionIds ? (typeof user.subRegionIds === 'string' ? JSON.parse(user.subRegionIds) : user.subRegionIds) : []),
    solutionIds: Array.isArray(user.solutionIds) ? user.solutionIds : (user.solutionIds ? (typeof user.solutionIds === 'string' ? JSON.parse(user.solutionIds) : user.solutionIds) : []),
    serviceLineIds: Array.isArray(user.serviceLineIds) ? user.serviceLineIds : (user.serviceLineIds ? (typeof user.serviceLineIds === 'string' ? JSON.parse(user.serviceLineIds) : user.serviceLineIds) : []),
    serviceIds: Array.isArray(user.serviceIds) ? user.serviceIds : (user.serviceIds ? (typeof user.serviceIds === 'string' ? JSON.parse(user.serviceIds) : user.serviceIds) : []),
  };
}

export class UserRepo {
  async getUser(id: number): Promise<User | undefined> {
    const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return rows.length > 0 ? parseUserJsonFields(rows[0]) : undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const rows = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return rows.length > 0 ? parseUserJsonFields(rows[0]) : undefined;
  }

  async getUsers(): Promise<User[]> {
    const rows = await db.select().from(users).orderBy(desc(users.createdAt));
    return rows.map(parseUserJsonFields);
  }

  async getManagers(): Promise<User[]> {
    const rows = await db.select().from(users).where(eq(users.role, 'gestor')).orderBy(asc(users.username));
    return rows.map(parseUserJsonFields);
  }

  async getPendingUsers(): Promise<User[]> {
    const rows = await db.select().from(users).where(eq(users.approved, false)).orderBy(desc(users.createdAt));
    return rows.map(parseUserJsonFields);
  }

  async createUser(user: InsertUser): Promise<User> {
    const rows = await db.insert(users).values(user).returning();
    return parseUserJsonFields(rows[0]);
  }

  async updateUser(id: number, user: Partial<InsertUser>): Promise<User> {
    const rows = await db.update(users).set(user).where(eq(users.id, id)).returning();
    if (rows.length === 0) throw new Error('User not found');
    return parseUserJsonFields(rows[0]);
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(actionComments).where(eq(actionComments.userId, id));
    await db.update(objectives).set({ ownerId: 0 }).where(eq(objectives.ownerId, id));
    await db.update(actions).set({ responsibleId: null }).where(eq(actions.responsibleId, id));
    await db.update(users).set({ gestorId: null }).where(eq(users.gestorId, id));
    await db.update(users).set({ approvedBy: null }).where(eq(users.approvedBy, id));
    await db.delete(users).where(eq(users.id, id));
  }

  async approveUser(id: number, approvedBy: number, subRegionId?: number): Promise<User> {
    const updateData: any = { approved: true, approvedAt: new Date(), approvedBy };
    if (subRegionId) updateData.subRegionIds = [subRegionId];
    const rows = await db.update(users).set(updateData).where(eq(users.id, id)).returning();
    if (rows.length === 0) throw new Error('User not found');
    return parseUserJsonFields(rows[0]);
  }

  async approveUserWithPermissions(id: number, approvedBy: number, permissions: {
    regionIds: number[]; subRegionIds: number[]; solutionIds: number[];
    serviceLineIds: number[]; serviceIds: number[];
  }): Promise<User> {
    const rows = await db.update(users).set({
      approved: true,
      approvedAt: new Date(),
      approvedBy,
      regionIds: permissions.regionIds,
      subRegionIds: permissions.subRegionIds,
      solutionIds: permissions.solutionIds,
      serviceLineIds: permissions.serviceLineIds,
      serviceIds: permissions.serviceIds,
    }).where(eq(users.id, id)).returning();
    if (rows.length === 0) throw new Error('User not found');
    return parseUserJsonFields(rows[0]);
  }
}
