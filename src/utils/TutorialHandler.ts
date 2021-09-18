import App from '../app'
import CustomSlashCommand from '../structures/CustomSlashCommand'
import { CommandContext, ComponentType, InteractionResponseFlags, Message } from 'slash-create'
import { baseBackpackLimit, icons } from '../config'
import { CONFIRM_BUTTONS, GRAY_BUTTON } from './constants'
import { getRaidType } from './raidUtils'
import { getNPC } from './db/npcs'
import { query } from './db/mysql'
import { allNPCs } from '../resources/npcs'
import { locations } from '../resources/raids'
import { getUserBackpack } from './db/items'
import { getEquips } from './itemUtils'
import { logger } from './logger'

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
						content: 'If you ever get confused, you can start a tutorial with the `/help` command.',
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
							'\n\nWhen you buy an item from the shop, it will be placed into your **stash**. **Check out the shop with `/shop view`.**',
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
						content: `Tutorial Step 4/10:\n\n${icons.checkmark} This is the item shop! Items can be purchased using bullets, the currency of this post-apocalyptic world.` +
							' You can gain bullets by selling some of your items to the shop. When you sell something, it will be available for other' +
							' players to purchase. All of the items you are seeing here were sold to the shop by another player. To sell an item, use `/shop sell <item id>` or use' +
							' `/shop buy <item id>` to purchase an item from the shop.\n\nIt\'s time for you to learn how to get more items.' +
							' The game is based around entering **raids** filled with monsters, raiders, other players, and loot to fight over.' +
							' **To enter a raid, use the `/raid` command.**',
						flags: InteractionResponseFlags.EPHEMERAL
					})

					this.tutorialUsers.set(ctx.user.id, 4)
				}
				else {
					const botMessage = await ctx.sendFollowUp({
						content: `Tutorial Step 4/10:\n\n${icons.warning} Wrong command, try using the \`/shop view\` command to view the item shop!`,
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
			case 5:
			case 6:
			case 7:
			case 8:
			case 9:
			case 10: {
				const raidType = getRaidType(ctx.guildID as string)
				const raidChannel = raidType?.channels.find(ch => ch.name === this.app.bot.guilds.get(ctx.guildID as string)?.channels.get(ctx.channelID)?.name)

				if (!raidType) {
					if (command.commandName !== 'raid') {
						const botMessage = await ctx.sendFollowUp({
							content: `Tutorial Step ${activeTutorial + 1}/10:\n\n${icons.warning} You need to join a raid in order to continue the tutorial.` +
								' Use the `/raid` command to enter a raid in the suburbs.',
							flags: InteractionResponseFlags.EPHEMERAL,
							components: [{
								type: ComponentType.ACTION_ROW,
								components: [GRAY_BUTTON('Cancel Tutoral', 'cancel')]
							}]
						})

						await this._awaitTutorialCancel(botMessage, ctx.user.id, 'cancel')
					}
				}
				else if (raidType !== locations.suburbs) {
					await ctx.sendFollowUp({
						content: `Tutorial Step ${activeTutorial + 1}/10:\n\n${icons.danger} It looks like you entered a different raid than **The Suburbs**. The tutorial can no longer be completed.`,
						flags: InteractionResponseFlags.EPHEMERAL
					})

					this.tutorialUsers.delete(ctx.user.id)
				}
				else if (activeTutorial === 5) {
					if (!raidChannel || raidChannel.name !== 'backstreets') {
						const botMessage = await ctx.sendFollowUp({
							content: `Tutorial Step 6/10:\n\n${icons.warning} Wrong channel, head to the #backstreets channel and use the \`/search\` command to search for any threats.`,
							flags: InteractionResponseFlags.EPHEMERAL,
							components: [{
								type: ComponentType.ACTION_ROW,
								components: [GRAY_BUTTON('Cancel Tutoral', 'cancel')]
							}]
						})

						await this._awaitTutorialCancel(botMessage, ctx.user.id, 'cancel')
					}
					else if (command.commandName === 'search') {
						await ctx.sendFollowUp({
							content: `Tutorial Step 6/10:\n\n${icons.checkmark} The search command will let you know if there are any mobs such as walkers in the channel.` +
								' If you were to try and scavenge for loot while a walker was in this channel, you would get attacked and lose health.' +
								' Now that you know the channel is clear of threats, **use the `/scavenge` command to look for items.**',
							flags: InteractionResponseFlags.EPHEMERAL
						})

						this.tutorialUsers.set(ctx.user.id, 6)
					}
					else {
						const botMessage = await ctx.sendFollowUp({
							content: `Tutorial Step 6/10:\n\n${icons.warning} Wrong command, head to the #backstreets channel and use the \`/search\` command to search for any threats.`,
							flags: InteractionResponseFlags.EPHEMERAL,
							components: [{
								type: ComponentType.ACTION_ROW,
								components: [GRAY_BUTTON('Cancel Tutoral', 'cancel')]
							}]
						})

						await this._awaitTutorialCancel(botMessage, ctx.user.id, 'cancel')
					}
				}
				else if (activeTutorial === 6) {
					if (!raidChannel || raidChannel.name !== 'backstreets') {
						const botMessage = await ctx.sendFollowUp({
							content: `Tutorial Step 7/10:\n\n${icons.warning} Wrong channel, head to the #backstreets channel and use the \`/scavenge\` command to look for loot.`,
							flags: InteractionResponseFlags.EPHEMERAL,
							components: [{
								type: ComponentType.ACTION_ROW,
								components: [GRAY_BUTTON('Cancel Tutoral', 'cancel')]
							}]
						})

						await this._awaitTutorialCancel(botMessage, ctx.user.id, 'cancel')
					}
					else if (command.commandName === 'scavenge') {
						await ctx.sendFollowUp({
							content: `Tutorial Step 7/10:\n\n${icons.checkmark} The scavenge command can be used in any channel while in raid. Just make sure` +
								' to always `/search` for threats first.\n\nLet\'s see if we can find a mob to attack, **head to the #red-house channel' +
								' and use the `/search` command again.**',
							flags: InteractionResponseFlags.EPHEMERAL
						})

						this.tutorialUsers.set(ctx.user.id, 7)
					}
					else {
						const botMessage = await ctx.sendFollowUp({
							content: `Tutorial Step 7/10:\n\n${icons.warning} Wrong command, head to the #backstreets channel and use the \`/scavenge\` command to look for loot.`,
							flags: InteractionResponseFlags.EPHEMERAL,
							components: [{
								type: ComponentType.ACTION_ROW,
								components: [GRAY_BUTTON('Cancel Tutoral', 'cancel')]
							}]
						})

						await this._awaitTutorialCancel(botMessage, ctx.user.id, 'cancel')
					}
				}
				else if (activeTutorial === 7) {
					if (!raidChannel || raidChannel.name !== 'red-house') {
						const botMessage = await ctx.sendFollowUp({
							content: `Tutorial Step 7/10:\n\n${icons.warning} Wrong channel, head to the #red-house channel and use the \`/search\` command to search for threats.`,
							flags: InteractionResponseFlags.EPHEMERAL,
							components: [{
								type: ComponentType.ACTION_ROW,
								components: [GRAY_BUTTON('Cancel Tutoral', 'cancel')]
							}]
						})

						await this._awaitTutorialCancel(botMessage, ctx.user.id, 'cancel')
					}
					else if (command.commandName === 'search') {
						const npcRow = await getNPC(query, ctx.channelID)
						const npc = allNPCs.find(n => n.id === npcRow?.id)

						if (!npcRow || !npc) {
							await ctx.sendFollowUp({
								content: `Tutorial Step 7/10:\n\n${icons.warning} It looks like there are no threats at the moment, this means another player must have recently` +
									' killed the mob that spawns here. A mob should spawn here soon (should respawn in about 1 minute), and you would be able to kill it using' +
									' the `/attack` command (`/attack npc`, not `/attack user`). If you were to kill a mob or another player, they would drop items onto the **ground**.' +
									' **You can view items on the ground with `/ground view`.**',
								flags: InteractionResponseFlags.EPHEMERAL
							})

							this.tutorialUsers.set(ctx.user.id, 9)
						}
						else {
							await ctx.sendFollowUp({
								content: `Tutorial Step 7/10:\n\n${icons.checkmark} It looks like there is a walker spawned here! You can kill this enemy for loot and XP.` +
									' You can use the `/attack` command to attack mobs and other players. You can also optionally specify a limb to target when attacking' +
									' (your chance to hit the targeted limb depends on your weapon accuracy). Sometimes it can be better to not specify a limb, since specifying a' +
									' limb can cause your attack to miss. **Try attacking this walker with `/attack npc`.**',
								flags: InteractionResponseFlags.EPHEMERAL
							})

							this.tutorialUsers.set(ctx.user.id, 8)
						}
					}
					else {
						const botMessage = await ctx.sendFollowUp({
							content: `Tutorial Step 7/10:\n\n${icons.warning} Wrong command, head to the #red-house channel and use the \`/search\` command to search for threats.`,
							flags: InteractionResponseFlags.EPHEMERAL,
							components: [{
								type: ComponentType.ACTION_ROW,
								components: [GRAY_BUTTON('Cancel Tutoral', 'cancel')]
							}]
						})

						await this._awaitTutorialCancel(botMessage, ctx.user.id, 'cancel')
					}
				}
				else if (activeTutorial === 8) {
					const userBackpack = await getUserBackpack(query, ctx.user.id)
					const userEquips = getEquips(userBackpack)

					if (command.commandName === 'attack' && ctx.options.npc && userEquips.weapon) {
						await ctx.sendFollowUp({
							content: `Tutorial Step 8/10:\n\n${icons.checkmark} Great job! You successfully attacked the walker, and the walker attacked you back.` +
								' If you were to continue and successfully kill this walker, they would drop items onto the **ground**.' +
								' **You can view items on the ground with `/ground view`.**',
							flags: InteractionResponseFlags.EPHEMERAL
						})

						this.tutorialUsers.set(ctx.user.id, 9)
					}
					else if (command.commandName === 'attack' && ctx.options.npc) {
						const botMessage = await ctx.sendFollowUp({
							content: `Tutorial Step 8/10:\n\n${icons.warning} Make sure you have a weapon equipped. You can equip a weapon from your inventory using \`/equip <item id>\`.`,
							flags: InteractionResponseFlags.EPHEMERAL,
							components: [{
								type: ComponentType.ACTION_ROW,
								components: [GRAY_BUTTON('Cancel Tutoral', 'cancel')]
							}]
						})

						await this._awaitTutorialCancel(botMessage, ctx.user.id, 'cancel')
					}
					else if (command.commandName !== 'equip') {
						const botMessage = await ctx.sendFollowUp({
							content: `Tutorial Step 8/10:\n\n${icons.warning} Wrong command, use the \`/attack npc\` to attack the walker.`,
							flags: InteractionResponseFlags.EPHEMERAL,
							components: [{
								type: ComponentType.ACTION_ROW,
								components: [GRAY_BUTTON('Cancel Tutoral', 'cancel')]
							}]
						})

						await this._awaitTutorialCancel(botMessage, ctx.user.id, 'cancel')
					}
				}
				else if (activeTutorial === 9) {
					if (command.commandName === 'ground' && ctx.options.view) {
						await ctx.sendFollowUp({
							content: `Tutorial Step 9/10:\n\n${icons.checkmark} The ground command works very similarly to the \`stash\` command, you can \`grab\`` +
								' items from the ground and move them to your inventory or `drop` items from your inventory onto the ground. Anyone in the raid can pick' +
								' up items from the ground, so be careful of what items you drop.\n\nYou are ready to escape this raid with the loot you have in your inventory.' +
								' See, you can\'t just leave this raid server and expect to keep the items in your inventory.' +
								' You have to escape using an **evac** channel. **Head to the #sewers-evac channel and use the `/evac` command.**',
							flags: InteractionResponseFlags.EPHEMERAL
						})

						this.tutorialUsers.set(ctx.user.id, 10)
					}
					else {
						const botMessage = await ctx.sendFollowUp({
							content: `Tutorial Step 9/10:\n\n${icons.warning} Wrong command, use the \`/ground view\` command to view items on the ground in a channel.`,
							flags: InteractionResponseFlags.EPHEMERAL,
							components: [{
								type: ComponentType.ACTION_ROW,
								components: [GRAY_BUTTON('Cancel Tutoral', 'cancel')]
							}]
						})

						await this._awaitTutorialCancel(botMessage, ctx.user.id, 'cancel')
					}
				}
				else if (activeTutorial === 10) {
					logger.info(command.commandName)
					if (!raidChannel || raidChannel.name !== 'sewers-evac') {
						const botMessage = await ctx.sendFollowUp({
							content: `Tutorial Step 10/10:\n\n${icons.warning} Wrong channel, head to the #sewers-evac channel and use the \`/evac\` command to escape this raid.`,
							flags: InteractionResponseFlags.EPHEMERAL,
							components: [{
								type: ComponentType.ACTION_ROW,
								components: [GRAY_BUTTON('Cancel Tutoral', 'cancel')]
							}]
						})

						await this._awaitTutorialCancel(botMessage, ctx.user.id, 'cancel')
					}
					else if (command.commandName === 'evac') {
						await ctx.sendFollowUp({
							content: `Tutorial Step 10/10:\n\n${icons.checkmark} You are now escaping this raid! The \`evac\` command is the only way to get out of raids while` +
								' keeping everything in your inventory. **This completes the tutorial. You are now free to enter raids as you please and do anything you want.**\n\n' +
								`${icons.warning} Keep in mind, you are immune to PvP until level **2**. Once you level up, other players WILL be able to kill you in raid (but you can also kill them).`,
							flags: InteractionResponseFlags.EPHEMERAL
						})

						this.tutorialUsers.delete(ctx.user.id)
					}
					else {
						const botMessage = await ctx.sendFollowUp({
							content: `Tutorial Step 10/10:\n\n${icons.warning} Wrong command, head to the #sewers-evac channel and use the \`/evac\` command.`,
							flags: InteractionResponseFlags.EPHEMERAL,
							components: [{
								type: ComponentType.ACTION_ROW,
								components: [GRAY_BUTTON('Cancel Tutoral', 'cancel')]
							}]
						})

						await this._awaitTutorialCancel(botMessage, ctx.user.id, 'cancel')
					}
				}
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
