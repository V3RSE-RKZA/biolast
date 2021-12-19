import { SlashCreator, CommandContext, InteractionResponseFlags } from 'slash-create'
import App from '../app'
import { icons } from '../config'
import CustomSlashCommand from '../structures/CustomSlashCommand'
import { formatTime } from '../utils/db/cooldowns'
import { query } from '../utils/db/mysql'
import { getUsersRaid } from '../utils/db/raids'

class RaidTimeCommand extends CustomSlashCommand {
	constructor (creator: SlashCreator, app: App) {
		super(creator, app, {
			name: 'raidtime',
			description: 'Shows how much time you have to evac when in a raid.',
			longDescription: 'Shows how much time you have to evac when in a raid. If you are still in a raid when the time runs out, the raid will end and you will lose everything in your inventory.',
			options: [],
			category: 'info',
			guildModsOnly: false,
			worksInDMs: false,
			onlyWorksInRaidGuild: true,
			canBeUsedInRaid: true,
			worksDuringDuel: true,

			// deferEphemeral because the command responds with only ephemeral messages
			deferEphemeral: true,

			// this is automatically populated with the ids of raid guilds since onlyWorksInRaidGuild is set to true
			guildIDs: []
		})

		this.filePath = __filename
	}

	async run (ctx: CommandContext): Promise<void> {
		const userRaid = await getUsersRaid(query, ctx.user.id)

		if (!userRaid) {
			throw new Error('Could not find users raid')
		}

		const timeLeft = (userRaid.length * 1000) - (Date.now() - userRaid.startedAt.getTime())

		await ctx.send({
			content: `${icons.information} You have **${formatTime(timeLeft)}** to find an evac and escape from this raid. If you are still in the raid when this timer expires, you will be kicked and you'll lose everything in your inventory.`,
			flags: InteractionResponseFlags.EPHEMERAL
		})
	}
}

export default RaidTimeCommand
