import { CommandOptionType, SlashCreator, CommandContext, Message, ComponentType } from 'slash-create'
import App from '../app'
import { icons } from '../config'
import CustomSlashCommand from '../structures/CustomSlashCommand'
import { query } from '../utils/db/mysql'
import { getTopPlayers } from '../utils/db/players'
import { formatMoney } from '../utils/stringUtils'
import Embed from '../structures/Embed'
import { disableAllComponents } from '../utils/messageUtils'

const lbCategories = [
	{ icon: icons.copper, category: 'Richest Users', description: 'View the richest players.' },
	{ icon: icons.xp_star, category: 'Highest Level', description: 'View players with the highest level.' },
	{ icon: '🔖', category: 'Quest Completions', description: 'View players who have completed the most quests.' },
	{ icon: icons.crosshair, category: 'Player Kills', description: 'View players who have killed the most players.' },
	{ icon: '💀', category: 'Mob Kills', description: 'View players who have killed the most mobs (including bosses).' },
	{ icon: '☠️', category: 'Boss Kills', description: 'View players who have killed the most bosses.' },
	{ icon: icons.panic, category: 'Most Deaths', description: 'View players who have died the most (sad).' }
]

class LeaderboardCommand extends CustomSlashCommand<'leaderboards'> {
	constructor (creator: SlashCreator, app: App) {
		super(creator, app, {
			name: 'leaderboards',
			description: 'View the best players.',
			longDescription: 'View the best players of a given category.',
			options: [
				{
					type: CommandOptionType.SUB_COMMAND,
					name: 'server',
					description: 'View the best players in this server.'
				},
				{
					type: CommandOptionType.SUB_COMMAND,
					name: 'global',
					description: 'View the best players.'
				}
			],
			category: 'info',
			guildModsOnly: false,
			worksInDMs: true,
			worksDuringDuel: true,
			guildIDs: []
		})

		this.filePath = __filename
	}

