import { Query, SkinRow } from '../../types/mysql'
import { OkPacket } from 'mysql'

/**
 * @param query Query to use
 * @param userID ID of user to get skins of
 * @param forUpdate Whether this is used in an SQL transaction
 * @returns Users skins
 */
export async function getUserSkins (query: Query, userID: string, forUpdate = false): Promise<SkinRow[]> {
	return query(`SELECT id, userId, skin, skinCreatedAt FROM skins WHERE userId = ?${forUpdate ? ' FOR UPDATE' : ''}`, [userID])
}

/**
 * @param query Query to use
 * @param skinID ID of skin to transfer
 * @param userID ID of user to transfer skin to
 */
export async function setSkinOwner (query: Query, skinID: number, userID: string): Promise<void> {
	return query('UPDATE skins SET userId = ? WHERE id = ?', [userID, skinID])
}

/**
 * Create a skin and returns the SQL row of it
 * @param query Query to use
 * @param userID ID of user to give skin to
 * @param name name of the skin
 * @returns Skin SQL row
 */
export async function createSkin (query: Query, userID: string, name: string): Promise<SkinRow> {
	const packet: OkPacket = await query('INSERT INTO skins (userId, skin) VALUES (?, ?)', [userID, name])

	return {
		id: packet.insertId,
		userId: userID,
		skin: name,
		skinCreatedAt: new Date()
	}
}

export async function deleteSkin (query: Query, skinID: number): Promise<void> {
	await query('DELETE FROM skins WHERE id = ?', [skinID])
}
