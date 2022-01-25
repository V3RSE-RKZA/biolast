import { CommandOptionType, SlashCreator, CommandContext, ComponentType, Message } from 'slash-create'
import App from '../app'
import { icons } from '../config'
import { allLocations } from '../resources/locations'
import Corrector from '../structures/Corrector'
import CustomSlashCommand from '../structures/CustomSlashCommand'
import Embed from '../structures/Embed'
import { query } from '../utils/db/mysql'
import { getUserRow } from '../utils/db/players'
import { logger } from '../utils/logger'
import { disableAllComponents } from '../utils/messageUtils'
import { combineArrayWithOr } from '../utils/stringUtils'

const waveID = icons.wave.match(/:([0-9]*)>/)
const faq: { question: string, answer: string }[] = [
	{
		question: 'How do I play/progress?',
		answer: 'You need to scavenge your region for weapons, armor, and other equipment that could help you survive.' +
			' **To start scavenging, use the `/scavenge` command**. You\'ll be prompted to choose which area in your region you want to scavenge.' +
			' Some areas are patrolled by mobs such as walkers that you\'ll need to kill before you can search that area. **If you\'re' +
			' just starting out, you should stick to the areas that aren\'t guarded so that you can gear up**.\n\nOnce you think you have enough' +
			' gear from scavenging, you can attempt the **boss fight**. Boss fights allow you to team with up to **2** friends to take down a' +
			' powerful mob. **By defeating the boss, you and your friends will unlock a new region to explore**. The regions you unlock will' +
			' have better weapons and gear, as well as more powerful mobs to fight. The boss of each area is different and will require you' +
			' to plan the fight. Use `/boss` to attempt the fight.\n\nFighting bosses and scavenging are the main ways to get gear, but you could also progress by using outside sources' +
			' such as a `/companion`, the `/market`, trading with other players, or the `/merchant`.'
	},
	{
		question: 'How do I level up?',
		answer: `You will gain ${icons.xp_star} **XP** when you scavenge, win fights, or complete quests. **Completing quests is the fastest way to gain XP**.` +
			'\n\nYou can view your level progress by using `/level`, `/profile`, or `/inventory`.'
	},
	{
		question: 'How do I heal?',
		answer: 'While in a duel, you can click the "Use Medical Item" to use a healing item from your inventory.' +
			'\n\nIf you aren\'t in a duel, you can use a medical item to heal with `/heal <item id>`. You will also heal passively for **5 health** every **5 minutes**.'
	},
	{
		question: 'How do I increase storage space?',
		answer: 'You can equip a backpack to increase your inventory space. Backpacks of varying levels can be found from scavenging or bought from the shop.' +
			' Once you have one, simply do `/equip <item id>` to equip the backpack.' +
			'\n\nStash space cannot be altered with backpacks, instead stash space will increase by **5** each time you level up.'
	},
	{
		question: 'Any tips for winning fights?',
		answer: 'If the mob you are planning to fight is wearing armor, be sure to check how good the armor is with `/item info <item name>` and verify' +
			' that the weapon you have will penetrate their armor or at least get close. Armor drastically reduces damage from weapons with a low penetration level.' +
			'\n\nIf you plan on healing during a 1v1 fight, make sure the medical item you are going to use heals for at least more damage than the mob/player will hit you for.' +
			' It\'s pointless to heal using a medical item that doesn\'t heal more than their damage because you will still lose health when they attack you' +
			' (this tip only applies to 1v1 duels, not boss fights where your friends are helping you).' +
			'\n\nIf you plan on using a stimulant, use it at the very start of a fight. Stimulants last the entire duel, so using it after a few turns' +
			' would be a waste.'
	},
	{
		question: 'Complex - How is damage calculated?',
		answer: 'Weapons are classified as either melee or ranged. If your weapon is melee, you can view how much damage it does by checking the item stats: `/item <item name>`' +
			'\n\nIf however you are trying to check how much damage a ranged weapon will deal, you\'ll need to instead check how much damage the **ammo** your using deals. This is because **damage with ranged weapons' +
			' is entirely dependent on the ammo used**.\n\nArmor may also affect how much damage you deal, **if the ammo your using has a lower penetration level than the armor level the target is wearing, your damage will' +
			' be reduced**. If your ammo has a higher penetration level than the armor level your target is wearing, you will deal full damage.\n\nHitting certain body parts will also determine your damage. A hit to the target\'s head' +
			' will deal 1.5x damage (assuming they aren\'t wearing a helmet) but is obviously harder to hit. A hit to the chest will deal normal damage and is the easiest body part to hit.' +
			' A hit to the arms or legs deals half damage but you also avoid hitting any armor the target is wearing. **Your ability to successfully hit a targeted limb is dependent on your' +
			' weapon\'s accuracy.** If your weapon has less than **50%** accuracy, you won\'t be able to target a limb.'
	}
]

