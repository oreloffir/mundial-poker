import { eq, sql, and, ne, desc } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { tables, tablePlayers, users } from '../../db/schema.js'

const STATUS_SORT_ORDER: Record<string, number> = { WAITING: 0, IN_PROGRESS: 1, PAUSED_FOR_MATCHES: 2, COMPLETED: 3 }

export async function findAll(includeCompleted = false) {
  let query = db
    .select({
      id: tables.id,
      name: tables.name,
      hostId: tables.hostId,
      status: tables.status,
      startingChips: tables.startingChips,
      smallBlind: tables.smallBlind,
      bigBlind: tables.bigBlind,
      createdAt: tables.createdAt,
      updatedAt: tables.updatedAt,
      playerCount: sql<number>`count(${tablePlayers.userId})::int`,
    })
    .from(tables)
    .leftJoin(tablePlayers, eq(tables.id, tablePlayers.tableId))
    .groupBy(tables.id)
    .orderBy(desc(tables.createdAt))

  if (!includeCompleted) {
    query = query.where(ne(tables.status, 'COMPLETED')) as typeof query
  }

  const result = await query
  return result.sort((a, b) => (STATUS_SORT_ORDER[a.status] ?? 9) - (STATUS_SORT_ORDER[b.status] ?? 9))
}

export async function findById(id: string) {
  const [table] = await db.select().from(tables).where(eq(tables.id, id)).limit(1)
  if (!table) return null

  const players = await db
    .select({
      userId: tablePlayers.userId,
      seatIndex: tablePlayers.seatIndex,
      chipStack: tablePlayers.chipStack,
      isConnected: tablePlayers.isConnected,
      joinedAt: tablePlayers.joinedAt,
      username: users.username,
      avatarUrl: users.avatarUrl,
    })
    .from(tablePlayers)
    .innerJoin(users, eq(tablePlayers.userId, users.id))
    .where(eq(tablePlayers.tableId, id))

  return { ...table, players }
}

export async function create(
  name: string,
  hostId: string,
  startingChips: number,
  smallBlind: number,
  bigBlind: number,
) {
  const [inserted] = await db
    .insert(tables)
    .values({ name, hostId, startingChips, smallBlind, bigBlind })
    .returning()

  return inserted
}

export async function addPlayer(
  tableId: string,
  userId: string,
  seatIndex: number,
  chipStack: number,
) {
  const [inserted] = await db
    .insert(tablePlayers)
    .values({ tableId, userId, seatIndex, chipStack })
    .returning()

  return inserted
}

export async function removePlayer(tableId: string, userId: string) {
  await db
    .delete(tablePlayers)
    .where(and(eq(tablePlayers.tableId, tableId), eq(tablePlayers.userId, userId)))
}

export async function updatePlayerChips(tableId: string, userId: string, chips: number) {
  const [updated] = await db
    .update(tablePlayers)
    .set({ chipStack: chips })
    .where(and(eq(tablePlayers.tableId, tableId), eq(tablePlayers.userId, userId)))
    .returning()

  return updated
}

export async function updateStatus(tableId: string, status: string) {
  const [updated] = await db
    .update(tables)
    .set({ status, updatedAt: new Date() })
    .where(eq(tables.id, tableId))
    .returning()

  return updated
}

export async function deleteTable(tableId: string) {
  await db.delete(tables).where(eq(tables.id, tableId))
}

export async function updateHost(tableId: string, newHostId: string) {
  const [updated] = await db
    .update(tables)
    .set({ hostId: newHostId, updatedAt: new Date() })
    .where(eq(tables.id, tableId))
    .returning()

  return updated
}

export async function getPlayerCount(tableId: string): Promise<number> {
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tablePlayers)
    .where(eq(tablePlayers.tableId, tableId))

  return result.count
}
