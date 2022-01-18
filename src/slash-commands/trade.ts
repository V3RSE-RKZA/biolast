import { CommandOptionType, SlashCreator, CommandContext, ComponentType, ComponentButton, ButtonStyle } from 'slash-create'
import { ResolvedMember } from 'slash-create/lib/structures/resolvedMember'
import App from '../app'
import { icons, tradeCooldown, webhooks } from '../config'
import CustomSlashCommand from '../structures/CustomSlashCommand'
import Embed from '../structures/Embed'
import { ItemRow, ItemWithRow, UserRow } from '../types/mysql'
import { CONFIRM_BUTTONS } from '../utils/constants'
import { addItemToBackpack, getUserBackpack, getUserStash, removeItemFromBackpack, removeItemFromStash } from '../utils/db/items'
import { beginTransaction, query } from '../utils/db/mysql'
import { addMoney, getUserRow, removeMoney } from '../utils/db/players'
import { backpackHasSpace, getItemDisplay, getItems } from '../utils/itemUtils'
import { logger } from '../utils/logger'
import { formatMoney, formatNumber } from '../utils/stringUtils'
import { getNumber } from '../utils/argParsers'
import { disableAllComponents, reply } from '../utils/messageUtils'
import { createCooldown, formatTime, getCooldown } from '../utils/db/cooldowns'
import { getDiscordUserAge } from '../utils/playerUtils'

const CHECKMARK_ID = icons.checkmark.match(/:([0-9]*)>/)
const TRADE_BUTTONS = (picked?: 'item' | 'money' | 'complete' | 'cancel'): ComponentButton[] => [
	{
		type: ComponentType.BUTTON,
		label: 'Add Item',
		custom_id: 'item',
		style: picked === 'item' ? ButtonStyle.SUCCESS : ButtonStyle.SECONDARY
	},
	{
		type: ComponentType.BUTTON,
		label: 'Add Copper',
		custom_id: 'money',
		style: picked === 'money' ? ButtonStyle.SUCCESS : ButtonStyle.SECONDARY
	},
	{
		type: ComponentType.BUTTON,
		label: 'Complete Trade',
		custom_id: 'complete',
		style: picked === 'complete' ? ButtonStyle.SUCCESS : ButtonStyle.SECONDARY,
		emoji: CHECKMARK_ID ? {
			id: CHECKMARK_ID[1],
			name: 'complete'
		} : undefined
	},
	{
		type: ComponentType.BUTTON,
		label: 'Cancel Trade',
		custom_id: 'cancel',
		style: picked && picked !== 'cancel' ? ButtonStyle.SECONDARY : picked === 'cancel' ? ButtonStyle.SUCCESS : ButtonStyle.DESTRUCTIVE
	}
]

class TradeCommand extends CustomSlashCommand {
	constructor (creator: SlashCreator, app: App) {
		super(creator, app, {
			name: 'trade',
			description: 'Trade your items with another player.',
			longDescription: 'Trade your items with another player.',
			// ' Note that players must have reached the same region to be able to trade with eachother.' +
			// ' For example, a player who has reached **The Farm** cannot trade with a player who has reached a higher level region. *We do this so that' +
			// ' stronger players cannot give powerful weapons to a less experienced player which would then make the game easier for that player.*',
			options: [{
				type: CommandOptionType.USER,
				name: 'user',
				description: 'User to trade with.',
				required: true
			}],
			category: 'trading',
			guildModsOnly: false,
			worksInDMs: false,
			worksDuringDuel: false,
			guildIDs: [],
			noDefer: true
		})

		this.filePath = __filename
	}

