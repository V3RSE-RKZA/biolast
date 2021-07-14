import { EventEmitter } from 'events'
import { Message } from 'eris'
import { ComponentContext, ComponentButton, ComponentType, ButtonStyle } from 'slash-create'
import App from '../app'
import Embed from '../structures/Embed'
import { ComponentChannel } from '../types/Messages'

interface Collector {
	messageID: string
	e: CollectorEventEmitter
	filter: (ctx: ComponentContext) => boolean
	collected: ComponentContext[]
	limit?: number
	timeout: NodeJS.Timeout
}

interface CollectorEventEmitter extends EventEmitter {
	on: CollectorEvents<this>
	once: CollectorEvents<this>
}

interface CollectorEvents<T> {
	(event: 'collect', listener: (ctx: ComponentContext) => void): T
	(event: 'end', listener: (msg: string | ComponentContext[]) => void): T
}

class ButtonCollector {
	private app: App
	private collectors: Collector[]

	constructor (app: App) {
		this.app = app
		this.collectors = []

		this.app.slashCreator.on('componentInteraction', this.verify.bind(this))
	}

	private async verify (ctx: ComponentContext): Promise<void> {
		const colObj = this.collectors.find(obj => obj.messageID === ctx.message.id)

		if (colObj) {
			if (!colObj.filter(ctx)) {
				await ctx.acknowledge()
				return
			}

			colObj.collected.push(ctx)
			colObj.e.emit('collect', ctx)

			if (colObj.limit && colObj.collected.length >= colObj.limit) {
				this.stopCollector(colObj, colObj.collected)
			}
		}
	}

	/**
	 * An event-driven way to collect button clicks from users
	 * @param messageID ID of the message to collect button interactions from
	 * @param filter Filter the button interactions will have to pass
	 * @param time How long the button collector lasts in milliseconds
	 * @param limit How many button interactions to collect max
	 * @returns An object with an event emitting object: collector, and and function used to stop the collector early: stopCollector
	 */
	createCollector (messageID: string, filter: (i: ComponentContext) => boolean, time = 15000, limit?: number): { collector: CollectorEventEmitter, stopCollector: () => void } {
		const eventCollector = new EventEmitter()

		const collectorObj: Collector = {
			messageID,
			timeout: setTimeout(() => {
				this.stopCollector(collectorObj, 'time')
			}, time),
			e: eventCollector,
			collected: [],
			limit,
			filter
		}

		this.collectors.push(collectorObj)

		return {
			collector: collectorObj.e,
			stopCollector: () => { this.stopCollector(collectorObj) }
		}
	}

	/**
	 * Used to wait for a button click from a user on a given message
	 * @param messageID ID of the message to collect button interactions from
	 * @param filter Filter the button interactions will have to pass
	 * @param time How long the button collector lasts in milliseconds
	 * @param limit How many button interactions to collect max
	 * @returns An array of button interactions
	 */
	awaitClicks (messageID: string, filter: (i: ComponentContext) => boolean, time = 15000, limit = 1): Promise<ComponentContext[]> {
		const { collector } = this.createCollector(messageID, filter, time, limit)

		return new Promise((resolve, reject) => {
			collector.once('end', val => {
				if (val !== 'time') {
					resolve(val as ComponentContext[])
				}
				else {
					reject(val)
				}
			})
		})
	}

	/**
	 * Used to create a paginated button message based on an array of embeds
	 * @param message Message to respond to
	 * @param embeds Array of embeds that will be turned into pages
	 * @param time How long the button collector lasts in milliseconds
	 */
	async paginate (message: Message, embeds: Embed[], time = 60000): Promise<void> {
		if (embeds.length === 1) {
			await message.channel.createMessage(embeds[0])
			return
		}

		let page = 0

		embeds[0].setFooter(`Page 1/${embeds.length}`)

		const previousButton = (disabled: boolean): ComponentButton => ({
			type: ComponentType.BUTTON,
			label: 'Previous Page',
			custom_id: 'previous',
			style: ButtonStyle.SECONDARY,
			disabled
		})
		const nextButton = (disabled: boolean): ComponentButton => ({
			type: ComponentType.BUTTON,
			label: 'Next Page',
			custom_id: 'next',
			style: ButtonStyle.SECONDARY,
			disabled
		})
		const closeButton: ComponentButton = {
			type: ComponentType.BUTTON,
			label: 'Close',
			custom_id: 'closed',
			style: ButtonStyle.DESTRUCTIVE
		}

		const botMessage = await (message.channel as ComponentChannel).createMessage({
			embed: embeds[0].embed,
			components: [{
				type: ComponentType.ACTION_ROW,
				components: [
					previousButton(true),
					nextButton(false),
					closeButton
				]
			}]
		})

		const { collector, stopCollector } = this.createCollector(botMessage.id, ctx => ctx.user.id === message.author.id, time)

		collector.on('collect', async ctx => {
			try {
				const components: ComponentButton[] = []

				if (ctx.customID === 'previous' && page !== 0) {
					page--
					embeds[page].setFooter(`Page ${page + 1}/${embeds.length}`)

					components.push(previousButton(page === 0), nextButton(false), closeButton)

					await ctx.editParent({
						embeds: [embeds[page].embed],
						components: [{
							type: ComponentType.ACTION_ROW,
							components
						}]
					})
				}
				else if (ctx.customID === 'next' && page !== (embeds.length - 1)) {
					page++
					embeds[page].setFooter(`Page ${page + 1}/${embeds.length}`)

					components.push(previousButton(false), nextButton(page === (embeds.length - 1)), closeButton)

					await ctx.editParent({
						embeds: [embeds[page].embed],
						components: [{
							type: ComponentType.ACTION_ROW,
							components
						}]
					})
				}
				else if (ctx.customID === 'closed') {
					await ctx.acknowledge()

					stopCollector()
					await botMessage.delete()
				}
			}
			catch (err) {
				// continue
			}
		})

		collector.on('end', msg => {
			if (msg === 'time') {
				embeds[page].setFooter(`Page ${page + 1} | Page buttons timed out`)

				botMessage.edit({
					embed: embeds[page].embed,
					components: []
				})
			}
		})
	}

	private stopCollector (collectorObj: Collector, message: string | ComponentContext[] = 'forced'): void {
		if (this.collectors.includes(collectorObj)) {
			clearTimeout(collectorObj.timeout)
			collectorObj.e.emit('end', message)
			this.collectors.splice(this.collectors.indexOf(collectorObj), 1)
		}
	}
}

export default ButtonCollector
