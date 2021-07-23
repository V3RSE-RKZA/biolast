import { Command } from '../types/Commands'
import { reply } from '../utils/messageUtils'
import { getUserRow } from '../utils/db/players'
import { query } from '../utils/db/mysql'
import { getMember } from '../utils/argParsers'
import { getPlayerXp } from '../utils/playerUtils'

export const command: Command = {
	name: 'level',
	aliases: ['xp', 'exp', 'lvl'],
	examples: ['xp @blobfysh'],
	description: 'View your current xp and level.',
	shortDescription: 'View your current xp and level.',
	category: 'info',
	permissions: ['sendMessages', 'externalEmojis'],
	cooldown: 2,
	worksInDMs: false,
	canBeUsedInRaid: true,
	onlyWorksInRaidGuild: false,
	guildModsOnly: false,
	async execute(app, message, { args, prefix }) {
		const member = getMember(message.channel.guild, args)

		if (!member && args.length) {
			await reply(message, {
				content: '❌ Could not find anyone matching that description!\nYou can mention someone, use their Discord#tag, or type their user ID'
			})
			return
		}
		else if (member) {
			const userData = await getUserRow(query, member.id)

			if (!userData) {
				await reply(message, {
					content: `❌ **${member.username}#${member.discriminator}** does not have an account!`
				})
				return
			}

			const playerXp = getPlayerXp(userData.xp, userData.level)

			await reply(message, {
				content: `**${member.username}#${member.discriminator}** is currently level **${userData.level}** (XP: **${playerXp.relativeLevelXp} / ${playerXp.levelTotalXpNeeded}**)`
			})
			return
		}

		const userData = (await getUserRow(query, message.author.id))!
		const playerXp = getPlayerXp(userData.xp, userData.level)

		await reply(message, {
			content: `You are currently level **${userData.level}** (XP: **${playerXp.relativeLevelXp} / ${playerXp.levelTotalXpNeeded}**)`
		})
	}
}
