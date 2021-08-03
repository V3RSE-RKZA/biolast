import Eris, { User, Member, Guild } from 'eris'
import { SlashCreator, GatewayServer, AnyRequestData, CommandContext, InteractionRequestData } from 'slash-create'
import { Command } from './types/Commands'
import MessageCollector from './utils/MessageCollector'
import ComponentCollector from './utils/ComponentCollector'
import NPCHandler from './utils/NPCHandler'
import CronJobs from './utils/CronJobs'
import { getAllRaids, getUsersRaid, removeUserFromRaid } from './utils/db/raids'
import { clientId, botToken, prefix } from './config'
import fs from 'fs'
import path from 'path'
import { beginTransaction, query } from './utils/db/mysql'
import { getUserBackpack } from './utils/db/items'
import { formatTime } from './utils/db/cooldowns'
import CustomSlashCommand from './structures/CustomSlashCommand'

class App {
	bot: Eris.Client
	commands: Command[]
	slashCreator: SlashCreator
	componentCollector: ComponentCollector
	msgCollector: MessageCollector
	cronJobs: CronJobs
	activeRaids: {
		userID: string
		timeout: NodeJS.Timeout
	}[]
	acceptingCommands: boolean
	npcHandler: NPCHandler

	constructor (token: string, options: Eris.ClientOptions) {
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
		this.activeRaids = []
		this.acceptingCommands = false
		this.npcHandler = new NPCHandler(this)
	}

	async launch (): Promise<void> {
		const botEventFiles = fs.readdirSync(path.join(__dirname, '/events'))

		// load all commands to array
		this.commands = await this.loadCommands()

		// start cron jobs
		this.cronJobs.start()

		// start slash creator, used for handling interactions
		this.slashCreator
			.withServer(
				new GatewayServer(
					handler => this.bot.on('rawWS', packet => {
						if (packet.t === 'INTERACTION_CREATE') {
							handler(packet.d as AnyRequestData)
						}
					})
				)
			)
			.registerCommandsIn(path.join(__dirname, 'slash-commands'))
			.syncCommands()

		this.slashCreator.on('commandInteraction', (i, res, webserverMode) => {
			if (!this.acceptingCommands) {
				return res({
					status: 400
				})
			}

			const command = this._getCommandFromInteraction(i)

			if (!command) {
				return res({
					status: 400
				})
			}

			const ctx = new CommandContext(this.slashCreator, i, res, webserverMode, command.deferEphemeral)

			ctx.send('Hey!')
		})

		this.slashCreator.on('debug', msg => {
			console.log(msg)
		})

		// load bot gateway events
		for (const event of botEventFiles) {
			const { run } = await import(`./events/${event}`)
			const eventName = event.replace(/.js|.ts/, '')

			if (eventName === 'ready') {
				// using .once here because the ready event is called every time the bot reconnects and we may have functions
				// inside the ready event that we want called only once.
				this.bot.once(eventName, run.bind(this))
			}
			else {
				this.bot.on(eventName, run.bind(this))
			}
		}

		this.bot.editStatus('online', {
			name: `${prefix}help`,
			type: 0
		})

		console.info('[APP] Listening for events')
		await this.bot.connect()
	}

	async loadCommands (): Promise<Command[]> {
		const commandFiles = fs.readdirSync(path.join(__dirname, '/commands')).filter(file => file.endsWith('.js') || file.endsWith('.ts'))
		const commandsArr: Command[] = []

		for (const file of commandFiles) {
			try {
				// remove command file cache so you can reload commands while bot is running: eval app.commands = app.loadCommands();
				delete require.cache[require.resolve(`./commands/${file}`)]
			}
			catch (err) {
				console.warn(err)
			}

			const { command }: { command: Command } = await import(`./commands/${file}`)

			commandsArr.push(command)
		}

		return commandsArr
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
			console.error(err)
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
			console.error(err)
		}
	}

	async loadRaidTimers (): Promise<void> {
		const activeRaids = await getAllRaids(query)

		for (const row of activeRaids) {
			const guild = this.bot.guilds.get(row.guildId)

			if (guild) {
				const timeLeft = (row.length * 1000) - (Date.now() - row.startedAt.getTime())
				if (timeLeft <= 0) {
					// raid ended while the bot was offline, dont remove items from users backpack since bot was offline
					await removeUserFromRaid(query, row.userId)

					try {
						await guild.kickMember(row.userId, 'Raid expired while bot was offline')
					}
					catch (err) {
						// user not in raid server
					}
				}
				else {
					console.log(`Starting raid timer for ${row.userId} which will expire in ${formatTime(timeLeft)}`)

					this.activeRaids.push({
						userID: row.userId,
						timeout: setTimeout(async () => {
							try {
								const transaction = await beginTransaction()
								await getUsersRaid(transaction.query, row.userId, true)
								await getUserBackpack(transaction.query, row.userId, true)
								await removeUserFromRaid(transaction.query, row.userId)

								// remove items from backpack since user didn't evac
								await transaction.query('DELETE items FROM items INNER JOIN backpack_items ON items.id = backpack_items.itemId WHERE userId = ?', [row.userId])
								await transaction.commit()

								await guild.kickMember(row.userId, 'Raid time ran out')
							}
							catch (err) {
								console.error(err)
								// unable to kick user?
							}
						}, timeLeft)
					})
				}
			}
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

	private _handleSlashCommand (command: CustomSlashCommand, ctx: CommandContext) {
		console.log('hey')
	}
}

export default App
