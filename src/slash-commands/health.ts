import { CommandOptionType, SlashCreator, CommandContext } from 'slash-create'
import App from '../app'
import { icons } from '../config'
import CustomSlashCommand from '../structures/CustomSlashCommand'
import { query } from '../utils/db/mysql'
import { getUserRow } from '../utils/db/players'
import { formatHealth } from '../utils/stringUtils'

class HealthCommand extends CustomSlashCommand {
	constructor (creator: SlashCreator, app: App) {
		super(creator, app, {
			name: 'health',
			description: 'View your current health.',
			longDescription: 'View your current health.',
			options: [{
				type: CommandOptionType.USER,
				name: 'user',
				description: 'User to check status of.',
				required: false
			}],
			category: 'info',
			guildModsOnly: false,
			worksInDMs: true,
			onlyWorksInRaidGuild: false,
			canBeUsedInRaid: true,
			worksDuringDuel: true,
			guildIDs: []
		})

		this.filePath = __filename
	}

	async run (ctx: CommandContext): Promise<void> {
		const member = ctx.members.get(ctx.options.user)

		if (member) {
			const userData = await getUserRow(query, member.id)

			if (!userData) {
				await ctx.send({
					content: `${icons.warning} **${member.displayName}** does not have an account!`
				})
				return
			}

			await ctx.send({
				content: `**${member.displayName}** currently has ${formatHealth(userData.health, userData.maxHealth)} **${userData.health} / ${userData.maxHealth}** HP.`
			})
			return
		}

		const userData = (await getUserRow(query, ctx.user.id))!

		await ctx.send({
			content: `You currently have ${formatHealth(userData.health, userData.maxHealth)} **${userData.health} / ${userData.maxHealth}** HP. You will gain **5 HP every 5 minutes** while you are not in a duel.`
		})
	}
}

export default HealthCommand
