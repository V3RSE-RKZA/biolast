import { Command } from '../types/Commands'
import { reply } from '../utils/messageUtils'
import formatNumber from '../utils/formatNumber'
import { getUserRow, addMoney } from '../utils/db/players'
import { beginTransaction } from '../utils/db/mysql'
import { createCooldown, getCooldown } from '../utils/db/cooldowns'

export const command: Command = {
	name: 'daily',
	aliases: [],
	examples: [],
	description: 'Use this to claim free rubles every day.',
	shortDescription: 'Use this to claim free rubles every day.',
	category: 'info',
	permissions: ['sendMessages', 'externalEmojis'],
	cooldown: 2,
	worksInDMs: false,
	canBeUsedInRaid: true,
	onlyWorksInRaidGuild: false,
	guildModsOnly: false,
	async execute(app, message, { args, prefix }) {
		const transaction = await beginTransaction()
		// using transaction because users data will be updated
		const userData = (await getUserRow(transaction.query, message.author.id, true))!
		const dailyCD = await getCooldown(transaction.query, message.author.id, 'daily')

		if (dailyCD) {
			await transaction.commit()

			await reply(message, {
				content: `❌ You need to wait **${dailyCD}** before claiming your daily again.`
			})
			return
		}

		const coinsEarned = 1000

		await addMoney(transaction.query, message.author.id, coinsEarned)
		await createCooldown(transaction.query, message.author.id, 'daily', 24 * 60 * 60)
		await transaction.commit()

		await reply(message, {
			content: `***${formatNumber(coinsEarned)}** rubles have been added to your stash.*\n\nYour stash now has **${formatNumber(userData.money + coinsEarned)}** rubles.`
		})
	}
}
