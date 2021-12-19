import { CommandOptionType, SlashCreator, CommandContext } from 'slash-create'
import App from '../app'
import { icons } from '../config'
import CustomSlashCommand from '../structures/CustomSlashCommand'

class HelpCommand extends CustomSlashCommand {
	constructor (creator: SlashCreator, app: App) {
		super(creator, app, {
			name: 'wave',
			description: 'Wave at another scavenger and show them you\'re friendly!',
			longDescription: 'Use this command to wave at another scavenger and show them you\'re friendly!',
			options: [{
				type: CommandOptionType.USER,
				name: 'user',
				description: 'User to wave at.',
				required: false
			}],
			category: 'info',
			guildModsOnly: false,
			worksInDMs: false,
			onlyWorksInRaidGuild: true,
			canBeUsedInRaid: true,
			worksDuringDuel: true,
			guildIDs: []
		})

		this.filePath = __filename
	}

	async run (ctx: CommandContext): Promise<void> {
		const member = ctx.members.get(ctx.options.user)

		if (!member) {
			await ctx.send({
				content: icons.wave
			})

			return
		}

		await ctx.send({
			content: `<@${member.user.id}>, ${icons.wave}`
		})
	}
}

export default HelpCommand
