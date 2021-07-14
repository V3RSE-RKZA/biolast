import { Command } from '../types/Commands'
import { reply } from '../utils/messageUtils'
import Embed from '../structures/Embed'
import { adminUsers } from '../config'
import { formatTime } from '../utils/db/cooldowns'
import { isRaidGuild } from '../utils/raidUtils'

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
				cmdEmbed.addField('Usage Examples', cmd.examples.map(example => `\`${prefix}${example}\``).join(', '), true)
			}

			cmdEmbed.addField('Cooldown', formatTime(cmd.cooldown * 1000), true)
			cmdEmbed.addField('Can be used in raid?', cmd.onlyWorksInRaidGuild ? 'Only works while in raid' : cmd.canBeUsedInRaid ? 'Yes' : 'No')

			await reply(message, {
				embed: cmdEmbed.embed
			})
			return
		}

		const cmdEmbed = new Embed()
			.setDescription(`Use \`${prefix}help <command>\` to see more about a specific command. You can also hover your mouse over the command for a short description.`)

		const isRaid = isRaidGuild(message.guildID)
		const infoCommands = app.commands.filter(cmd => cmd.category === 'info').map(cmd => formatCommand(cmd, isRaid))
		const itemCommands = app.commands.filter(cmd => cmd.category === 'items').map(cmd => formatCommand(cmd, isRaid))
		const utilityCommands = app.commands.filter(cmd => cmd.category === 'utility').map(cmd => formatCommand(cmd, isRaid))

		cmdEmbed.addField('📋 Information', infoCommands.join(', '))
		cmdEmbed.addField('⚔️ Item Usage', itemCommands.join(', '))
		cmdEmbed.addField('⚙️ Utility', utilityCommands.join(', '))

		await reply(message, {
			embed: cmdEmbed.embed
		})
	}
}

function formatCommand (cmd: Command, raidGuild: boolean): string {
	if (raidGuild) {
		return cmd.onlyWorksInRaidGuild || cmd.canBeUsedInRaid ? `[\`${cmd.name}\`](https://youtu.be/0lvPMdMtsGU '${cmd.shortDescription}')` : `~~[\`${cmd.name}\`](https://youtu.be/0lvPMdMtsGU '${cmd.shortDescription}')~~`
	}

	return !cmd.onlyWorksInRaidGuild ? `[\`${cmd.name}\`](https://youtu.be/0lvPMdMtsGU '${cmd.shortDescription}')` : `~~[\`${cmd.name}\`](https://youtu.be/0lvPMdMtsGU '${cmd.shortDescription}')~~`
}
