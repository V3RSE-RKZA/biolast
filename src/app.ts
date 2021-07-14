import Eris, { User, Member, Guild } from 'eris'
import { SlashCreator, GatewayServer, AnyRequestData } from 'slash-create'
import { Command } from './types/Commands'
import MessageCollector from './utils/MessageCollector'
import ButtonCollector from './utils/ButtonCollector'
import CronJobs from './utils/CronJobs'
import { clientId, botToken, prefix } from './config'
import fs from 'fs'
import path from 'path'

class App {
	bot: Eris.Client
	commands: Command[]
	slashCreator: SlashCreator
	btnCollector: ButtonCollector
	msgCollector: MessageCollector
	cronJobs: CronJobs

	constructor(token: string, options: Eris.ClientOptions) {
		this.bot = new Eris.Client(token, options)
		this.commands = []
		this.slashCreator = new SlashCreator({
			applicationID: clientId,
			token: botToken
		})
		this.btnCollector = new ButtonCollector(this)
		this.msgCollector = new MessageCollector(this)
		this.cronJobs = new CronJobs(this)
	}

	async launch(): Promise<void> {
		const eventFiles = fs.readdirSync(path.join(__dirname, '/events'))

		// load all commands to array
		this.commands = await this.loadCommands()

		// start cron jobs
		this.cronJobs.start()

		// start slash creator, used for listening to button clicks on messages
		this.slashCreator.withServer(
			new GatewayServer(
				handler => this.bot.on('rawWS', packet => {
					if (packet.t === 'INTERACTION_CREATE') {
						handler(packet.d as AnyRequestData)
					}
				})
			)
		)

		// load events
		for (const event of eventFiles) {
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

	async loadCommands(): Promise<Command[]> {
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
}

export default App