class HelpCommand extends CustomSlashCommand<'help'> {
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
			category: 'other',
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

			if (!cmd) {
				await ctx.send({
					content: `${icons.danger} That command doesn't exist!`
				})

				return
			}

			const cmdEmbed = new Embed()
				.setTitle(`🔎 ${cmd.commandName}`)
				.setDescription(cmd.customOptions.longDescription)
				.addField('Can be used while in a duel?', cmd.customOptions.worksDuringDuel ? 'Yes' : 'No')

			if (cmd.customOptions.minimumLocationLevel) {
				const locationUnlocked = allLocations.filter(l => l.locationLevel === (cmd!.customOptions.minimumLocationLevel))
				const regionsDisplay = combineArrayWithOr(locationUnlocked.map(l => `**${l.display}**`))

				cmdEmbed.addField('Region Requirement', `This command is unlocked once you discover ${regionsDisplay} (Region tier **${cmd.customOptions.minimumLocationLevel}**)`)
			}
			else {
				cmdEmbed.addField('Region Requirement', 'This command is always unlocked.')
			}

			await ctx.send({
				embeds: [cmdEmbed.embed]
			})
			return
		}

		const userData = (await getUserRow(query, ctx.user.id))!
		const allCommands = Array.from(this.app.slashCreator.commands.values()) as CustomSlashCommand[]
		const tierUnlocked = allCommands.filter(c => !c.customOptions.minimumLocationLevel)
		const tierLocked = allCommands.filter(c => c.customOptions.minimumLocationLevel).reduce<{ [key: string]: CustomSlashCommand[] }>((prev, curr) => {
			if (prev[curr.customOptions.minimumLocationLevel!]) {
				prev[curr.customOptions.minimumLocationLevel!] = [...prev[curr.customOptions.minimumLocationLevel!], curr]
			}
			else {
				prev[curr.customOptions.minimumLocationLevel!] = [curr]
			}
			return prev
		}, {})
		const progressionCmds = tierUnlocked.filter(c => c.customOptions.category === 'scavenging').map(c => this.getCommandDisplay(c))
		const infoCmds = tierUnlocked.filter(c => c.customOptions.category === 'info').map(c => this.getCommandDisplay(c))
		const tradeCmds = tierUnlocked.filter(c => c.customOptions.category === 'trading').map(c => this.getCommandDisplay(c))
		const equipCmds = tierUnlocked.filter(c => c.customOptions.category === 'equipment').map(c => this.getCommandDisplay(c))
		const lockedCmds = Object.keys(tierLocked).map(reg =>
			`${userData.locationLevel >= parseInt(reg) ? '🔓' : '🔒'} [Region Tier **${reg}**] ${tierLocked[reg].map(c => this.getCommandDisplay(c)).join(', ')}`
		)

		const commandsEmb = new Embed()
			.setTitle('What are the commands?')
			.setDescription('Use `/help <command>` to see more about a specific command. You can also hover your mouse over the command for a short description.')
			.addField('☠️ Scavenging & Progression', `Defeat the region boss to be able to travel to the next region:\n\n${progressionCmds.join(', ')}`)
			.addField('📋 Player Information', infoCmds.join(', '))
			.addField(`${icons.copper} Trading Commands`, tradeCmds.join(', '))
			.addField('🧤 Equipment Commands', equipCmds.join(', '))
			.addBlankField()
			.addField('Region Locked Commands', `Unlock these commands by reaching a new region (you are region tier **${userData.locationLevel}**):\n\n${lockedCmds.join('\n')}`)

		const botMessage = await ctx.send({
			content: 'What do you need help with?',
			embeds: [commandsEmb.embed],
			components: [
				{
					type: ComponentType.ACTION_ROW,
					components: [
						{
							type: ComponentType.SELECT,
							custom_id: 'help-command',
							placeholder: 'Frequently Asked Questions:',
							options: [
								{
									label: 'What are the commands?',
									value: 'commands',
									description: '',
									emoji: waveID ? {
										id: waveID[1],
										name: 'wave'
									} : undefined
								},
								...faq.map(q => ({
									label: q.question,
									value: q.question,
									description: `${q.answer.replace(/<a?:.*:(\d+)>?|((_|\*|~|\|){2})|`/g, '').slice(0, 40)}…`
								}))
							]
						}
					]
				}
			]
		}) as Message

		const { collector } = this.app.componentCollector.createCollector(botMessage.id, c => c.user.id === ctx.user.id, 60000)

		collector.on('collect', async c => {
			try {
				await c.acknowledge()

				if (c.values.includes('commands')) {
					await c.editParent({
						content: '',
						embeds: [commandsEmb.embed],
						components: [
							{
								type: ComponentType.ACTION_ROW,
								components: [
									{
										type: ComponentType.SELECT,
										custom_id: 'help-command',
										placeholder: 'Frequently Asked Questions:',
										options: [
											{
												label: 'What are the commands?',
												value: 'commands',
												description: '',
												emoji: waveID ? {
													id: waveID[1],
													name: 'wave'
												} : undefined
											},
											...faq.map(q => ({
												label: q.question,
												value: q.question,
												description: `${q.answer.replace(/<a?:.*:(\d+)>?|((_|\*|~|\|){2})|`/g, '').slice(0, 40)}…`
											}))
										]
									}
								]
							}
						]
					})
				}
				else {
					const faqQuestion = faq.find(q => q.question === c.values[0])

					if (faqQuestion) {
						const qEmbed = new Embed()
							.setTitle(faqQuestion.question)
							.setDescription(faqQuestion.answer)

						await c.editParent({
							content: '',
							embeds: [qEmbed.embed],
							components: [
								{
									type: ComponentType.ACTION_ROW,
									components: [
										{
											type: ComponentType.SELECT,
											custom_id: 'help-command',
											placeholder: 'Frequently Asked Questions:',
											options: [
												{
													label: 'What are the commands?',
													value: 'commands',
													description: ''
												},
												...faq.map(q => ({
													label: q.question,
													value: q.question,
													description: `${q.answer.replace(/<a?:.*:(\d+)>?|((_|\*|~|\|){2})|`/g, '').slice(0, 40)}…`,
													emoji: waveID && faqQuestion.question === q.question ? {
														id: waveID[1],
														name: 'wave'
													} : undefined
												}))
											]
										}
									]
								}
							]
						})
					}
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
						components: disableAllComponents(botMessage.components)
					})
				}
			}
			catch (err) {
				logger.warn(err)
			}
		})
	}

	getCommandDisplay (cmd: CustomSlashCommand): string {
		if (!cmd.options || !cmd.options.length) {
			return `[\`${cmd.commandName}\`](https://youtu.be/hnVhYwYuqcM '${cmd.description}')`
		}

		const optionsDisplay = []

		for (const opt of cmd.options) {
			if (opt.type === CommandOptionType.SUB_COMMAND) {
				optionsDisplay.push(opt.name)
			}
		}

		return `[\`${cmd.commandName}${optionsDisplay.length ? ` ${optionsDisplay.join('/')}` : ''}\`](https://youtu.be/hnVhYwYuqcM '${cmd.description}')`
	}
}

export default HelpCommand