	async run (ctx: CommandContext): Promise<void> {
		if (!ctx.member) {
			throw new Error('Member not attached to interaction')
		}
		else if (!ctx.guildID) {
			throw new Error('Guild ID not attached to interaction')
		}

		const member = ctx.members.get(ctx.options.user)
		if (!member) {
			await ctx.send({
				content: `${icons.danger} You must specify someone to trade with!`
			})
			return
		}
		else if (member.id === ctx.user.id) {
			await ctx.send({
				content: `${icons.danger} You trade with yourself!`
			})
			return
		}

		const prePlayerTradeCD = await getCooldown(query, ctx.user.id, 'trade')

		if (prePlayerTradeCD) {
			await ctx.send({
				content: `${icons.warning} You have recently completed a trade, you cannot trade again for **${prePlayerTradeCD}**.`
			})
			return
		}

		const memberData = await getUserRow(query, member.id)
		if (!memberData) {
			await ctx.send({
				content: `${icons.warning} **${member.displayName}** does not have an account!`
			})
			return
		}
		else if (memberData.fighting) {
			await ctx.send({
				content: `${icons.warning} **${member.displayName}** is in a fight right now!`,
				components: []
			})
			return
		}

		const prePlayer2TradeCD = await getCooldown(query, member.id, 'trade')
		if (prePlayer2TradeCD) {
			await ctx.send({
				content: `${icons.warning} **${member.displayName}** has recently completed a trade, they cannot trade again for **${prePlayer2TradeCD}**.`
			})
			return
		}

		await ctx.send({
			content: `<@${member.id}>, **${ctx.member.displayName}** would like to trade with you!`,
			components: CONFIRM_BUTTONS
		})
		let botMessage = await ctx.fetch()

		try {
			const confirmed = (await this.app.componentCollector.awaitClicks(botMessage.id, i => i.user.id === member.id))[0]

			if (confirmed.customID !== 'confirmed') {
				await botMessage.edit({
					content: `${icons.danger} **${member.displayName}** declined the trade invite.`,
					components: []
				})
				return
			}

			const prePlayer1Data = (await getUserRow(query, ctx.user.id))!
			const prePlayer2Data = (await getUserRow(query, member.id))!

			if (prePlayer1Data.fighting) {
				await confirmed.editParent({
					content: `${icons.warning} **${ctx.member.displayName}** is in a fight right now!`,
					components: []
				})
				return
			}
			else if (prePlayer2Data.fighting) {
				await confirmed.editParent({
					content: `${icons.warning} **${member.displayName}** is in a fight right now!`,
					components: []
				})
				return
			}

			// begin trade
			const player1Items: ItemRow[] = []
			const player2Items: ItemRow[] = []
			let player1Money = 0
			let player2Money = 0
			let tradeActive = true

			await confirmed.editParent({
				content: '',
				embeds: [this.getTradeEmbed(ctx.member, member, player1Money, player2Money, player1Items, player2Items, prePlayer1Data, prePlayer2Data).embed],
				components: [{
					type: ComponentType.ACTION_ROW,
					components: TRADE_BUTTONS()
				}]
			})

			while (tradeActive) {
				try {
					const tradeChoice = (await this.app.componentCollector.awaitClicks(botMessage.id, i => i.user.id === ctx.user.id || i.user.id === member.id, 30000))[0]
					const userDisplay = tradeChoice.member?.displayName || `${tradeChoice.user.username}#${tradeChoice.user.discriminator}`

					await tradeChoice.acknowledge()

					if (tradeChoice.customID === 'item') {
						const playersItems = tradeChoice.user.id === ctx.user.id ? player1Items : player2Items

						if (playersItems.length >= this.getItemLimit(prePlayer1Data, prePlayer2Data)) {
							await tradeChoice.send({
								ephemeral: true,
								content: `You can only add up to **${this.getItemLimit(prePlayer1Data, prePlayer2Data)}** items in this trade. This limit is based on the user in this trade with the lowest level.`
							})
							continue
						}

						await botMessage.edit({
							content: `${icons.loading} **${userDisplay}** is adding an item to the trade...`,
							components: [{
								type: ComponentType.ACTION_ROW,
								components: disableAllComponents(TRADE_BUTTONS('item'))
							}]
						})

						await tradeChoice.send({
							ephemeral: true,
							content: 'What item would you like to add to the trade?' +
								'\n\n**Type the ID of the item you\'d like to add or type `cancel` to cancel this action**:'
						})

						try {
							// THIS REQUIRES MESSAGE CONTENT INTENT
							const result = await this.awaitItemInput(ctx.channelID, tradeChoice.user.id, playersItems)

							playersItems.push(result.row)

							await botMessage.edit({
								content: '',
								components: [{
									type: ComponentType.ACTION_ROW,
									components: disableAllComponents(TRADE_BUTTONS('item'))
								}]
							})
							botMessage = await tradeChoice.sendFollowUp({
								content: `${icons.checkmark} **${userDisplay}** added ${getItemDisplay(result.item, result.row, { showEquipped: false })} to the trade.`,
								embeds: [this.getTradeEmbed(ctx.member, member, player1Money, player2Money, player1Items, player2Items, prePlayer1Data, prePlayer2Data).embed],
								components: [{
									type: ComponentType.ACTION_ROW,
									components: TRADE_BUTTONS()
								}]
							})
						}
						catch (err) {
							await botMessage.edit({
								content: '',
								components: [{
									type: ComponentType.ACTION_ROW,
									components: disableAllComponents(TRADE_BUTTONS('money'))
								}]
							})
							botMessage = await tradeChoice.sendFollowUp({
								content: `${icons.warning} **${userDisplay}** did not complete their action...`,
								embeds: [this.getTradeEmbed(ctx.member, member, player1Money, player2Money, player1Items, player2Items, prePlayer1Data, prePlayer2Data).embed],
								components: [{
									type: ComponentType.ACTION_ROW,
									components: TRADE_BUTTONS()
								}]
							})
						}
					}
					else if (tradeChoice.customID === 'money') {
						const playerData = await getUserRow(query, tradeChoice.user.id)
						const playersMoney = tradeChoice.user.id === ctx.user.id ? player1Money : player2Money
						const tradeMoneyLimit = this.getMoneyLimit(prePlayer1Data, prePlayer2Data)

						if (!playerData) {
							throw new Error('User has no account')
						}
						else if (playersMoney >= tradeMoneyLimit) {
							await tradeChoice.send({
								ephemeral: true,
								content: `You have reached the limit for how much copper you can add to this trade (${formatMoney(tradeMoneyLimit)}).`
							})
							continue
						}
						else if (playerData.money <= 0) {
							await tradeChoice.send({
								ephemeral: true,
								content: `You have ${formatMoney(playerData.money)}. Maybe get some copper first? 💀`
							})
							continue
						}
						else if (playerData.money - playersMoney <= 0) {
							await tradeChoice.send({
								ephemeral: true,
								content: 'You have already added all of your copper to this trade.'
							})
							continue
						}

						const maxPlayerCanAdd = Math.min(playerData.money - playersMoney, tradeMoneyLimit - playersMoney)

						await botMessage.edit({
							content: `${icons.loading} **${userDisplay}** is adding some copper to the trade...`,
							components: [{
								type: ComponentType.ACTION_ROW,
								components: disableAllComponents(TRADE_BUTTONS('money'))
							}]
						})
						await tradeChoice.send({
							ephemeral: true,
							content: `How much copper would you like to add to the trade? (You can add up to **${formatMoney(maxPlayerCanAdd)}** more)` +
								'\n\n**Type the amount you\'d like to add or type `cancel` to cancel this action**:'
						})

						try {
							// THIS REQUIRES MESSAGE CONTENT INTENT
							const result = await this.awaitMoneyInput(ctx.channelID, tradeChoice.user.id, playersMoney, tradeMoneyLimit)

							if (tradeChoice.user.id === ctx.user.id) {
								player1Money += result
							}
							else {
								player2Money += result
							}

							await botMessage.edit({
								content: '',
								components: [{
									type: ComponentType.ACTION_ROW,
									components: disableAllComponents(TRADE_BUTTONS('money'))
								}]
							})
							botMessage = await tradeChoice.sendFollowUp({
								content: `${icons.checkmark} **${userDisplay}** added ${formatMoney(result)} to the trade.`,
								embeds: [this.getTradeEmbed(ctx.member, member, player1Money, player2Money, player1Items, player2Items, prePlayer1Data, prePlayer2Data).embed],
								components: [{
									type: ComponentType.ACTION_ROW,
									components: TRADE_BUTTONS()
								}]
							})
						}
						catch (err) {
							await botMessage.edit({
								content: '',
								components: [{
									type: ComponentType.ACTION_ROW,
									components: disableAllComponents(TRADE_BUTTONS('money'))
								}]
							})
							botMessage = await tradeChoice.sendFollowUp({
								content: `${icons.warning} **${userDisplay}** did not complete their action...`,
								embeds: [this.getTradeEmbed(ctx.member, member, player1Money, player2Money, player1Items, player2Items, prePlayer1Data, prePlayer2Data).embed],
								components: [{
									type: ComponentType.ACTION_ROW,
									components: TRADE_BUTTONS()
								}]
							})
						}
					}
					else if (tradeChoice.customID === 'cancel') {
						tradeActive = false

						await botMessage.edit({
							content: `${icons.cancel} **${userDisplay}** has canceled the trade.`,
							components: [{
								type: ComponentType.ACTION_ROW,
								components: disableAllComponents(TRADE_BUTTONS('cancel'))
							}]
						})
					}
					else if (tradeChoice.customID === 'complete') {
						if (
							player1Money <= 0 &&
							player2Money <= 0 &&
							player1Items.length <= 0 &&
							player2Items.length <= 0
						) {
							await tradeChoice.send({
								ephemeral: true,
								content: 'Neither of you have added anything to the trade...'
							})
							continue
						}

						tradeActive = false

						const otherPlayer = tradeChoice.user.id === ctx.user.id ? member : ctx.member

						await botMessage.edit({
							components: [{
								type: ComponentType.ACTION_ROW,
								components: disableAllComponents(TRADE_BUTTONS('complete'))
							}]
						})
						const acceptedMessage = await tradeChoice.sendFollowUp({
							content: `**${userDisplay}** has accepted the trade. <@${otherPlayer.id}>, do you accept the trade?` +
								`\n\n${icons.warning} You will be put on a **${formatTime(tradeCooldown * 1000)}** cooldown before you can make another trade.`,
							components: CONFIRM_BUTTONS
						})

						try {
							const accepted = (await this.app.componentCollector.awaitClicks(acceptedMessage.id, i => i.user.id === otherPlayer.id, 30000))[0]

							if (accepted.customID !== 'confirmed') {
								await accepted.editParent({
									content: `${icons.danger} **${otherPlayer.displayName}** declined the trade.`,
									components: disableAllComponents(CONFIRM_BUTTONS)
								})
								return
							}

							const transaction = await beginTransaction()
							const player1TradeCD = await getCooldown(transaction.query, ctx.user.id, 'trade', true)
							const player2TradeCD = await getCooldown(transaction.query, member.id, 'trade', true)

							if (player1TradeCD) {
								await transaction.commit()

								await accepted.editParent({
									content: `${icons.danger} **${ctx.member.displayName}** has completed a trade recently and must wait **${player1TradeCD}** before accepting another.`,
									components: disableAllComponents(CONFIRM_BUTTONS)
								})
								return
							}
							else if (player2TradeCD) {
								await transaction.commit()

								await accepted.editParent({
									content: `${icons.danger} **${member.displayName}** has completed a trade recently and must wait **${player2TradeCD}** before accepting another.`,
									components: disableAllComponents(CONFIRM_BUTTONS)
								})
								return
							}

							const player1Data = await getUserRow(transaction.query, ctx.user.id, true)
							const player2Data = await getUserRow(transaction.query, member.id, true)

							// verify users have money
							if (!player1Data || player1Data.money < player1Money) {
								await transaction.commit()

								await accepted.editParent({
									content: `${icons.danger} **${ctx.member.displayName}** does not have the copper they tried to trade.`,
									components: disableAllComponents(CONFIRM_BUTTONS)
								})
								return
							}
							else if (!player2Data || player2Data.money < player2Money) {
								await transaction.commit()

								await accepted.editParent({
									content: `${icons.danger} **${member.displayName}** does not have the copper they tried to trade.`,
									components: disableAllComponents(CONFIRM_BUTTONS)
								})
								return
							}

							if (player1Data.fighting) {
								await transaction.commit()

								await accepted.editParent({
									content: `${icons.danger} **${ctx.member.displayName}** entered a duel while the trade was ongoing, the trade could not be completed.`,
									components: disableAllComponents(CONFIRM_BUTTONS)
								})
								return
							}
							else if (player2Data.fighting) {
								await transaction.commit()

								await accepted.editParent({
									content: `${icons.danger} **${member.displayName}** entered a duel while the trade was ongoing, the trade could not be completed.`,
									components: disableAllComponents(CONFIRM_BUTTONS)
								})
								return
							}

							const player1BackpackRows = await getUserBackpack(transaction.query, ctx.user.id, true)
							const player1StashRows = await getUserStash(transaction.query, ctx.user.id, true)
							const player1Backpack = getItems(player1BackpackRows)
							const player1Stash = getItems(player1StashRows)
							const verifiedPlayer1Items: ItemRow[] = []

							// verify player1 has items
							for (const item of player1Items) {
								const foundItem = player1Backpack.items.find(itm => itm.row.id === item.id) || player1Stash.items.find(itm => itm.row.id === item.id)

								if (!foundItem || verifiedPlayer1Items.some(itm => itm.id === item.id)) {
									await transaction.commit()

									await accepted.editParent({
										content: `${icons.danger} **${ctx.member.displayName}** does not have the items they tried to trade.`,
										components: disableAllComponents(CONFIRM_BUTTONS)
									})
									return
								}

								verifiedPlayer1Items.push(foundItem.row)
							}

							const player2BackpackRows = await getUserBackpack(transaction.query, member.id, true)
							const player2StashRows = await getUserStash(transaction.query, member.id, true)
							const player2Backpack = getItems(player2BackpackRows)
							const player2Stash = getItems(player2StashRows)
							const verifiedPlayer2Items: ItemRow[] = []

							// verify player2 has items
							for (const item of player2Items) {
								const foundItem = player2Backpack.items.find(itm => itm.row.id === item.id) || player2Stash.items.find(itm => itm.row.id === item.id)

								if (!foundItem || verifiedPlayer2Items.some(itm => itm.id === item.id)) {
									await transaction.commit()

									await accepted.editParent({
										content: `${icons.danger} **${member.displayName}** does not have the items they tried to trade.`,
										components: disableAllComponents(CONFIRM_BUTTONS)
									})
									return
								}

								verifiedPlayer2Items.push(foundItem.row)
							}

							// verify users have enough space for the items
							const player1SlotsNeeded = getItems(verifiedPlayer2Items).slotsUsed - getItems(verifiedPlayer1Items).slotsUsed
							if (!backpackHasSpace(player1BackpackRows, player1SlotsNeeded)) {
								await transaction.commit()

								await accepted.editParent({
									content: `${icons.danger} **${ctx.member.displayName}** does not have enough storage in their inventory to complete this trade (required: **${player1SlotsNeeded}** slots).`,
									components: disableAllComponents(CONFIRM_BUTTONS)
								})
								return
							}

							const player2SlotsNeeded = getItems(verifiedPlayer1Items).slotsUsed - getItems(verifiedPlayer2Items).slotsUsed
							if (!backpackHasSpace(player2BackpackRows, player2SlotsNeeded)) {
								await transaction.commit()

								await accepted.editParent({
									content: `${icons.danger} **${member.displayName}** does not have enough storage in their inventory to complete this trade (required: **${player2SlotsNeeded}** slots).`,
									components: disableAllComponents(CONFIRM_BUTTONS)
								})
								return
							}

							// transfer loot
							await removeMoney(transaction.query, ctx.user.id, player1Money)
							await removeMoney(transaction.query, member.id, player2Money)
							await addMoney(transaction.query, ctx.user.id, player2Money)
							await addMoney(transaction.query, member.id, player1Money)

							// set trade cd
							await createCooldown(transaction.query, ctx.user.id, 'trade', tradeCooldown)
							await createCooldown(transaction.query, member.id, 'trade', tradeCooldown)

							for (const item of verifiedPlayer1Items) {
								if (player1Backpack.items.some(itm => itm.row.id === item.id)) {
									await removeItemFromBackpack(transaction.query, item.id)
								}
								else if (player1Stash.items.some(itm => itm.row.id === item.id)) {
									await removeItemFromStash(transaction.query, item.id)
								}

								await addItemToBackpack(transaction.query, member.id, item.id)
							}

							for (const item of verifiedPlayer2Items) {
								if (player2Backpack.items.some(itm => itm.row.id === item.id)) {
									await removeItemFromBackpack(transaction.query, item.id)
								}
								else if (player2Stash.items.some(itm => itm.row.id === item.id)) {
									await removeItemFromStash(transaction.query, item.id)
								}

								await addItemToBackpack(transaction.query, ctx.user.id, item.id)
							}

							await transaction.commit()
							await accepted.editParent({
								content: `${icons.checkmark} Trade completed!`,
								components: disableAllComponents(CONFIRM_BUTTONS)
							})

							if (webhooks.bot_logs.id && webhooks.bot_logs.token) {
								try {
									await this.app.bot.executeWebhook(webhooks.bot_logs.id, webhooks.bot_logs.token, {
										embeds: [
											this.getTradeLogEmbed(
												ctx.guildID,
												ctx.member,
												member,
												player1Money,
												player2Money,
												verifiedPlayer1Items,
												verifiedPlayer2Items,
												player1Data,
												player2Data
											).embed
										]
									})
								}
								catch (err) {
									logger.warn(err)
								}
							}
						}
						catch (err) {
							await acceptedMessage.edit({
								content: `${icons.danger} **${otherPlayer.displayName}** did not accept the trade.`,
								components: disableAllComponents(CONFIRM_BUTTONS)
							})
						}
					}
				}
				catch (err) {
					tradeActive = false
					await botMessage.edit({
						content: `${icons.danger} Trade timed out.`,
						components: [{
							type: ComponentType.ACTION_ROW,
							components: disableAllComponents(TRADE_BUTTONS())
						}]
					})
				}
			}
		}
		catch (err) {
			await botMessage.edit({
				content: `${icons.danger} **${member.displayName}** did not respond to the trade invite.`,
				components: disableAllComponents(CONFIRM_BUTTONS)
			})
		}
	}

