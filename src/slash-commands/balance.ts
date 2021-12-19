import { CommandOptionType, SlashCreator, CommandContext } from 'slash-create'
import App from '../app'
import { icons } from '../config'
import CustomSlashCommand from '../structures/CustomSlashCommand'
import { query } from '../utils/db/mysql'
import { getUserRow } from '../utils/db/players'
import { formatMoney } from '../utils/stringUtils'

class BalanceCommand extends CustomSlashCommand {
	constructor (creator: SlashCreator, app: App) {
		super(creator, app, {
			name: 'balance',
			description: 'View your current balance.',
			longDescription: 'View your current balance.',
			options: [{
				type: CommandOptionType.USER,
				name: 'user',
				description: 'User to check balance of.',
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
				content: `**${member.displayName}** currently has **${formatMoney(userData.money)}**.\n\n` +
					`${icons.tier1_currency} 100 copper = ${icons.tier2_currency} 1 silver\n` +
					`${icons.tier2_currency} 100 silver = ${icons.tier3_currency} 1 gold`
			})
			return
		}

		const userData = (await getUserRow(query, ctx.user.id))!

		await ctx.send({
			content: `You currently have **${formatMoney(userData.money)}**.\n\n` +
				`${icons.tier1_currency} 100 copper = ${icons.tier2_currency} 1 silver\n` +
				`${icons.tier2_currency} 100 silver = ${icons.tier3_currency} 1 gold`
		})
	}
}

export default BalanceCommand
