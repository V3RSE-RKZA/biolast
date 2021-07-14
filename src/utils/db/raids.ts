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
export async function getUsersRaid (query: Query, userID: string, forUpdate = false): Promise<ActiveRaid | undefined> {
	return (await query(`SELECT * FROM active_raids WHERE userId = ?${forUpdate ? ' FOR UPDATE' : ''}`, [userID]))[0]
}

/**
 * @param query Query to use
 * @returns All active raids
 */
export async function getAllRaids (query: Query): Promise<ActiveRaid[]> {
	return query('SELECT * FROM active_raids')
}

/**
 * @param query Query to use
 * @param guildID ID of guild to get active raids for
 * @returns Active raids
 */
export async function getAllUsers (query: Query, guildID: string): Promise<ActiveRaid[]> {
	return query('SELECT * FROM active_raids WHERE guildId = ?', [guildID])
}

/**
 * Adds user to raid
 * @param query Query to use
 * @param userID ID of user
 * @param guildID ID of raid guild
 * @param inviteCode ID of the invite created when raid was started
 * @param length How long the raid lasts in seconds
 */
export async function addUserToRaid (query: Query, userID: string, guildID: string, inviteCode: string, length: number): Promise<void> {
	await query('INSERT INTO active_raids (userId, guildId, invite, length) VALUES (?, ?, ?, ?)', [userID, guildID, inviteCode, length])
}

/**
 * Removes user from raid
 * @param query Query to use
 * @param userID ID of user
 */
export async function removeUserFromRaid (query: Query, userID: string): Promise<void> {
	await query('DELETE FROM active_raids WHERE userId = ?', [userID])
}
