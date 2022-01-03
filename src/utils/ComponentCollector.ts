import { EventEmitter } from 'events'
import { ComponentContext, ComponentButton, ComponentType, CommandContext, Message } from 'slash-create'
import App from '../app'
import { icons } from '../config'
import Embed from '../structures/Embed'
import { NEXT_BUTTON, PREVIOUS_BUTTON } from './constants'

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

export interface CollectorObject {
	collector: CollectorEventEmitter
	stopCollector: (reason?: string) => void
}

class ComponentCollector {
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
				await ctx.send({
					ephemeral: true,
					content: `${icons.danger} This button is meant for someone else.`
				})
				return
			}

			colObj.collected.push(ctx)
			colObj.e.emit('collect', ctx)

			if (colObj.limit && colObj.collected.length >= colObj.limit) {
				this.stopCollector(colObj, colObj.collected)
			}
		}
		else {
			// in case bot restarts or button wasn't removed from the message
			await ctx.send({
				ephemeral: true,
				content: `${icons.danger} This button has expired. Please re-run the command.`
			})
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
	createCollector (messageID: string, filter: (i: ComponentContext) => boolean, time = 15000, limit?: number): CollectorObject {
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
			stopCollector: (reason?: string) => { this.stopCollector(collectorObj, reason) }
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
	 * @param ctx Command context to use when responding
	 * @param embeds Array of embeds that will be turned into pages
	 * @param time How long the button collector lasts in milliseconds
	 */
	async paginateEmbeds (ctx: CommandContext, embeds: Embed[], time = 60000): Promise<void> {
		if (embeds.length === 1) {
			await ctx.send({
				embeds: [embeds[0].embed]
			})
			return
		}

		let page = 0

		for (let i = 0; i < embeds.length; i++) {
			if (embeds[i].embed.footer?.text) {
				embeds[i].setFooter(`Page ${i + 1}/${embeds.length} · ${embeds[i].embed.footer?.text}`)
			}
			else {
				embeds[i].setFooter(`Page ${i + 1}/${embeds.length}`)
			}
		}

		const botMessage = await ctx.send({
			embeds: [embeds[0].embed],
			components: [{
				type: ComponentType.ACTION_ROW,
				components: [
					PREVIOUS_BUTTON(true),
					NEXT_BUTTON(false)
				]
			}]
		}) as Message

		const { collector } = this.createCollector(botMessage.id, c => c.user.id === ctx.user.id, time)

		collector.on('collect', async c => {
			try {
				const components: ComponentButton[] = []

				if (c.customID === 'previous' && page !== 0) {
					page--

					components.push(PREVIOUS_BUTTON(page === 0), NEXT_BUTTON(false))

					await c.editParent({
						embeds: [embeds[page].embed],
						components: [{
							type: ComponentType.ACTION_ROW,
							components
						}]
					})
				}
				else if (c.customID === 'next' && page !== (embeds.length - 1)) {
					page++

					components.push(PREVIOUS_BUTTON(false), NEXT_BUTTON(page === (embeds.length - 1)))

					await c.editParent({
						embeds: [embeds[page].embed],
						components: [{
							type: ComponentType.ACTION_ROW,
							components
						}]
					})
				}
			}
			catch (err) {
				// continue
			}
		})

		collector.on('end', msg => {
			if (msg === 'time') {
				embeds[page].setFooter(`Page ${page + 1} · Page buttons timed out`)

				botMessage.edit({
					embeds: [embeds[page].embed],
					components: []
				})
			}
		})
	}

	/**
	 * Used to create a paginated button message based on an array of strings
	 * @param ctx Command context to respond to
	 * @param content Array of string content that will be turned into pages
	 * @param time How long the button collector lasts in milliseconds
	 */
	async paginateContent (ctx: CommandContext, content: string[], time = 60000): Promise<void> {
		if (content.length === 1) {
			await ctx.send({
				content: content[0]
			})
			return
		}

		let page = 0

		const botMessage = await ctx.send({
			content: content[0],
			components: [{
				type: ComponentType.ACTION_ROW,
				components: [
					PREVIOUS_BUTTON(true),
					NEXT_BUTTON(false)
				]
			}]
		}) as Message

		const { collector } = this.createCollector(botMessage.id, c => c.user.id === ctx.user.id, time)

		collector.on('collect', async c => {
			try {
				const components: ComponentButton[] = []

				if (c.customID === 'previous' && page !== 0) {
					page--

					components.push(PREVIOUS_BUTTON(page === 0), NEXT_BUTTON(false))

					await c.editParent({
						content: content[page],
						components: [{
							type: ComponentType.ACTION_ROW,
							components
						}]
					})
				}
				else if (c.customID === 'next' && page !== (content.length - 1)) {
					page++

					components.push(PREVIOUS_BUTTON(false), NEXT_BUTTON(page === (content.length - 1)))

					await c.editParent({
						content: content[page],
						components: [{
							type: ComponentType.ACTION_ROW,
							components
						}]
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
					content: content[page],
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

export default ComponentCollector
