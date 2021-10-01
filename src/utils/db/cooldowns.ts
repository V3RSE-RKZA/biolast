import { Query, Cooldown } from '../../types/mysql'

/**
 * Check if user has a cooldown and returns the string formatted version if it exists, undefined if not
 * @param query Query to use
 * @param key ID to search for cooldown
 * @param type The cooldown type
 * @param forUpdate Whether the row should be locked (prevent other queries from updating modifying this cd)
 * @returns The time left for the cooldown or undefined if there is no cooldown
 */
export async function getCooldown (query: Query, key: string, type: string, forUpdate = false): Promise<string | undefined> {
	const cooldown = await getCooldownRow(query, key, type, forUpdate)

	if (cooldown) {
		const timeLeft = getCooldownTimeLeft(cooldown.length, cooldown.createdAt.getTime())

		return formatTime(timeLeft)
	}

	// no cooldown found
	return undefined
}

/**
 * @param query Query to use
 * @param key ID to search for cooldown
 * @param type The cooldown type
 * @param forUpdate Whether the row should be locked (prevent other queries from updating modifying this cd)
 * @returns The time left for the cooldown or undefined if there is no cooldown
 */
export async function getCooldownRow (query: Query, key: string, type: string, forUpdate = false): Promise<Cooldown | undefined> {
	const row: Cooldown | undefined = (await query(`SELECT * FROM cooldowns WHERE id = ? AND type = ?${forUpdate ? ' FOR UPDATE' : ''}`, [key, type]))[0]

	if (row) {
		const timeLeft = getCooldownTimeLeft(row.length, row.createdAt.getTime())

		if (timeLeft > 0) {
			return row
		}

		// remove expired cooldown from database
		await query('DELETE FROM cooldowns WHERE id = ? AND type = ?', [key, type])
	}

	return undefined
}

/**
 * @param length The length of the cooldown in seconds
 * @param createdAt The EPOCH time that cooldown was created at
 * @returns The number of milliseconds remaining
 */
export function getCooldownTimeLeft (length: number, createdAt: number): number {
	return (length * 1000) - (Date.now() - createdAt)
}

/**
 *
 * @param query Query to use
 * @param key ID to search for cooldown
 * @param type The cooldown type
 * @param length The length of the cooldown in seconds
 */
export async function createCooldown (query: Query, key: string, type: string, length: number): Promise<void> {
	await query('INSERT INTO cooldowns (id, type, length) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE createdAt = NOW(), length = ?', [key, type, length, length])
}

/**
 *
 * @param query Query to use
 * @param key ID to search for cooldown
 * @param type The cooldown type
 * @returns A string stating whether a cooldown was successfully cleared
 */
export async function clearCooldown (query: Query, key: string, type: string): Promise<string> {
	const result = await query('DELETE FROM cooldowns WHERE id = ? AND type = ?', [key, type])

	return result.affectedRows > 0 ?
		`Successfully removed ${type} cooldown from ${key}` :
		'No cooldown to remove'
}

/**
 * Converts milliseconds into a readable string
 * @param ms Time in milliseconds
 * @returns String representation of time
 */
export function formatTime (ms: number): string {
	let remaining = ms
	const finalStr = []

	const rawDays = remaining / (1000 * 60 * 60 * 24)
	const days = Math.floor(rawDays)
	remaining %= 1000 * 60 * 60 * 24

	const rawHours = remaining / (1000 * 60 * 60)
	const hours = Math.floor(rawHours)
	remaining %= 1000 * 60 * 60

	const rawMinutes = remaining / (1000 * 60)
	const minutes = Math.floor(rawMinutes)
	remaining %= 1000 * 60

	const seconds = Math.floor(remaining / 1000)

	if (days > 0) {
		finalStr.push(days === 1 ? `${days} day` : `${days} days`)
	}
	if (hours > 0) {
		finalStr.push(hours === 1 ? `${hours} hour` : `${hours} hours`)

		if (days > 0) {
			return finalStr.join(' ')
		}
	}
	if (minutes > 0) {
		finalStr.push(minutes === 1 ? `${minutes} minute` : `${minutes} minutes`)

		if (hours > 0 || days > 0) {
			return finalStr.join(' ')
		}
	}

	if (seconds !== 0) finalStr.push(seconds === 1 ? `${seconds} second` : `${seconds} seconds`)

	if (!finalStr.length) {
		// need this otherwise '' will be returned which is a falsy value and can cause issues when checking if the user is on cooldown
		return 'less than a second'
	}

	return finalStr.join(' ')
}
