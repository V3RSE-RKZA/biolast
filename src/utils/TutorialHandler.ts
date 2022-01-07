import App from '../app'
import CustomSlashCommand from '../structures/CustomSlashCommand'
import { CommandContext, ComponentType, InteractionResponseFlags, Message } from 'slash-create'
import { baseBackpackLimit, icons } from '../config'
import { CONFIRM_BUTTONS, GRAY_BUTTON } from './constants'

class TutorialHandler {
	private app: App
	/**
	 * Map of users currently doing the bot tutorial with the current tutorial step they are on.
	 * A tutorial will automatically start for users who run a command for first time.
	 */
	tutorialUsers: Map<string, 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10>

	constructor (app: App) {
		this.app = app
		this.tutorialUsers = new Map()
	}

	async handle (command: CustomSlashCommand, ctx: CommandContext): Promise<void> {
		const activeTutorial = this.tutorialUsers.get(ctx.user.id)

		switch (activeTutorial) {
			case 0: {
				let botMessage = await ctx.sendFollowUp({
					content: `${icons.wave} Hey! It looks like this is your first time using the bot. **Would you like an interactive tutorial?**` +
						' It can be canceled at any time.',
					flags: InteractionResponseFlags.EPHEMERAL,
					components: CONFIRM_BUTTONS
				})

				try {
					const confirmed = (await this.app.componentCollector.awaitClicks(botMessage.id, i => i.user.id === ctx.user.id))[0]

					if (confirmed.customID === 'confirmed') {
						this.tutorialUsers.set(ctx.user.id, 1)

						botMessage = await botMessage.edit({
							content: 'Tutorial Step 1/10:\n\nThe main aspect of the bot is to collect **items** and build up your stash.' +
								' **Check out your inventory using the `/inventory` command.**',
							components: []
						})
					}
					else {
						this.tutorialUsers.delete(ctx.user.id)

						await confirmed.editParent({
							content: `${icons.wave} Alright! If you ever get confused, check out the \`/help\` command.`,
							components: []
						})
					}
				}
				catch (err) {
					await botMessage.edit({
						content: 'If you ever get confused, check out the `/help` command.',
						components: []
					})
				}

				break
			}
			case 1: {
				if (command.commandName === 'inventory') {
					await ctx.sendFollowUp({
						content: `Tutorial Step 2/10:\n\n${icons.checkmark} This is your inventory, you can see your health, level experience, item equips such as armor,` +
							` and all of the items in your inventory. Without a backpack equipped, your inventory only has **${baseBackpackLimit}** slots for items. If you need` +
							' more space, you can store items in your **stash**. **Check your stash inventory with `/stash view`.**',
						flags: InteractionResponseFlags.EPHEMERAL
					})

					this.tutorialUsers.set(ctx.user.id, 2)
				}
				else {
					const botMessage = await ctx.sendFollowUp({
						content: `Tutorial Step 2/10:\n\n${icons.warning} Wrong command, try using the \`/inventory\` command to view items you own.`,
						flags: InteractionResponseFlags.EPHEMERAL,
						components: [{
							type: ComponentType.ACTION_ROW,
							components: [GRAY_BUTTON('Cancel Tutoral', 'cancel')]
						}]
					})

					await this._awaitTutorialCancel(botMessage, ctx.user.id, 'cancel')
				}

				break
			}
			case 2: {
				if (command.commandName === 'stash' && ctx.options.view) {
					await ctx.sendFollowUp({
						content: `Tutorial Step 3/10:\n\n${icons.checkmark} Your stash is different from your inventory in that it can hold more items as you level up and` +
							' **the items stored here are safe**. When you enter a raid you will take your inventory items with you while the items in your stash' +
							' will remain in your stash (you won\'t lose these items if you were to die in a raid).' +
							' You can use `/stash put <item id>` to move items from your inventory to your stash, and `stash take <item id>` to take items from your stash' +
							` and move them to your inventory.\n\n${icons.information} With \`/stash put\`/\`take\`, you can specify up to 3 items to transfer at a time.` +
							'\n\nWhen you buy an item from the shop, it will be placed into your **stash**. **Check out the shop with `/market view`.**',
						flags: InteractionResponseFlags.EPHEMERAL
					})

					this.tutorialUsers.set(ctx.user.id, 3)
				}
				else {
					const botMessage = await ctx.sendFollowUp({
						content: `Tutorial Step 3/10:\n\n${icons.warning} Wrong command, try using the \`/stash view\` command to view your item stash.`,
						flags: InteractionResponseFlags.EPHEMERAL,
						components: [{
							type: ComponentType.ACTION_ROW,
							components: [GRAY_BUTTON('Cancel Tutoral', 'cancel')]
						}]
					})

					await this._awaitTutorialCancel(botMessage, ctx.user.id, 'cancel')
				}

				break
			}
			case 3: {
				if (command.commandName === 'shop' && ctx.options.view) {
					await ctx.sendFollowUp({
						content: `Tutorial Step 4/10:\n\n${icons.checkmark} This is the item shop! Items can be purchased using coins, the currency of this post-apocalyptic world.` +
							' You can gain money by selling some of your items to the shop. When you sell something, it will be available for other' +
							' players to purchase. All of the items you are seeing here were sold to the shop by another player. To sell an item, use `/market sell <item id>` or use' +
							' `/market buy <item id>` to purchase an item from the shop.\n\nIt\'s time for you to learn how to get more items.' +
							' The game is based around entering **raids** filled with monsters, raiders, other players, and loot to fight over.' +
							' **To enter a raid, use the `/raid` command.**',
						flags: InteractionResponseFlags.EPHEMERAL
					})

					this.tutorialUsers.set(ctx.user.id, 4)
				}
				else {
					const botMessage = await ctx.sendFollowUp({
						content: `Tutorial Step 4/10:\n\n${icons.warning} Wrong command, try using the \`/market view\` command to view the item shop!`,
						flags: InteractionResponseFlags.EPHEMERAL,
						components: [{
							type: ComponentType.ACTION_ROW,
							components: [GRAY_BUTTON('Cancel Tutoral', 'cancel')]
						}]
					})

					await this._awaitTutorialCancel(botMessage, ctx.user.id, 'cancel')
				}

				break
			}
			case 4: {
				if (command.commandName === 'raid' && ctx.options.location) {
					await ctx.sendFollowUp({
						content: `Tutorial Step 5/10:\n\n${icons.checkmark} Once you enter the raid, head to the #backstreets channel and use the \`/search\` command.`,
						flags: InteractionResponseFlags.EPHEMERAL
					})

					this.tutorialUsers.set(ctx.user.id, 5)
				}
				else if (command.commandName === 'raid') {
					const botMessage = await ctx.sendFollowUp({
						content: `Tutorial Step 5/10:\n\n${icons.warning} There are multiple locations you can choose from. The Suburbs is good for low level players, ` +
							'use `/raid the suburbs` to raid there.',
						flags: InteractionResponseFlags.EPHEMERAL,
						components: [{
							type: ComponentType.ACTION_ROW,
							components: [GRAY_BUTTON('Cancel Tutoral', 'cancel')]
						}]
					})

					await this._awaitTutorialCancel(botMessage, ctx.user.id, 'cancel')
				}
				else {
					const botMessage = await ctx.sendFollowUp({
						content: `Tutorial Step 5/10:\n\n${icons.warning} Wrong command, try using the \`/raid\` command to view enter a raid and find loot!`,
						flags: InteractionResponseFlags.EPHEMERAL,
						components: [{
							type: ComponentType.ACTION_ROW,
							components: [GRAY_BUTTON('Cancel Tutoral', 'cancel')]
						}]
					})

					await this._awaitTutorialCancel(botMessage, ctx.user.id, 'cancel')
				}

				break
			}
		}
	}

	private async _awaitTutorialCancel (botMessage: Message, userID: string, buttonCustomID: string): Promise<void> {
		try {
			const confirmed = (await this.app.componentCollector.awaitClicks(botMessage.id, i => i.user.id === userID))[0]

			if (confirmed.customID === buttonCustomID) {
				this.tutorialUsers.delete(userID)

				await confirmed.editParent({
					content: `${icons.checkmark} Tutorial canceled.`,
					components: []
				})
			}
		}
		catch (err) {
			await botMessage.edit({
				content: botMessage.content,
				components: []
			})
		}
	}
}

export default TutorialHandler