	getTradeEmbed (
		player1: ResolvedMember,
		player2: ResolvedMember,
		player1Money: number,
		player2Money: number,
		player1Items: ItemRow[],
		player2Items: ItemRow[],
		player1Row: UserRow,
		player2Row: UserRow
	): Embed {
		const player1ItemData = getItems(player1Items)
		const player2ItemData = getItems(player2Items)
		const tradeMoneyLimit = this.getMoneyLimit(player1Row, player2Row)
		const tradeItemLimit = this.getItemLimit(player1Row, player2Row)

		const tradeEmb = new Embed()
			.setDescription(`**Trade between <@${player1.id}> (Level ${player1Row.level}) & <@${player2.id}> (Level ${player2Row.level})**\n\n${icons.information} Use the buttons below to add items/money to the trade.` +
				`\n${icons.information} The limit on how much copper/items you can trade is based on the user with the **lowest level** (higher level = higher limit).`)
			.addField(`${player1.displayName}'s Offer`, `${formatMoney(player1Money)} / ${formatNumber(tradeMoneyLimit)} limit`, true)
			.addField(`${player2.displayName}'s Offer`, `${formatMoney(player2Money)} / ${formatNumber(tradeMoneyLimit)} limit`, true)
			.addBlankField(true)
			.addField(`Items (${player1ItemData.items.length} / ${tradeItemLimit} items max)`,
				player1ItemData.items.length ?
					`${player1ItemData.items.map(i => getItemDisplay(i.item, i.row, { showEquipped: false })).join('\n')}\n\nThese items take up **${player1ItemData.slotsUsed}** slots` :
					'No items added', true)
			.addField(`Items (${player2ItemData.items.length} / ${tradeItemLimit} items max)`,
				player2ItemData.items.length ?
					`${player2ItemData.items.map(i => getItemDisplay(i.item, i.row, { showEquipped: false })).join('\n')}\n\nThese items take up **${player2ItemData.slotsUsed}** slots` :
					'No items added', true)
			.addBlankField(true)

		return tradeEmb
	}

