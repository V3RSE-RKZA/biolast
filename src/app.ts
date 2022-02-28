import Eris, { User, Member, Guild, Constants } from 'eris'
import { SlashCreator, GatewayServer, AnyRequestData, CommandContext, InteractionRequestData, InteractionResponseFlags, InteractionResponseType, InteractionType, MessageOptions } from 'slash-create'
import { TextCommand } from './types/Commands'
import MessageCollector from './utils/MessageCollector'
import ComponentCollector from './utils/ComponentCollector'
import CronJobs from './utils/CronJobs'
import { clientId, botToken, icons, shopSellMultiplier } from './config'
import fs from 'fs'
import path from 'path'
import { query } from './utils/db/mysql'
import { addItemToBackpack, createItem } from './utils/db/items'
import CustomSlashCommand from './structures/CustomSlashCommand'
import { createAccount, createStarterTipsRow, getUserRow, getUserTipsRow, increaseLevel, setStashSlots, setUserStarterTip } from './utils/db/players'
import { items } from './resources/items'
import { getPlayerXp } from './utils/playerUtils'
import { getItemDisplay } from './utils/itemUtils'
import { messageUser } from './utils/messageUtils'
import { logger } from './utils/logger'
import getRandomInt from './utils/randomInt'
import { EventHandler } from './types/Events'
import { CommandsWithStarterTip } from './utils/constants'
import { UserStarterTipsRow } from './types/mysql'

class App {
	bot: Eris.Client
	commands: TextCommand[]
	slashCreator: SlashCreator
	componentCollector: ComponentCollector
	msgCollector: MessageCollector
	cronJobs: CronJobs
	acceptingCommands: boolean
	/**
	 * The current multiplier for selling items to the shop (changes every hour)
	 */
	currentShopSellMultiplier: number
	channelsWithActiveDuel: Set<string>

	constructor (token: string, options: Eris.ClientOptions) {
		if (!clientId) {
			throw new Error('BOT_CLIENT_ID not defined in .env file')
		}

		this.bot = new Eris.Client(token, options)
		this.commands = []
		this.slashCreator = new SlashCreator({
			applicationID: clientId,
			token: botToken,
			handleCommandsManually: true,
			allowedMentions: {
				roles: false,
				users: true,
				everyone: false
			}
		})
		this.componentCollector = new ComponentCollector(this)
		this.msgCollector = new MessageCollector(this)
		this.cronJobs = new CronJobs(this)
		this.acceptingCommands = false
		this.currentShopSellMultiplier = getRandomInt(shopSellMultiplier.min, shopSellMultiplier.max) / 100
		this.channelsWithActiveDuel = new Set()
	}

