import { Command } from '../types/Commands'
import { reply } from '../utils/messageUtils'
import Embed from '../structures/Embed'
import { adminUsers } from '../config'
import { formatTime } from '../utils/db/cooldowns'
import { ComponentType } from 'slash-create'

export const command: Command = {
	name: 'help',
	aliases: [],
	examples: ['help backpack'],
	description: 'Shows all available commands.',
	shortDescription: 'Shows all available commands.',
	category: 'info',
	permissions: ['sendMessages', 'embedLinks'],
	cooldown: 2,
	worksInDMs: true,
	canBeUsedInRaid: true,
	onlyWorksInRaidGuild: false,
	guildModsOnly: false,
	async execute(app, message, { args, prefix }) {
		if (args[0]) {
			const cmd = app.commands.find(c => c.name === args[0] || (c.aliases.length && c.aliases.includes(args[0] ?? '')))

			if (!cmd || (cmd.category === 'admin' && !adminUsers.includes(message.author.id))) {
				await reply(message, '❌ That command doesn\'t exist!')
				return
			}

			const cmdEmbed = new Embed()
				.setTitle(`🔎 ${cmd.name}`)
				.setDescription(cmd.description)

			if (cmd.aliases.length) {
				cmdEmbed.addField('Aliases', cmd.aliases.map(alias => `\`${alias}\``).join(', '), true)
			}

			if (cmd.examples.length) {
				cmdEmbed.addField('Usage Examples', cmd.examples.map(example => `\`${prefix}${example}\``).join('\n'), true)
			}

			cmdEmbed.addField('Cooldown', formatTime(cmd.cooldown * 1000), true)
			cmdEmbed.addField('Can be used in raid?', cmd.onlyWorksInRaidGuild ? 'Only works while in raid' : cmd.canBeUsedInRaid ? 'Yes' : 'No')

			await reply(message, {
				embed: cmdEmbed.embed
			})
			return
		}

		const baseMessage = `Use \`${prefix}help <command>\` to see more about a specific command. You can also hover your mouse over the command for a short description.`
		const cmdEmbed = new Embed()

		const botMessage = await reply(message, {
			content: 'What kind of commands are you looking for?',
			components: [
				{
					type: ComponentType.ACTION_ROW,
					components: [
						{
							type: ComponentType.SELECT,
							custom_id: 'help-command',
							options: [
								{
									label: 'Raid Commands',
									value: 'raid',
									description: 'Commands that can be used while in a raid'
								},
								{
									label: 'Item Commands',
									value: 'items',
									description: 'Use your items with these commands'
								},
								{
									label: 'Information Commands',
									value: 'info',
									description: 'View item information, backpacks, health, etc.'
								}
							]
						}
					]
				}
			]
		})

		const { collector } = app.componentCollector.createCollector(botMessage.id, ctx => ctx.user.id === message.author.id, 60000)

		collector.on('collect', async ctx => {
			try {
				if (ctx.values.includes('raid')) {
					cmdEmbed.setTitle('Raid Commands')
					cmdEmbed.setDescription(`${baseMessage}\n\n${app.commands.filter(cmd => cmd.category !== 'admin' && cmd.canBeUsedInRaid).map(cmd => `[\`${cmd.name}\`](https://youtu.be/0lvPMdMtsGU '${cmd.shortDescription}')`).join(', ')}`)
				}
				else if (ctx.values.includes('items')) {
					cmdEmbed.setTitle('Item Usage')
					cmdEmbed.setDescription(`${baseMessage}\n\n${app.commands.filter(cmd => cmd.category === 'items' && !cmd.onlyWorksInRaidGuild).map(cmd => `[\`${cmd.name}\`](https://youtu.be/0lvPMdMtsGU '${cmd.shortDescription}')`).join(', ')}`)
				}
				else if (ctx.values.includes('info')) {
					cmdEmbed.setTitle('Information Commands')
					cmdEmbed.setDescription(`${baseMessage}\n\n${app.commands.filter(cmd => cmd.category === 'info' && !cmd.onlyWorksInRaidGuild).map(cmd => `[\`${cmd.name}\`](https://youtu.be/0lvPMdMtsGU '${cmd.shortDescription}')`).join(', ')}`)
				}

				await ctx.editParent({
					content: '',
					embeds: [cmdEmbed.embed]
				})
			}
			catch (err) {
				// continue
			}
		})

		collector.on('end', msg => {
			if (msg === 'time') {
				botMessage.edit({
					content: 'Help menu expired.',
					components: []
				})
			}
		})
	}
}