	getTradeLogEmbed (
		guildID: string,
		player1: ResolvedMember,
		player2: ResolvedMember,
		player1Money: number,
		player2Money: number,
		player1Items: ItemRow[],
		player2Items: ItemRow[],
		player1Row: UserRow,
		player2Row: UserRow
	): Embed {
		const player1ItemData = getItems(player1Items)
		const player2ItemData = getItems(player2Items)
		const tradeMoneyLimit = this.getMoneyLimit(player1Row, player2Row)
		const tradeItemLimit = this.getItemLimit(player1Row, player2Row)

		const logEmb = new Embed()
			.setTitle('Trade Log')
			.setDescription(`${player1.user.username}#${player1.user.discriminator} (Level ${player1Row.level})\n\`\`\`\n` +
				`ID: ${player1.id}\nDiscord Created: ${formatTime(Date.now() - getDiscordUserAge(player1.id).getTime())} ago\n` +
				`Bot Account Created: ${formatTime(Date.now() - player1Row.createdAt.getTime())} ago\`\`\`` +
				`\n${player2.user.username}#${player2.user.discriminator} (Level ${player2Row.level})\n\`\`\`\n` +
				`ID: ${player2.id}\nDiscord Created: ${formatTime(Date.now() - getDiscordUserAge(player2.id).getTime())} ago\n` +
				`Bot Account Created: ${formatTime(Date.now() - player2Row.createdAt.getTime())} ago\`\`\``)
			.addField(`${player1.user.username}#${player1.user.discriminator}'s Offer`, `${formatMoney(player1Money)} / ${formatNumber(tradeMoneyLimit)} limit`, true)
			.addField(`${player2.user.username}#${player2.user.discriminator}'s Offer`, `${formatMoney(player2Money)} / ${formatNumber(tradeMoneyLimit)} limit`, true)
			.addBlankField(true)
			.addField(`Items (${player1ItemData.items.length} / ${tradeItemLimit} items max)`,
				player1ItemData.items.length ?
					`${player1ItemData.items.map(i => getItemDisplay(i.item, i.row, { showEquipped: false })).join('\n')}\n\nThese items take up **${player1ItemData.slotsUsed}** slots` :
					'No items added', true)
			.addField(`Items (${player2ItemData.items.length} / ${tradeItemLimit} items max)`,
				player2ItemData.items.length ?
					`${player2ItemData.items.map(i => getItemDisplay(i.item, i.row, { showEquipped: false })).join('\n')}\n\nThese items take up **${player2ItemData.slotsUsed}** slots` :
					'No items added', true)
			.addBlankField(true)
			.setFooter(`Guild ID: ${guildID}`)

		return logEmb
	}

