import { CommandOptionType, SlashCreator, CommandContext, ComponentType, Message } from 'slash-create'
import App from '../app'
import { adminUsers, icons } from '../config'
import Corrector from '../structures/Corrector'
import CustomSlashCommand from '../structures/CustomSlashCommand'
import Embed from '../structures/Embed'
import { logger } from '../utils/logger'

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
			worksDuringDuel: true,
			guildIDs: []
		})

		this.filePath = __filename
	}

	async run (ctx: CommandContext): Promise<void> {
		const command = ctx.options.command

		if (command) {
			let cmd = this.app.slashCreator.commands.find(c => c.commandName === command) as CustomSlashCommand | undefined

			if (!cmd) {
				// try correcting command name
				const cmdCorrector = new Corrector(this.app.slashCreator.commands.map(c => c.commandName))
				const correctedCmd = cmdCorrector.getWord(command)

				cmd = this.app.slashCreator.commands.find(c => c.commandName === correctedCmd) as CustomSlashCommand | undefined
			}

			if (!cmd || (cmd.customOptions.category === 'admin' && !adminUsers.includes(ctx.user.id))) {
				await ctx.send({
					content: `${icons.danger} That command doesn't exist!`
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

			cmdEmbed.addField('Can be used while in a duel?', cmd.customOptions.worksDuringDuel ? 'Yes' : 'No')

			await ctx.send({
				embeds: [cmdEmbed.embed]
			})
			return
		}

		const commandsEmb = new Embed()
			.setTitle('What are the commands?')
			.setDescription('Use `/help <command>` to see more about a specific command. You can also hover your mouse over the command for a short description.' +
				`\n\n${this.app.slashCreator.commands
					.filter(cmd => (cmd as CustomSlashCommand).customOptions.category !== 'admin')
					.map(cmd => `[\`${cmd.commandName}\`](https://youtu.be/hnVhYwYuqcM '${cmd.description}')`)
					.join(', ')}`)

		const damageEmbed = new Embed()
			.setTitle('How is damage calculated?')
			.setDescription('Weapons are classified as either melee or ranged. If your weapon is melee, you can view how much damage it does by checking the item stats: `/item <item name>`' +
				'\n\nIf however you are trying to check how much damage a ranged weapon will deal, you\'ll need to instead check how much damage the **ammo** your using deals. This is because **damage with ranged weapons' +
				' is entirely dependent on the ammo used**.\n\nArmor may also affect how much damage you deal, **if the ammo your using has a lower penetration level than the armor level the target is wearing, your damage will' +
				' be reduced**. If your ammo has a higher penetration level than the armor level your target is wearing, you will deal full damage.\n\nHitting certain body parts will also determine your damage. A hit to the target\'s head' +
				' will deal 1.5x damage (assuming they aren\'t wearing a helmet) but is obviously harder to hit. A hit to the chest will deal normal damage and is the easiest body part to hit.' +
				' A hit to the arms or legs deals half damage but you also avoid hitting any armor the target is wearing. **Your ability to successfully hit a targeted limb is dependent on your' +
				' weapon\'s accuracy.**')

		const healEmbed = new Embed()
			.setTitle('How do I heal?')
			.setDescription('While in a duel, you can click the "Use Medical Item" to use a healing item from your inventory.' +
				'\n\nIf you aren\'t in a duel, you can use a medical item to heal with `/heal <item id>`. You will also heal passively for **5 health** every **5 minutes**.')

		const storageEmbed = new Embed()
			.setTitle('How do I increase storage space?')
			.setDescription('You can equip a backpack to increase your inventory space. Backpacks of varying levels can be found from scavenging or bought from the shop.' +
				' Once you have one, simply do `/equip <item id>` to equip the backpack.\n\nStash space cannot be altered with backpacks, instead stash space will increase by **5** each time you level up.')


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
									label: 'What are the commands?',
									value: 'commands',
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
								},
								{
									label: 'How do I increase storage space?',
									value: 'storage',
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
				if (c.values.includes('commands')) {
					await c.editParent({
						content: '',
						embeds: [commandsEmb.embed]
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
				else if (c.values.includes('storage')) {
					await c.editParent({
						content: '',
						embeds: [storageEmbed.embed]
					})
				}
			}
			catch (err) {
				// continue
			}
		})

		collector.on('end', async msg => {
			try {
				if (msg === 'time') {
					await botMessage.edit({
						content: 'Help menu expired.',
						components: []
					})
				}
			}
			catch (err) {
				logger.warn(err)
			}
		})
	}
}

export default HelpCommand
