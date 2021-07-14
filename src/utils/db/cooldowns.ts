import { Query, Cooldown } from '../../types/mysql'

/**
 *
 * @param query Query to use
 * @param key ID to search for cooldown
 * @param type The cooldown type
 * @returns The time left for the cooldown or undefined if there is no cooldown
 */
export async function getCooldown(query: Query, key: string, type: string): Promise<string | undefined> {
	const cooldown: Cooldown = (await query('SELECT * FROM cooldowns WHERE id = ? AND type = ?', [key, type]))[0]


	if (cooldown) {
		const timeLeft = (cooldown.length * 1000) - (Date.now() - cooldown.createdAt.getTime())

		if (timeLeft > 0) {
			return formatTime(timeLeft)
		}

		// remove expired cooldown from database
		await query('DELETE FROM cooldowns WHERE id = ? AND type = ?', [key, type])
	}

	// no cooldown found
	return undefined
}

/**
 *
 * @param query Query to use
 * @param key ID to search for cooldown
 * @param type The cooldown type
 * @param length The length of the cooldown in seconds
 */
export async function createCooldown(query: Query, key: string, type: string, length: number): Promise<void> {
	try {
		await query('INSERT INTO cooldowns (id, type, length) VALUES (?, ?, ?)', [key, type, length])
	}
	catch (err) {
		console.warn('ERROR TRYING TO CREATE COOLDOWN, removing the expired cooldown...')
		// this really shouldn't error since expired cooldowns are removed by getCooldown but just in case...
		// remove expired cooldown from database
		await query('DELETE FROM cooldowns WHERE id = ? AND type = ?', [key, type])

		await query('INSERT INTO cooldowns (id, type, length) VALUES (?, ?, ?)', [key, type, length])
	}
}

/**
 *
 * @param query Query to use
 * @param key ID to search for cooldown
 * @param type The cooldown type
 * @returns A string stating whether a cooldown was successfully cleared
 */
export async function clearCooldown(query: Query, key: string, type: string): Promise<string> {
	const result = await query('DELETE FROM cooldowns WHERE id = ? AND type = ?', [key, type])

	return result.affectedRows > 0 ?
		`Successfully removed ${type} cooldown from ${key}` :
		'No cooldown to remove'
}

export function formatTime(ms: number): string {
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