	async awaitMoneyInput (channelID: string, userID: string, usersMoneyInTrade: number, tradeMoneyLimit: number): Promise<number> {
		return new Promise((resolve, reject) => {
			const { collector, stopCollector } = this.app.msgCollector.createChannelCollector(channelID, m => m.author.id === userID, 30000)

			collector.on('collect', async m => {
				try {
					const args = m.content.split(/ +/)
					const number = getNumber(args[0])

					if (args[0] === 'cancel') {
						stopCollector()
						reject(new Error('User did not complete their action'))
						return
					}
					else if (!number) {
						await reply(m, {
							content: `${icons.warning} That's not a valid number. Try again.`
						})
						return
					}

					const userData = await getUserRow(query, userID)

					if (!userData) {
						stopCollector()
						reject(new Error('User does not have account'))
						return
					}

					const maxPlayerCanAdd = Math.min(userData.money - usersMoneyInTrade, tradeMoneyLimit - usersMoneyInTrade)
					if (number > maxPlayerCanAdd) {
						await reply(m, {
							content: `${icons.warning} You can only add **${formatMoney(maxPlayerCanAdd)}** more to this trade (max limit of ${formatMoney(tradeMoneyLimit)}). Try again.`
						})
						return
					}

					stopCollector()
					resolve(number)
				}
				catch (err) {
					logger.warn(err)
				}
			})
			collector.on('end', m => {
				if (m === 'time') {
					reject(m)
				}
			})
		})
	}

