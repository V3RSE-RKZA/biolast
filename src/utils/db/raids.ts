import { ActiveRaid, Query } from '../../types/mysql'

/**
 * @param query Query to use
 * @param userID ID of user to check
 * @returns Whether or not user is in a raid
 */
export async function userInRaid (query: Query, userID: string): Promise<boolean> {
	return !!(await getUsersRaid(query, userID))
}

/**
 * @param query Query to use
 * @param userID ID of user to check
 * @returns The active raid row if user is in a raid
 */
export async function getUsersRaid (query: Query, userID: string): Promise<ActiveRaid | undefined> {
	return (await query('SELECT * FROM active_raids WHERE userId = ?', [userID]))[0]
}

/**
 * @param query Query to use
 * @returns All users in active raids
 */
export async function getAllRaids (query: Query): Promise<ActiveRaid[]> {
	return query('SELECT * FROM active_raids')
}

/**
 * Adds user to raid
 * @param query Query to use
 * @param userID ID of user
 * @param guildID ID of raid guild
 * @param length How long the raid lasts in seconds
 */
export async function addUserToRaid (query: Query, userID: string, guildID: string, length: number): Promise<void> {
	await query('INSERT INTO active_raids (userId, guildId, length) VALUES (?, ?, ?)', [userID, guildID, length])
}
