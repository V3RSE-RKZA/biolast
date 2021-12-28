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
 * Increases a users level
 * @param query Query to use
 * @param userID ID of user to increase level of
 * @param amount Amount to increase level by
 */
export async function increaseLevel (query: Query, userID: string, amount: number): Promise<void> {
	await query('UPDATE users SET level = level + ? WHERE userId = ?', [amount, userID])
}

/**
 * Increases a users questsCompleted stat
 * @param query Query to use
 * @param userID ID of user to increase stat of
 * @param amount Amount to increase stat by
 */
export async function increaseQuestsCompleted (query: Query, userID: string, amount: number): Promise<void> {
	await query('UPDATE users SET questsCompleted = questsCompleted + ? WHERE userId = ?', [amount, userID])
}

/**
 * Increases a users shop sales (how many items user has bought from shop)
 * @param query Query to use
 * @param userID ID of user to increase shop sales of
 * @param amount Amount to increase sales by
 */
export async function increaseShopSales (query: Query, userID: string, amount: number): Promise<void> {
	await query('UPDATE users SET shopSales = shopSales + ? WHERE userId = ?', [amount, userID])
}

/**
 * Increases a users kill count
 * @param query Query to use
 * @param userID ID of user to increase kills of
 * @param type The type of kill stat to increase. Can be player kills, npc kills,
 * or boss npc kills (boss npc kills will increase both npc and boss)
 * @param amount Amount to increase kills by
 */
export async function increaseKills (query: Query, userID: string, type: 'player' | 'npc' | 'boss', amount: number): Promise<void> {
	switch (type) {
		case 'player': {
			await query('UPDATE users SET kills = kills + ? WHERE userId = ?', [amount, userID])
			break
		}
		case 'npc': {
			await query('UPDATE users SET npcKills = npcKills + ? WHERE userId = ?', [amount, userID])
			break
		}
		case 'boss': {
			await query('UPDATE users SET bossKills = bossKills + ?, npcKills = npcKills + ? WHERE userId = ?', [amount, amount, userID])
		}
	}
}

/**
 * Increases a users death count
 * @param query Query to use
 * @param userID ID of user to increase deaths of
 * @param amount Amount to increase deaths by
 */
export async function increaseDeaths (query: Query, userID: string, amount: number): Promise<void> {
	await query('UPDATE users SET deaths = deaths + ? WHERE userId = ?', [amount, userID])
}

/**
 * Set a users max health
 * @param query Query to use
 * @param userID ID of user to set max health of
 * @param amount Amount to set max health to
 */
export async function setMaxHealth (query: Query, userID: string, amount: number): Promise<void> {
	await query('UPDATE users SET maxHealth = ? WHERE userId = ?', [amount, userID])
}

/**
 * Set whether a user is in a fight (PvP or PvE)
 * @param query Query to use
 * @param userID ID of user to set
 * @param fighting Amount to set max health to
 */
export async function setFighting (query: Query, userID: string, fighting: boolean): Promise<void> {
	await query('UPDATE users SET fighting = ? WHERE userId = ?', [fighting ? 1 : 0, userID])
}

/**
 * Set a users stash space
 * @param query Query to use
 * @param userID ID of user to set stash slots of
 * @param amount Amount to set stash slots to
 */
export async function setStashSlots (query: Query, userID: string, amount: number): Promise<void> {
	await query('UPDATE users SET stashSlots = ? WHERE userId = ?', [amount, userID])
}

/**
 * Add to users xp
 * @param query Query to use
 * @param userID ID of user to increase xp of
 * @param amount Amount to increase xp by
 */
export async function addXp (query: Query, userID: string, amount: number): Promise<void> {
	await query('UPDATE users SET xp = xp + ? WHERE userId = ?', [amount, userID])
}


/**
 * Creates an account for user
 * @param query Query to use
 * @param userID ID of user to create account for
 */
export async function createAccount (query: Query, userID: string): Promise<void> {
	await query('INSERT INTO users (userId) VALUES (?)', [userID])
}