	async awaitItemInput (channelID: string, userID: string, usersItemsInTrade: ItemRow[]): Promise<ItemWithRow<ItemRow>> {
		return new Promise((resolve, reject) => {
			const { collector, stopCollector } = this.app.msgCollector.createChannelCollector(channelID, m => m.author.id === userID, 30000)

			collector.on('collect', async m => {
				try {
					const args = m.content.split(/ +/)
					const itemID = getNumber(args[0])

					if (args[0] === 'cancel') {
						stopCollector()
						reject(new Error('User did not complete their action'))
						return
					}
					else if (!itemID) {
						await reply(m, {
							content: `${icons.warning} That's not a valid item ID. Try again.`
						})
						return
					}

					const backpackRows = await getUserBackpack(query, userID)
					const stashRows = await getUserStash(query, userID)
					const userBackpack = getItems(backpackRows)
					const userStash = getItems(stashRows)
					const itemToAdd = userBackpack.items.find(itm => itm.row.id === itemID) || userStash.items.find(itm => itm.row.id === itemID)

					if (!itemToAdd) {
						await reply(m, {
							content: `${icons.warning} You don't have an item with the ID **${itemID}** in your inventory or stash. You can find the IDs of items in your \`/inventory\` or \`/stash\`.`
						})
						stopCollector()
						reject(new Error('User did not own item with ID'))
						return
					}
					else if (usersItemsInTrade.some(itm => itm.id === itemToAdd.row.id)) {
						await reply(m, {
							content: `${icons.warning} You have already added your ${getItemDisplay(itemToAdd.item, itemToAdd.row, { showEquipped: false })} to the trade.`
						})
						stopCollector()
						reject(new Error('User tried adding existing item to trade'))
						return
					}

					stopCollector()
					resolve(itemToAdd)
				}
				catch (err) {
					logger.warn(err)
				}
			})
			collector.on('end', m => {
				if (m === 'time') {
					reject(m)
				}
			})
		})
	}

	getMoneyLimit (player1Row: UserRow, player2Row: UserRow): number {
		const lowestLvl = Math.min(player1Row.level, player2Row.level)

		return Math.min(lowestLvl * 100, 10000)
	}

	getItemLimit (player1Row: UserRow, player2Row: UserRow): number {
		const lowestLvl = Math.min(player1Row.level, player2Row.level)

		// the max 10 item limit is to prevent hitting discord character limit
		return Math.min(lowestLvl * 1, 10)
	}
}

export default TradeCommand
