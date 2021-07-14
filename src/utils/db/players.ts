import { Query, UserRow } from '../../types/mysql'

/**
 *
 * @param query Query to use
 * @param userID ID of user to get row of
 * @param forUpdate Whether this is used in an SQL transaction
 * @returns Users data
 */
export async function getUserRow (query: Query, userID: string, forUpdate = false): Promise<UserRow | undefined> {
	return (await query(`SELECT * FROM users WHERE userId = ?${forUpdate ? ' FOR UPDATE' : ''}`, [userID]))[0]
}

/**
 * Adds money to a users stash
 * @param query Query to use
 * @param userID ID of user to add money to
 * @param amount Amount of money to add
 */
export async function addMoney (query: Query, userID: string, amount: number): Promise<void> {
	await query('UPDATE users SET money = money + ? WHERE userId = ?', [amount, userID])
}

/**
 * Removes money from a users stash
 * @param query Query to use
 * @param userID ID of user to remove money from
 * @param amount Amount of money to remove
 */
export async function removeMoney (query: Query, userID: string, amount: number): Promise<void> {
	await query('UPDATE users SET money = money - ? WHERE userId = ?', [amount, userID])
}

/**
 * Increases a users health
 * @param query Query to use
 * @param userID ID of user to increase health of
 * @param amount Amount of health to add
 */
export async function addHealth (query: Query, userID: string, amount: number): Promise<void> {
	await query('UPDATE users SET health = health + ? WHERE userId = ?', [amount, userID])
}

/**
 * Lowers a users health
 * @param query Query to use
 * @param userID ID of user to lower health of
 * @param amount Amount of health to remove
 */
export async function lowerHealth (query: Query, userID: string, amount: number): Promise<void> {
	await query('UPDATE users SET health = health - ? WHERE userId = ?', [amount, userID])
}

/**
 * Creates an account for user
 * @param query Query to use
 * @param userID ID of user to create account for
 */
export async function createAccount (query: Query, userID: string): Promise<void> {
	await query('INSERT INTO users (userId) VALUES (?)', [userID])
}
