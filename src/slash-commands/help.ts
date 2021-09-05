import { CommandOptionType, SlashCreator, CommandContext, ComponentType, Message } from 'slash-create'
import App from '../app'
import { adminUsers } from '../config'
import CustomSlashCommand from '../structures/CustomSlashCommand'
import Embed from '../structures/Embed'

class HelpCommand extends CustomSlashCommand {
	constructor (creator: SlashCreator, app: App) {
		super(creator, app, {
			name: 'help',
			description: 'Your guide to surviving the apocalypse.',
			longDescription: 'helpception',
			options: [{
				type: CommandOptionType.STRING,
				name: 'command',
				description: 'Command name to get information for.',
				required: false
			}],
			category: 'info',
			guildModsOnly: false,
			worksInDMs: true,
			onlyWorksInRaidGuild: false,
			canBeUsedInRaid: true,
			guildIDs: []
		})

		this.filePath = __filename
	}

	async run (ctx: CommandContext): Promise<void> {
		const command = ctx.options.command

		if (command) {
			const cmd = this.app.slashCreator.commands.find(c => c.commandName === command) as CustomSlashCommand | undefined

			if (!cmd || (cmd.customOptions.category === 'admin' && !adminUsers.includes(ctx.user.id))) {
				await ctx.send({
					content: '❌ That command doesn\'t exist!'
				})
				return
			}

			const cmdEmbed = new Embed()
				.setTitle(`🔎 ${cmd.commandName}`)
				.setDescription(cmd.customOptions.longDescription)

			/* Maybe ill add these back at some point
			if (cmd.examples.length) {
				cmdEmbed.addField('Usage Examples', cmd.examples.map(example => `\`${prefix}${example}\``).join('\n'), true)
			}

			cmdEmbed.addField('Cooldown', formatTime(cmd.cooldown * 1000), true)
			*/

			cmdEmbed.addField('Can be used in raid?', cmd.customOptions.onlyWorksInRaidGuild ? 'Only works while in raid' : cmd.customOptions.canBeUsedInRaid ? 'Yes' : 'No')

			await ctx.send({
				embeds: [cmdEmbed.embed]
			})
			return
		}

		const raidCommandsEmb = new Embed()
			.setTitle('What commands can be used while in a raid?')
			.setDescription('Use `/help <command>` to see more about a specific command. You can also hover your mouse over the command for a short description.')
			.addField(
				'Commands that ONLY work in a raid:',
				this.app.slashCreator.commands
					.filter(cmd => (cmd as CustomSlashCommand).customOptions.category !== 'admin' && (cmd as CustomSlashCommand).customOptions.onlyWorksInRaidGuild)
					.map(cmd => `[\`${cmd.commandName}\`](https://youtu.be/25UsfHO5JwI '${cmd.description}')`)
					.join(', ')
			)
			.addField(
				'Commands that can be used in AND out of a raid:',
				this.app.slashCreator.commands
					.filter(cmd => (cmd as CustomSlashCommand).customOptions.category !== 'admin' && (cmd as CustomSlashCommand).customOptions.canBeUsedInRaid && !(cmd as CustomSlashCommand).customOptions.onlyWorksInRaidGuild)
					.map(cmd => `[\`${cmd.commandName}\`](https://youtu.be/25UsfHO5JwI '${cmd.description}')`)
					.join(', ')
			)
			.addField(
				'The following CAN\'T be used in raid:',
				this.app.slashCreator.commands
					.filter(cmd => (cmd as CustomSlashCommand).customOptions.category !== 'admin' && !(cmd as CustomSlashCommand).customOptions.canBeUsedInRaid)
					.map(cmd => `[\`${cmd.commandName}\`](https://youtu.be/25UsfHO5JwI '${cmd.description}')`)
					.join(', ')
			)

		const itemsEmbed = new Embed()
			.setTitle('What is a raid?')
			.setDescription('The primary way to get more loot is by entering a **raid**. Raids are locations you *and other players* can explore for loot.' +
				'\n\nYou can enter a raid using the `raid` command, make sure you\'re well equipped and have all the items you want to take with you in your **inventory** as the items in your stash ' +
				' won\'t be accessible while in a raid.\n\nIn raid, you\'ll be able to use the `scavenge` command in a channel to look for items. You can also `search` for threats in a channel such as walkers or raiders.' +
				' When you find a threat, you can use your equipped weapon to fight them using the `attack` command. If you kill a walker or raider, they will drop their weapon, armor, and some items onto the ground.' +
				'\n\n**Be careful in raids, other players might see you as a threat and attack you for your items.** If you die in a raid, you\'ll lose all the items in your **inventory**, the items in your stash will be fine though.')

		const damageEmbed = new Embed()
			.setTitle('How is damage calculated?')
			.setDescription('Weapons are classified as either melee or ranged. If your weapon is melee, you can view how much damage it does by checking the item stats: `/item <item name>`' +
				'\n\nIf however you are trying to check how much damage a ranged weapon will deal, you\'ll need to instead check how much damage the **ammo** your using deals. This is because **damage with ranged weapons' +
				' is entirely dependent on the ammo used**.\n\nArmor may also affect how much damage you deal, **if the ammo your using has a lower penetration level than the armor level the target is wearing, your damage will' +
				' be reduced**. If your ammo has a higher penetration level than the armor level your target is wearing, you will deal full damage.\n\nHitting certain body parts will also determine your damage. A hit to the target\'s head' +
				' will deal double the damage (assuming they aren\'t wearing a helmet) but is obviously harder to hit. A hit to the chest will deal normal damage and is the easiest body part to hit.' +
				' A hit to the arms or legs deals half damage but you also avoid hitting any armor the target is wearing. **Your ability to successfully hit a targeted limb when using the `attack` command is dependent on your' +
				' weapon\'s accuracy.**')

		const healEmbed = new Embed()
			.setTitle('How do I heal?')
			.setDescription('If you find that you\'ve been attacked and need to replenish some health, you can use a **Medical** item to heal: `/heal <item id>`' +
				'\n\nIf you don\'t have any medical items on you, you can check the shop (`/shop view`) to see if any medical items are for sale. If all else fails, you ' +
				' will heal passively for **5 health** every **5 minutes** when out of raid.')

		const botMessage = await ctx.send({
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
									label: 'What commands can be used while in a raid?',
									value: 'raid-commands',
									description: ''
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
								},
								{
									label: 'How do I heal?',
									value: 'healing',
									description: ''
								}
							]
						}
					]
				}
			]
		}) as Message

		const { collector } = this.app.componentCollector.createCollector(botMessage.id, c => c.user.id === ctx.user.id, 60000)

		collector.on('collect', async c => {
			try {
				if (c.values.includes('raid-commands')) {
					await c.editParent({
						content: '',
						embeds: [raidCommandsEmb.embed]
					})
				}
				else if (c.values.includes('how-to-raid')) {
					await c.editParent({
						content: '',
						embeds: [itemsEmbed.embed]
					})
				}
				else if (c.values.includes('damage')) {
					await c.editParent({
						content: '',
						embeds: [damageEmbed.embed]
					})
				}
				else if (c.values.includes('healing')) {
					await c.editParent({
						content: '',
						embeds: [healEmbed.embed]
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

export default HelpCommand
