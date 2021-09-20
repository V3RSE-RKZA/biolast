import { Guild, Member } from 'eris'
import Corrector from '../structures/Corrector'
import { allItems } from '../resources/items'
import { Item } from '../types/Items'

const itemCorrector = new Corrector([...allItems.map(itm => itm.name.toLowerCase()), ...allItems.map(itm => itm.aliases.map(a => a.toLowerCase())).flat(1)])

/**
 * Uses spell correction to find an item from given arguments
 * @param args Array of arguments to search for item
 * @returns An item
 */
export function getItem (args: string[]): Item | undefined {
	if (args[0] && args.length === 1) {
		args = args[0].split(/ +/)
	}

	for (let i = 0; i < args.slice(0, 6).length; i++) {
		// get the args that come after this one
		const afterArgs = args.slice(i, 6)

		const correctedItem = itemCorrector.getWord(afterArgs.join('_').toLowerCase())

		const item = allItems.find(itm => itm.name.toLowerCase() === correctedItem || (correctedItem && itm.aliases.map(a => a.toLowerCase()).includes(correctedItem)))

		if (item) {
			return item
		}
	}
}

/**
 * Parse User IDs, username#discriminator and mentions into a guild member
 * @param guild Guild to search for members in
 * @param args Array of arguments to search for a member
 * @returns A guild member
 */
export function getMember (guild: Guild, args: string[]): Member | undefined {
	for (let i = 0; i < args.slice(0, 6).length; i++) {
		const arg = args[i]

		// regex tests for <@!1234etc>, will pass when player mentions someone or types a user id
		const userMatch = arg.match(/^<?@?!?(\d+)>?$/)

		if (userMatch) {
			const userId = userMatch[1]

			const member = guild.members.find(m => m.id === userId)

			if (member) {
				return member
			}
		}
		// regex test for username#discriminator
		else if (/^(.*)#([0-9]{4})$/.test(arg)) {
			const userTag = arg.split('#')
			const previousArgs = args.slice(0, i)

			previousArgs.push(userTag[0])

			for (let i2 = 1; i2 < previousArgs.length + 1; i2++) {
				// start checking args backwards, starting from the arg that had # in it, ie. big blob fysh#4679, it would check blob fysh then check big blob fysh
				const userToCheck = previousArgs.slice(i2 * -1).join(' ')

				const member = guild.members.find(m => !!(m.username.toLowerCase() === userToCheck.toLowerCase() && m.discriminator === userTag[1]) ||
					!!((m.nick && m.nick.toLowerCase() === userToCheck) && m.discriminator === userTag[1]))

				if (member) return member
			}
		}
	}
}

/**
 * Parse ONLY a mention into a guild member
 * @param guild Guild to search for members in
 * @param arg Arg to look for a member
 * @returns A guild member
 */
export function getMemberFromMention (guild: Guild, arg?: string): Member | undefined {
	if (arg) {
		// regex tests for <@!1234etc>, will pass when player mentions someone, DOES NOT PASS FOR USER IDs
		const userMatch = arg.match(/^<@!?(\d+)>$/)

		if (userMatch) {
			const userId = userMatch[1]

			const member = guild.members.find(m => m.id === userId)

			if (member) {
				return member
			}
		}
	}
}

/**
 * @param guild If arg is a custom emoji, will check to make sure the custom emoji exists in this guild
 * @param arg Arg to look for emoji
 * @returns An emoji in string form that can be parsed by Discord chat
 */
export function getEmoji (guild: Guild, arg?: string): string | undefined {
	if (arg) {
		// regex tests for <a:emojiname:1234>, will pass for custom emojis
		const customEmojiMatch = arg.match(/^<a?:.*:(\d+)>?$/)

		if (customEmojiMatch) {
			const emojiId = customEmojiMatch[1]

			// make sure emoji exists in the guild
			const emoji = guild.emojis.find(e => e.id === emojiId)

			if (emoji) {
				return arg
			}
		}
		else if (/(?=\p{Emoji})(?!\p{Number})/u.test(arg)) {
			const unicodeEmojiMatch = arg.match(/(\p{Emoji})/u)

			if (unicodeEmojiMatch) {
				return unicodeEmojiMatch[1]
			}
		}
	}
}

/**
 * Parses string numbers into usable numbers (ex. '1,234,567' -> 1234567 or '1k' to 1000)
 * @param arg Arg to check number for
 * @returns A parsed number
 */
export function getNumber (arg?: string): number | undefined {
	if (arg) {
		arg = arg.replace(/,/g, '')

		if (isNumber(arg)) {
			let number

			if (arg.endsWith('m')) {
				number = Math.floor(parseFloat(arg) * 1000000)
			}
			else if (arg.endsWith('k')) {
				number = Math.floor(parseFloat(arg) * 1000)
			}
			else {
				if (arg.endsWith('x')) {
					arg = arg.slice(0, -1)
				}

				number = Math.floor(Number(arg))
			}

			// don't return numbers lower than 0
			return number > 0 ? number : undefined
		}
	}
}

/**
 * Parses string floats into usable numbers (ex. '1,234.50' -> 1234.50), input will be rounded to nearest 2 decimal places
 * @param arg Arg to check float for
 * @returns A parsed float
 */
export function getFloat (arg?: string): number | undefined {
	if (arg) {
		arg = arg.replace(/,/g, '')

		if (isNumber(arg, true)) {
			let number

			if (arg.endsWith('m')) {
				number = Math.floor(parseFloat(arg) * 1000000)
			}
			else if (arg.endsWith('k')) {
				number = Math.floor(parseFloat(arg) * 1000)
			}
			else {
				number = parseFloat(Number(arg).toFixed(2))
			}

			// don't return numbers lower than 0
			return number > 0 ? number : undefined
		}
	}
}

function isNumber (input: string, allowFloats = false): boolean {
	if (!isNaN(Number(input)) && (allowFloats || !input.includes('.'))) {
		return true
	}
	else if (input.endsWith('m') && !isNaN(Number(input.slice(0, -1)))) {
		return true
	}
	else if (input.endsWith('k') && !isNaN(Number(input.slice(0, -1)))) {
		return true
	}
	else if (input.endsWith('x') && !isNaN(Number(input.slice(0, -1)))) {
		return true
	}

	return false
}
