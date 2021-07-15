import { Command } from '../types/Commands'
import { reply } from '../utils/messageUtils'
import { query } from '../utils/db/mysql'
import { formatTime } from '../utils/db/cooldowns'
import { getUsersRaid } from '../utils/db/raids'

export const command: Command = {
	name: 'raidtime',
	aliases: ['timeleft'],
	examples: [],
	description: 'Shows how much time you have to extract when in a raid. If you are still in a raid when the time runs out, the raid will end and you will lose everything in your backpack.',
	shortDescription: 'Shows how much time you have to extract when in a raid.',
	category: 'info',
	permissions: ['sendMessages', 'externalEmojis'],
	cooldown: 2,
	worksInDMs: false,
	canBeUsedInRaid: true,
	onlyWorksInRaidGuild: true,
	guildModsOnly: false,
	async execute(app, message, { args, prefix }) {
		const userRaid = await getUsersRaid(query, message.author.id)

		if (!userRaid) {
			throw new Error('Could not find users raid')
		}

		const timeLeft = (userRaid.length * 1000) - (Date.now() - userRaid.startedAt.getTime())

		await reply(message, {
			content: `You have **${formatTime(timeLeft)}** to extract in an extract channel. If you are still in the raid when this timer expires, you will be kicked and you'll lose everything in your backpack.`
		})
	}
}
