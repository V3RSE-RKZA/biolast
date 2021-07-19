import { NPC } from '../../resources/npcs'
import { Query, NPCRow } from '../../types/mysql'

/**
 * Retrieves all spawned NPCs
 * @param query Query to use
 * @returns Array of NPC data
 */
export async function getAllNPCs (query: Query): Promise<NPCRow[]> {
	return query('SELECT * FROM npcs')
}

/**
 *
 * @param query Query to use
 * @param channelID ID of channel to get row of
 * @param forUpdate Whether this is used in an SQL transaction
 * @returns NPC data
 */
export async function getNPC (query: Query, channelID: string, forUpdate = false): Promise<NPCRow | undefined> {
	return (await query(`SELECT * FROM npcs WHERE channelId = ?${forUpdate ? ' FOR UPDATE' : ''}`, [channelID]))[0]
}

/**
 * Lowers npc health
 * @param query Query to use
 * @param channelID Channel iD NPC is in
 * @param amount Amount of health to remove
 */
export async function lowerHealth (query: Query, channelID: string, amount: number): Promise<void> {
	await query('UPDATE npcs SET health = health - ? WHERE channelId = ?', [amount, channelID])
}

/**
 * Creates npc in a channel
 * @param query Query to use
 * @param channelID ID of channel to create npc in
 */
export async function createNPC (query: Query, channelID: string, npc: NPC): Promise<void> {
	await query('INSERT INTO npcs (channelId, health, id) VALUES (?, ?, ?)', [channelID, npc.health, npc.id])
}

/**
 * @param query Query to use
 * @param channelID ID of channel to delete npc in
 */
export async function deleteNPC (query: Query, channelID: string): Promise<void> {
	await query('DELETE FROM npcs WHERE channelId = ?', [channelID])
}