	async launch (): Promise<void> {
		const botEventFiles = fs.readdirSync(path.join(__dirname, '/events')).filter(file => file.endsWith('.js') || file.endsWith('.ts'))

		// load all commands to array
		this.commands = await this.loadCommands()

		// start cron jobs
		this.cronJobs.start()

		// start slash creator, used for handling interactions
		this.slashCreator.withServer(
			new GatewayServer(
				handler => this.bot.on('rawWS', packet => {
					if (packet.t === 'INTERACTION_CREATE') {
						handler(packet.d as AnyRequestData)
					}
				})
			)
		)

		await this.loadSlashCommmands()
		await query('UPDATE users SET fighting = 0 WHERE fighting = 1')

		// handling slash commands manually so I can filter them through my custom command handler
		this.slashCreator.on('commandInteraction', (i, res, webserverMode) => {
			if (!this.acceptingCommands) {
				return res({
					status: 200,
					body: {
						type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
						data: {
							content: `${icons.danger} The bot is currently restarting. Try using this command again in a minute or two...`,
							flags: InteractionResponseFlags.EPHEMERAL
						}
					}
				})
			}

			const command = this._getCommandFromInteraction(i)

			if (!command) {
				return res({
					status: 200,
					body: {
						type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
						data: {
							content: `${icons.danger} That command was recently removed.`,
							flags: InteractionResponseFlags.EPHEMERAL
						}
					}
				})
			}

			const ctx = new CommandContext(this.slashCreator, i, res, webserverMode, command.deferEphemeral)

			return this._handleSlashCommand(command, ctx)
		})

		// add users who use slash commands to the eris cache if they aren't already
		// this helps prevent API calls to fetch users
		this.slashCreator.on('rawInteraction', interaction => {
			if (interaction.type === InteractionType.APPLICATION_COMMAND) {
				let user

				if ('guild_id' in interaction) {
					user = interaction.member.user
				}
				else {
					user = interaction.user
				}

				// check if user is not in eris cache, and
				// add user to eris cache if not
				if (!this.bot.users.has(user.id)) {
					const erisUser = new User(Object.freeze(user), this.bot)

					this.bot.users.add(erisUser, this.bot)
				}
			}
		})

		this.slashCreator.on('debug', msg => {
			logger.debug(msg)
		})

		// load bot gateway events
		for (const event of botEventFiles) {
			let eventHandler = await import(`./events/${event}`) as EventHandler | { default: EventHandler }

			if ('default' in eventHandler) {
				eventHandler = eventHandler.default
			}

			if (eventHandler.name === 'ready') {
				// using .once here because the ready event is called every time the bot reconnects and we may have functions
				// inside the ready event that we want called only once.
				this.bot.once(eventHandler.name, eventHandler.run.bind(this))
			}
			else {
				this.bot.on(eventHandler.name, eventHandler.run.bind(this))
			}
		}

		this.bot.editStatus('online', {
			name: '/help',
			type: 0
		})

		logger.info('[APP] Listening for events')
		await this.bot.connect()
	}

	async loadCommands (): Promise<TextCommand[]> {
		const commandFiles = fs.readdirSync(path.join(__dirname, '/commands')).filter(file => file.endsWith('.js') || file.endsWith('.ts'))
		const commandsArr: TextCommand[] = []

		for (const file of commandFiles) {
			try {
				// remove command file cache so you can reload commands while bot is running: eval app.commands = app.loadCommands();
				delete require.cache[require.resolve(`./commands/${file}`)]
			}
			catch (err) {
				logger.warn(err)
			}

			const { command }: { command: TextCommand } = await import(`./commands/${file}`)

			commandsArr.push(command)
		}

		return commandsArr
	}

	async loadSlashCommmands (): Promise<void> {
		const botCommandFiles = fs.readdirSync(path.join(__dirname, '/slash-commands'))
		const commands = []

		for (const file of botCommandFiles) {
			if (file.endsWith('.js') || file.endsWith('.ts')) {
				const command = await import(`./slash-commands/${file}`)

				commands.push(new command.default(this.slashCreator, this))
			}
			else if (!file.endsWith('.map')) {
				const directory = fs.readdirSync(path.join(__dirname, `/slash-commands/${file}`)).filter(f => f.endsWith('.js'))

				for (const subFile of directory) {
					const command = await import(`./slash-commands/${file}/${subFile}`)

					commands.push(new command.default(this.slashCreator, this))
				}
			}
		}

		this.slashCreator
			.registerCommands(commands)
			.syncCommands()
	}

	/**
	 * Used to fetch a user from cache if possible, or makes an API call if not
	 * @param userID ID of user to fetch
	 * @returns A user object
	 */
	async fetchUser (userID: string): Promise<User | undefined> {
		let user = this.bot.users.get(userID)

		if (user) {
			return user
		}

		try {
			// fetch user using api call
			user = await this.bot.getRESTUser(userID)

			if (user) {
				// add fetched user to bots cache
				this.bot.users.add(user)

				return user
			}
		}
		catch (err) {
			logger.error(err)
		}
	}

