import { Command } from '../types/Commands'
import { reply } from '../utils/messageUtils'
import { getUserRow } from '../utils/db/players'
import { query } from '../utils/db/mysql'
import { getMember } from '../utils/argParsers'
import formatHealth from '../utils/formatHealth'

export const command: Command = {
	name: 'health',
	aliases: ['hp'],
	examples: ['health @blobfysh'],
	description: 'View your current health.',
	shortDescription: 'View your current health.',
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

			await reply(message, {
				content: `**${member.username}#${member.discriminator}** currently has ${formatHealth(userData.health, userData.maxHealth)} **${userData.health} / ${userData.maxHealth}** HP`
			})
			return
		}

		const userData = (await getUserRow(query, message.author.id))!

		await reply(message, {
			content: `You currently have ${formatHealth(userData.health, userData.maxHealth)} **${userData.health} / ${userData.maxHealth}** HP`
		})
	}
}
