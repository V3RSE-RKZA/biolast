import { Command } from '../types/Commands'
import { reply } from '../utils/messageUtils'
import Embed from '../structures/Embed'
import { adminUsers } from '../config'
import { formatTime } from '../utils/db/cooldowns'
import { ComponentType } from 'slash-create'

export const command: Command = {
	name: 'help',
	aliases: [],
	examples: ['help inventory'],
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

		const raidCommandsEmb = new Embed()
			.setTitle('Raid Commands')
			.setDescription(`Use \`${prefix}help <command>\` to see more about a specific command. You can also hover your mouse over the command for a short description.\n\n` +
				`${app.commands.filter(cmd => cmd.category !== 'admin' && cmd.canBeUsedInRaid).map(cmd => `[\`${cmd.name}\`](https://youtu.be/25UsfHO5JwI '${cmd.shortDescription}')`).join(', ')}`)

		const commands = new Embed()
			.setTitle('Commands')
			.setDescription(`Use \`${prefix}help <command>\` to see more about a specific command. You can also hover your mouse over the command for a short description.\n\n` +
				`${app.commands.filter(cmd => cmd.category !== 'admin' && !cmd.onlyWorksInRaidGuild).map(cmd => `[\`${cmd.name}\`](https://youtu.be/25UsfHO5JwI '${cmd.shortDescription}')`).join(', ')}`)

		const itemsEmbed = new Embed()
			.setTitle('How to get items?')
			.setDescription('The primary way to get more loot is by entering a **raid**. Raids are locations you *and other players* can explore for loot.' +
				'\n\nYou can enter a raid using the `raid` command, make sure you\'re well equipped and have all the items you want to take with you in your **inventory** as the items in your stash ' +
				' won\'t be accessible while in a raid.\n\nIn raid, you\'ll be able to use the `scavenge` command in a channel to look for items. You can also `search` for threats in a channel such as walkers or raiders.' +
				' When you find a threat, you can use your equipped weapon to fight them using the `attack` command. If you kill a walker or raider, they will drop their weapon, armor, and some items onto the ground.' +
				'\n\n**Be careful in raids, other players might see you as a threat and attack you for your items.** If you die in a raid, you\'ll lose all the items in your **inventory**, the items in your stash will be fine though.')

		const damageEmbed = new Embed()
			.setTitle('How is damage calculated?')
			.setDescription(`Weapons are classified as either melee or ranged. If your weapon is melee, you can view how much damage it does by checking the item stats: \`${prefix}item <item name>\`` +
				'\n\nIf however you are trying to check how much damage a ranged weapon will deal, you\'ll need to instead check how much damage the **ammo** your using deals. This is because **damage with ranged weapons' +
				' is entirely dependent on the ammo used**.\n\nArmor may also affect how much damage you deal, **if the ammo your using has a lower penetration level than the armor level the target is wearing, your damage will' +
				' be reduced**. If your ammo has a higher penetration level than the armor level your target is wearing, you will deal full damage.\n\nHitting certain body parts will also determine your damage. A hit to the target\'s head' +
				' will deal double the damage (assuming they aren\'t wearing a helmet) but is obviously harder to hit. A hit to the chest will deal normal damage and is the easiest body part to hit.' +
				' A hit to the arms or legs deals half damage but you also avoid hitting any armor the target is wearing. **Your ability to successfully hit a targeted limb when using the `attack` command is dependent on your' +
				' weapon\'s accuracy.**')

		const botMessage = await reply(message, {
			content: 'What do you need help with?',
			components: [
				{
					type: ComponentType.ACTION_ROW,
					components: [
						{
							type: ComponentType.SELECT,
							custom_id: 'help-command',
							options: [
								{
									label: 'Commands',
									value: 'commands',
									description: 'Commands that only work when out of raid'
								},
								{
									label: 'Raid Commands',
									value: 'raid-commands',
									description: 'Commands that can be used while in raid'
								},
								{
									label: 'What is a raid?',
									value: 'how-to-raid',
									description: ''
								},
								{
									label: 'How is damage calculated?',
									value: 'damage',
									description: ''
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
				if (ctx.values.includes('raid-commands')) {
					await ctx.editParent({
						content: '',
						embeds: [raidCommandsEmb.embed]
					})
				}
				else if (ctx.values.includes('commands')) {
					await ctx.editParent({
						content: '',
						embeds: [commands.embed]
					})
				}
				else if (ctx.values.includes('how-to-raid')) {
					await ctx.editParent({
						content: '',
						embeds: [itemsEmbed.embed]
					})
				}
				else if (ctx.values.includes('damage')) {
					await ctx.editParent({
						content: '',
						embeds: [damageEmbed.embed]
					})
				}
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