	/**
	 * Fetches a member from a guilds cache if possible, or makes an API call if not
	 * @param guild Guild to check for member in
	 * @param userID ID of user to get member object of
	 * @returns A guild member object
	 */
	async fetchMember (guild: Guild, userID: string): Promise<Member | undefined> {
		let member = guild.members.get(userID)

		if (member) {
			return member
		}

		try {
			await guild.fetchAllMembers()

			member = guild.members.get(userID)

			if (member) {
				return member
			}
		}
		catch (err) {
			logger.error(err)
		}
	}

	private _getCommandFromInteraction (interaction: InteractionRequestData): CustomSlashCommand | undefined {
		// blatantly taken from the slash-create library since the function is marked as private
		return 'guild_id' in interaction ?
			this.slashCreator.commands.find(command =>
				!!(command.guildIDs &&
				command.guildIDs.includes(interaction.guild_id) &&
				command.commandName === interaction.data.name)) as CustomSlashCommand | undefined ||
				this.slashCreator.commands.get(`global:${interaction.data.name}`) as CustomSlashCommand | undefined :
			this.slashCreator.commands.get(`global:${interaction.data.name}`) as CustomSlashCommand | undefined
	}

	private async _handleSlashCommand (command: CustomSlashCommand, ctx: CommandContext) {
		try {
			let afterCommandMessage: MessageOptions | undefined

			// command was run in a server
			if (ctx.guildID) {
				const userData = await getUserRow(query, ctx.user.id)

				// check if user has manage server permission before running GuildModCommand
				if (command.customOptions.guildModsOnly && (!ctx.member || !ctx.member.permissions.has(Constants.Permissions.manageGuild))) {
					return ctx.send({
						content: `${icons.danger} You need the \`Manage Server\` permission to use this command!`,
						flags: InteractionResponseFlags.EPHEMERAL
					})
				}

				// create account if user does not have one
				else if (!userData) {
					await createAccount(query, ctx.user.id)

					const batRow = await createItem(query, items.wooden_bat.name, { durability: items.wooden_bat.durability })
					const ifakRow = await createItem(query, items.ifak_medkit.name, { durability: items.ifak_medkit.durability })

					await addItemToBackpack(query, ctx.user.id, batRow.id)
					await addItemToBackpack(query, ctx.user.id, ifakRow.id)

					// send welcome DM
					const erisUser = await this.fetchUser(ctx.user.id)
					if (erisUser) {
						messageUser(erisUser, {
							content: `${icons.biohazard} __**Welcome to Biolast**__` +
								'\nYou\'ve been holed up in your house for weeks since the start of an apocalypse. Unfortunately, supplies have started running low. ' +
								'You\'ll need to explore and search for useful items all while making sure you aren\'t killed. ' +
								'Find weapons and armor to protect yourself with, there are monsters around every corner.' +
								`\n\n*You grab the last of your supplies and head out the door:* **1x** ${getItemDisplay(items.wooden_bat)}, **1x** ${getItemDisplay(items.ifak_medkit)}` +
								'\n\n__**Game Mechanics**__' +
								'\nYou have a `stash` and an `inventory` for your items. Whenever you enter a fight, you will be able to use whatever items in your `inventory` to fight. ' +
								`${icons.warning} **If you die, you will lose all of the items in your inventory.**` +
								'\n\nUse the `/scavenge` command to start searching for loot. **Good luck!** - 💙 blobfysh'
						})
					}
				}

				else if (userData.fighting && !command.customOptions.worksDuringDuel) {
					return ctx.send({
						content: `${icons.danger} That command cannot be used while you are in a duel.`,
						flags: InteractionResponseFlags.EPHEMERAL
					})
				}
				else if (command.customOptions.minimumLocationLevel && userData.locationLevel < command.customOptions.minimumLocationLevel) {
					return ctx.send({
						content: `${icons.danger} You must reach region tier **${command.customOptions.minimumLocationLevel}** to use this command.` +
							' **You must defeat the boss of your current region to be able to travel to the next.**',
						flags: InteractionResponseFlags.EPHEMERAL
					})
				}

				else {
					// check if user has enough xp to level up
					let playerXp = getPlayerXp(userData.xp, userData.level)
					let newLevel = userData.level

					// check if user levels up multiple times (prevents sending multiple level-up messages)
					while (playerXp.xpUntilLevelUp <= 0) {
						newLevel += 1
						playerXp = getPlayerXp(userData.xp, newLevel)
					}

					if (userData.level !== newLevel) {
						const newStashSlots = 15 + ((newLevel - 1) * 5)
						await increaseLevel(query, ctx.user.id, newLevel - userData.level)
						await setStashSlots(query, ctx.user.id, newStashSlots)

						afterCommandMessage = {
							content: `**You leveled up!** (Lvl **${userData.level}** → **${newLevel}**)` +
								`\n💼 Stash Space: **${newStashSlots - 5}** → **${newStashSlots}** slots`,
							ephemeral: true
						}
					}
				}
			}

			// non-worksInDMs command cannot be used in DM channel
			else if (!command.customOptions.worksInDMs) {
				return ctx.send({
					content: `${icons.warning} That command cannot be used in DMs.`,
					flags: InteractionResponseFlags.EPHEMERAL
				})
			}

			// defer response before running command since command may take time to execute
			if (!command.customOptions.noDefer) {
				await ctx.defer(command.deferEphemeral)
			}

			let userTips = await getUserTipsRow(query, ctx.user.id)

			// starter tips stuff for when user first runs command, give them useful info about the command
			if (!userTips) {
				await createStarterTipsRow(query, ctx.user.id)
				userTips = { tips: 0 } as UserStarterTipsRow
			}

			if (!afterCommandMessage && Object.keys(CommandsWithStarterTip).includes(command.commandName)) {
				const cmdWithTip = command as CustomSlashCommand<keyof typeof CommandsWithStarterTip>

				// check if tip has already been shown to user
				if (!(userTips.tips & CommandsWithStarterTip[cmdWithTip.customOptions.name])) {
					await setUserStarterTip(query, ctx.user.id, userTips.tips | CommandsWithStarterTip[cmdWithTip.customOptions.name])
					afterCommandMessage = {
						content: `<@${ctx.user.id}>, ${cmdWithTip.customOptions.starterTip}`,
						ephemeral: true
					}
				}
			}

			// recursive function to make sure message is sent after bot responds to the command,
			// have to do this because some commands like /boss wait for user input which prevents me from placing
			// code after running the command. this is also just safer because it checks that command was responded to
			const sendAfterCommandMessage = (msg: MessageOptions, attemptNum = 1) => new Promise<boolean>((resolve, reject) => {
				setTimeout(async () => {
					try {
						if (attemptNum >= 5) {
							// command hasn't been responded to in over 5 seconds? give up i guess
							reject(new Error('Command not responded to after 5000 ms'))
							return
						}

						const hasResponded = await ctx.fetch()

						// ensure command was responded to before sending this message
						if (hasResponded.content || hasResponded.embeds.length) {
							await ctx.sendFollowUp(msg)
							resolve(true)
						}
						else {
							// try to respond again
							resolve(sendAfterCommandMessage(msg, attemptNum + 1))
						}
					}
					catch (err) {
						logger.warn(err)
					}
				}, 1000)
			})

			if (afterCommandMessage) {
				sendAfterCommandMessage(afterCommandMessage).catch(err => {
					logger.warn(err)
				})
			}

			logger.info(`Command (${command.commandName}) run by ${ctx.user.username}#${ctx.user.discriminator} (${ctx.user.id}) in ${ctx.guildID ? `guild (${ctx.guildID})` : 'DMs'}`)
			await command.run(ctx)
		}
		catch (err) {
			logger.error(err)
			ctx.send({
				content: 'Command failed to execute... If this keeps happening please let a bot dev know!!',
				flags: InteractionResponseFlags.EPHEMERAL
			}).catch(msgErr => {
				logger.warn(msgErr)
			})
		}
	}
}

export default App