	async run (ctx: CommandContext): Promise<void> {
		const leaderboards = new Embed()

		for (const cate of lbCategories) {
			leaderboards.addField(`${cate.icon} ${cate.category}`, cate.description)
		}

		if (ctx.options.server) {
			if (!ctx.guildID) {
				await ctx.send({
					content: `${icons.danger} You can't view server leaderboards inside of DMs... 🤔🤔🤔`
				})
				return
			}

			const erisGuild = this.app.bot.guilds.get(ctx.guildID)

			if (!erisGuild) {
				await ctx.send({
					content: `${icons.danger} There was an error trying to fetch the server leaderboards.`
				})
				return
			}

			if (erisGuild.iconURL) {
				leaderboards.setThumbnail(erisGuild.iconURL)
			}

			leaderboards.setTitle('Server Leaderboards')

			const botMessage = await ctx.send({
				content: 'Which leaderboard category would you like to view?',
				embeds: [leaderboards.embed],
				components: [
					{
						type: ComponentType.ACTION_ROW,
						components: [
							{
								type: ComponentType.SELECT,
								custom_id: 'lb-command',
								options: lbCategories.map(c => {
									const iconID = c.icon.match(/:([0-9]*)>/)

									return {
										label: c.category,
										value: c.category,
										emoji: iconID ? {
											id: iconID[1],
											name: c.category
										} : {
											name: c.icon
										}
									}
								})
							}
						]
					}
				]
			}) as Message

			try {
				const selection = (await this.app.componentCollector.awaitClicks(botMessage.id, i => i.user.id === ctx.user.id, 40000))[0]
				const lbEmbed = new Embed()
					.setFooter('Some users might be excluded if they have not been active lately.')

				if (erisGuild.iconURL) {
					lbEmbed.setThumbnail(erisGuild.iconURL)
				}

				if (selection.values.includes('Richest Users')) {
					const top = await getTopPlayers(query, 'money', erisGuild)
					lbEmbed.setTitle('Richest Players (Server)')
					lbEmbed.setDescription(top.map((p, i) => `${i + 1}. <@${p.userId}> ${formatMoney(p.money)}`).join('\n'))

					await selection.editParent({
						content: '',
						embeds: [lbEmbed.embed],
						components: []
					})
				}
				else if (selection.values.includes('Highest Level')) {
					const top = await getTopPlayers(query, 'level', erisGuild)
					lbEmbed.setTitle('Highest Level Players (Server)')
					lbEmbed.setDescription(top.map((p, i) => `${i + 1}. <@${p.userId}> Lvl. **${p.level}**`).join('\n'))

					await selection.editParent({
						content: '',
						embeds: [lbEmbed.embed],
						components: []
					})
				}
				else if (selection.values.includes('Quest Completions')) {
					const top = await getTopPlayers(query, 'questsCompleted', erisGuild)
					lbEmbed.setTitle('Most Quest Completions (Server)')
					lbEmbed.setDescription(top.map((p, i) => `${i + 1}. <@${p.userId}> **${p.questsCompleted}** quests completed`).join('\n'))

					await selection.editParent({
						content: '',
						embeds: [lbEmbed.embed],
						components: []
					})
				}
				else if (selection.values.includes('Player Kills')) {
					const top = await getTopPlayers(query, 'kills', erisGuild)
					lbEmbed.setTitle('Most Player Kills (Server)')
					lbEmbed.setDescription(top.map((p, i) => `${i + 1}. <@${p.userId}> **${p.kills}** players killed`).join('\n'))

					await selection.editParent({
						content: '',
						embeds: [lbEmbed.embed],
						components: []
					})
				}
				else if (selection.values.includes('Mob Kills')) {
					const top = await getTopPlayers(query, 'npcKills', erisGuild)
					lbEmbed.setTitle('Most Mob Kills (Server)')
					lbEmbed.setDescription(top.map((p, i) => `${i + 1}. <@${p.userId}> **${p.npcKills}** mobs killed`).join('\n'))

					await selection.editParent({
						content: '',
						embeds: [lbEmbed.embed],
						components: []
					})
				}
				else if (selection.values.includes('Boss Kills')) {
					const top = await getTopPlayers(query, 'bossKills', erisGuild)
					lbEmbed.setTitle('Most Boss Kills (Server)')
					lbEmbed.setDescription(top.map((p, i) => `${i + 1}. <@${p.userId}> **${p.bossKills}** bosses killed`).join('\n'))

					await selection.editParent({
						content: '',
						embeds: [lbEmbed.embed],
						components: []
					})
				}
				else if (selection.values.includes('Most Deaths')) {
					const top = await getTopPlayers(query, 'deaths', erisGuild)
					lbEmbed.setTitle('Most Deaths (Server)')
					lbEmbed.setDescription(top.map((p, i) => `${i + 1}. <@${p.userId}> **${p.deaths}** deaths`).join('\n'))

					await selection.editParent({
						content: '',
						embeds: [lbEmbed.embed],
						components: []
					})
				}
			}
			catch (err) {
				await botMessage.edit({
					content: `${icons.warning} Buttons timed out.`,
					components: disableAllComponents(botMessage.components)
				})
			}
		}
		else if (ctx.options.global) {
			leaderboards.setTitle('Global Leaderboards')

			const botMessage = await ctx.send({
				content: 'Which leaderboard category would you like to view?',
				embeds: [leaderboards.embed],
				components: [
					{
						type: ComponentType.ACTION_ROW,
						components: [
							{
								type: ComponentType.SELECT,
								custom_id: 'lb-command',
								options: lbCategories.map(c => {
									const iconID = c.icon.match(/:([0-9]*)>/)

									return {
										label: c.category,
										value: c.category,
										emoji: iconID ? {
											id: iconID[1],
											name: c.category
										} : {
											name: c.icon
										}
									}
								})
							}
						]
					}
				]
			}) as Message

			try {
				const selection = (await this.app.componentCollector.awaitClicks(botMessage.id, i => i.user.id === ctx.user.id, 40000))[0]
				const lbEmbed = new Embed()

				if (selection.values.includes('Richest Users')) {
					const top = await getTopPlayers(query, 'money')
					const users = await Promise.all(top.map(async p => ({
						row: p,
						user: await this.app.fetchUser(p.userId)
					})))
					lbEmbed.setTitle('Richest Players (Global)')
					lbEmbed.setDescription(users.map((u, i) => `${i + 1}. ${u.user ? `\`${u.user.username}#${u.user.discriminator}\`` : `<@${u.row.userId}>`} ${formatMoney(u.row.money)}`).join('\n'))

					await selection.editParent({
						content: '',
						embeds: [lbEmbed.embed],
						components: []
					})
				}
				else if (selection.values.includes('Highest Level')) {
					const top = await getTopPlayers(query, 'level')
					const users = await Promise.all(top.map(async p => ({
						row: p,
						user: await this.app.fetchUser(p.userId)
					})))
					lbEmbed.setTitle('Highest Level Players (Global)')
					lbEmbed.setDescription(users.map((u, i) => `${i + 1}. ${u.user ? `\`${u.user.username}#${u.user.discriminator}\`` : `<@${u.row.userId}>`} Lvl. **${u.row.level}**`).join('\n'))

					await selection.editParent({
						content: '',
						embeds: [lbEmbed.embed],
						components: []
					})
				}
				else if (selection.values.includes('Quest Completions')) {
					const top = await getTopPlayers(query, 'questsCompleted')
					const users = await Promise.all(top.map(async p => ({
						row: p,
						user: await this.app.fetchUser(p.userId)
					})))
					lbEmbed.setTitle('Most Quest Completions (Global)')
					lbEmbed.setDescription(users.map((u, i) => `${i + 1}. ${u.user ? `\`${u.user.username}#${u.user.discriminator}\`` : `<@${u.row.userId}>`} **${u.row.questsCompleted}** quests completed`).join('\n'))

					await selection.editParent({
						content: '',
						embeds: [lbEmbed.embed],
						components: []
					})
				}
				else if (selection.values.includes('Player Kills')) {
					const top = await getTopPlayers(query, 'kills')
					const users = await Promise.all(top.map(async p => ({
						row: p,
						user: await this.app.fetchUser(p.userId)
					})))
					lbEmbed.setTitle('Most Player Kills (Global)')
					lbEmbed.setDescription(users.map((u, i) => `${i + 1}. ${u.user ? `\`${u.user.username}#${u.user.discriminator}\`` : `<@${u.row.userId}>`} **${u.row.kills}** players killed`).join('\n'))

					await selection.editParent({
						content: '',
						embeds: [lbEmbed.embed],
						components: []
					})
				}
				else if (selection.values.includes('Mob Kills')) {
					const top = await getTopPlayers(query, 'npcKills')
					const users = await Promise.all(top.map(async p => ({
						row: p,
						user: await this.app.fetchUser(p.userId)
					})))
					lbEmbed.setTitle('Most Mob Kills (Global)')
					lbEmbed.setDescription(users.map((u, i) => `${i + 1}. ${u.user ? `\`${u.user.username}#${u.user.discriminator}\`` : `<@${u.row.userId}>`} **${u.row.npcKills}** mob killed`).join('\n'))

					await selection.editParent({
						content: '',
						embeds: [lbEmbed.embed],
						components: []
					})
				}
				else if (selection.values.includes('Boss Kills')) {
					const top = await getTopPlayers(query, 'bossKills')
					const users = await Promise.all(top.map(async p => ({
						row: p,
						user: await this.app.fetchUser(p.userId)
					})))
					lbEmbed.setTitle('Most Boss Kills (Global)')
					lbEmbed.setDescription(users.map((u, i) => `${i + 1}. ${u.user ? `\`${u.user.username}#${u.user.discriminator}\`` : `<@${u.row.userId}>`} **${u.row.bossKills}** bosses killed`).join('\n'))

					await selection.editParent({
						content: '',
						embeds: [lbEmbed.embed],
						components: []
					})
				}
				else if (selection.values.includes('Most Deaths')) {
					const top = await getTopPlayers(query, 'deaths')
					const users = await Promise.all(top.map(async p => ({
						row: p,
						user: await this.app.fetchUser(p.userId)
					})))
					lbEmbed.setTitle('Most Deaths (Global)')
					lbEmbed.setDescription(users.map((u, i) => `${i + 1}. ${u.user ? `\`${u.user.username}#${u.user.discriminator}\`` : `<@${u.row.userId}>`} **${u.row.deaths}** deaths`).join('\n'))

					await selection.editParent({
						content: '',
						embeds: [lbEmbed.embed],
						components: []
					})
				}
			}
			catch (err) {
				await botMessage.edit({
					content: `${icons.warning} Buttons timed out.`,
					components: disableAllComponents(botMessage.components)
				})
			}
		}
	}
}

export default LeaderboardCommand
