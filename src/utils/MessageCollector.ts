import App from '../app'
import { EventEmitter } from 'events'
import { GuildTextableChannel, Message } from 'eris'

interface ChannelCollector {
	channelID: string
	e: CollectorEventEmitter
	filter: (m: Message<GuildTextableChannel>) => boolean
	collected: Message[]
	limit?: number
	timeout: NodeJS.Timeout
}

interface CollectorEventEmitter extends EventEmitter {
	on: CollectorEvents<this>
	once: CollectorEvents<this>
}

interface CollectorEvents<T> {
	(event: 'collect', listener: (m: Message<GuildTextableChannel>) => void): T
	(event: 'end', listener: (msg: string | Message<GuildTextableChannel>[]) => void): T
}

/**
 * Used to collect messages without creating multiple event listeners on the bot client
 */
class MessageCollector {
	private app: App
	private channelCollectors: ChannelCollector[]

	constructor(app: App) {
		this.app = app
		this.channelCollectors = []

		this.app.bot.on('messageCreate', this.verify.bind(this))
	}

	private verify(msg: Message<GuildTextableChannel>): void {
		if (msg.author.bot) return

		const collectors = this.channelCollectors.filter(c => c.channelID === msg.channel.id)

		for (const collector of collectors) {
			if (collector.filter(msg)) {
				collector.e.emit('collect', msg)
				collector.collected.push(msg)

				if (collector.limit && collector.collected.length >= collector.limit) {
					this.stopCollector(collector, collector.collected)
				}
			}
		}
	}

	/**
	 * Used to collect messages in a channel based on criteria
	 * @param channelID ID of channel to collect messages from
	 * @param filter Function to use for filtering what messages should be collected or ignored
	 * @param time How long the collector lasts
	 * @param limit How many messages to collect max
	 * @returns An object with an event emitting object: collector, and and function used to stop the collector early: stopCollector
	 */
	createChannelCollector(channelID: string, filter: (m: Message<GuildTextableChannel>) => boolean, time = 15000, limit?: number): { collector: CollectorEventEmitter, stopCollector: () => void } {
		const event = new EventEmitter()

		const collectorObj: ChannelCollector = {
			channelID,
			e: event,
			filter,
			collected: [],
			limit,
			timeout: setTimeout(() => {
				this.stopCollector(collectorObj, 'time')
			}, time)
		}

		this.channelCollectors.push(collectorObj)

		return {
			collector: collectorObj.e,
			stopCollector: () => { this.stopCollector(collectorObj) }
		}
	}

	private stopCollector(collector: ChannelCollector, message: string | Message[] = 'forced'): void {
		if (this.channelCollectors.includes(collector)) {
			collector.e.emit('end', message)
			clearTimeout(collector.timeout)
			this.channelCollectors.splice(this.channelCollectors.indexOf(collector), 1)
		}
	}
}

export default MessageCollector
