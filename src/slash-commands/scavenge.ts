import { SlashCreator, CommandContext, ComponentType, Message, CommandOptionType, MessageOptions, ComponentButton, ButtonStyle, ComponentActionRow, AutocompleteContext } from 'slash-create'
import App from '../app'
import { icons, webhooks } from '../config'
import { NPC } from '../types/NPCs'
import { isValidLocation, locations } from '../resources/locations'
import CustomSlashCommand from '../structures/CustomSlashCommand'
import Embed from '../structures/Embed'
import { Item, MeleeWeapon, RangedWeapon, Stimulant, ThrowableWeapon } from '../types/Items'
import { Area, Location } from '../types/Locations'
import { addItemToBackpack, createItem, deleteItem, getUserBackpack, lowerItemDurability } from '../utils/db/items'
import { beginTransaction, query } from '../utils/db/mysql'
import { addHealth, addXp, getUserRow, increaseKills, setFighting } from '../utils/db/players'
import { getUserQuest, increaseProgress } from '../utils/db/quests'
import { backpackHasSpace, getBackpackLimit, getEquips, getItemDisplay, getItems, sortItemsByDurability, sortItemsByLevel } from '../utils/itemUtils'
import { logger } from '../utils/logger'
import getRandomInt from '../utils/randomInt'
import { combineArrayWithAnd, combineArrayWithOr, formatHealth, getAfflictionEmoji, getBodyPartEmoji, getRarityDisplay } from '../utils/stringUtils'
import { BackpackItemRow, ItemRow, ItemWithRow, UserRow } from '../types/mysql'
import { Affliction, AfflictionName, afflictions } from '../resources/afflictions'
import { addStatusEffects, getEffectsDisplay } from '../utils/playerUtils'
import { ResolvedMember } from 'slash-create/lib/structures/resolvedMember'
import { awaitPlayerChoices, getAttackDamage, getAttackString, getBodyPartHit, PlayerChoice } from '../utils/duelUtils'
import { BLUE_BUTTON, CONFIRM_BUTTONS, GRAY_BUTTON, GREEN_BUTTON, NEXT_BUTTON, PREVIOUS_BUTTON, RED_BUTTON } from '../utils/constants'
import { attackPlayer, getMobChoice, getMobDisplay, getMobDrop, getMobDisplayReference } from '../utils/npcUtils'
import { createCooldown, formatTime, getCooldown } from '../utils/db/cooldowns'
import { allQuests } from '../resources/quests'
import { disableAllComponents } from '../utils/messageUtils'
import SellCommand from './sell'

class ScavengeCommand extends CustomSlashCommand<'scavenge'> {
	constructor (creator: SlashCreator, app: App) {
		super(creator, app, {
			name: 'scavenge',
			description: 'Explore areas for loot. You may encounter threats, so be prepared!',
			longDescription: 'Search your region for areas to explore. Different areas have different loot and enemies. Some areas may also require you to use a key to scavenge them.' +
				' Once you\'ve scavenged enough, try to fight the region boss with `/boss` and progress to regions with better items.',
			options: [
				{
					type: CommandOptionType.STRING,
					name: 'area',
					description: 'Name of the area you want to scavenge.',
					required: false,
					autocomplete: true
				}
			],
			category: 'scavenging',
			guildModsOnly: false,
			worksInDMs: false,
			worksDuringDuel: false,
			guildIDs: [],
			starterTip: 'This is the main way to find gear. Choose an area to scavenge for items or fight the mobs protecting areas.' +
				` Once you kill a mob, you'll be able to scavenge the area they were gaurding.\n\n${icons.information} *You can also skip the navigation menu` +
				' by doing `/scavenge area`, for all you command spammers out there :)*'
		})

		this.filePath = __filename
	}

	async run (ctx: CommandContext): Promise<void> {
		if (!ctx.member) {
			throw new Error('Member not attached to interaction')
		}

		const preUserData = (await getUserRow(query, ctx.user.id))!
		let botMessage: Message | undefined

		if (!isValidLocation(preUserData.currentLocation)) {
			await ctx.send({
				content: `${icons.warning} You need to travel to a region. Use the \`/travel\` command to travel to a region you want to scavenge.`
			})
			return
		}
		else if (preUserData.health / preUserData.maxHealth <= 0.5) {
			botMessage = await ctx.send({
				content: `${icons.warning} Hey <@${ctx.user.id}>, you only have ${formatHealth(preUserData.health, preUserData.maxHealth)} **${preUserData.health} / ${preUserData.maxHealth}** HP! It's recommended that you \`/heal\` before starting a fight.` +
					'\n\n**Continue anyways?**',
				components: CONFIRM_BUTTONS
			}) as Message

			try {
				const confirmed = (await this.app.componentCollector.awaitClicks(botMessage.id, i => i.user.id === ctx.user.id, 30000))[0]
				await confirmed.acknowledge()

				if (confirmed.customID !== 'confirmed') {
					await confirmed.editParent({
						content: `${icons.checkmark} Scavenge canceled. Go heal yourself and come back when you're ready.`,
						components: []
					})
					return
				}
			}
			catch (err) {
				await botMessage.edit({
					content: `${icons.danger} Scavenge timed out. Go heal yourself and come back when you're ready.`,
					components: disableAllComponents(CONFIRM_BUTTONS)
				})
				return
			}
		}

		const preBackpackRows = await getUserBackpack(query, ctx.user.id)

		if (!backpackHasSpace(preBackpackRows, 0)) {
			botMessage = await this.sendMessage(ctx, {
				content: `${icons.warning} You are overweight, you will need to clear some space in your inventory before scavenging.`,
				components: [{
					type: ComponentType.ACTION_ROW,
					components: [GRAY_BUTTON('Sell Items', 'sell')]
				}]
			}, botMessage) as Message

			try {
				const confirmed = (await this.app.componentCollector.awaitClicks(botMessage.id, i => i.user.id === ctx.user.id))[0]

				if (confirmed.customID === 'sell') {
					const sellCommand = new SellCommand(this.app.slashCreator, this.app)

					await confirmed.editParent({
						components: [{
							type: ComponentType.ACTION_ROW,
							components: [GREEN_BUTTON('Sell Items', 'sell', true)]
						}]
					})
					await sellCommand.run(ctx)
				}
			}
			catch (err) {
				// continue
				await botMessage.edit({
					components: disableAllComponents(botMessage.components)
				})
			}
			return
		}

		const location = locations[preUserData.currentLocation]
		let areaChoice = location.areas.find(a => a.display.toLowerCase() === (ctx.options.area as string | undefined)?.toLowerCase())
		let preMobCD

		if (!areaChoice && ctx.options.area) {
			const errorEmbed = new Embed()
				.setDescription(`${location.icon} **${location.display}** has the following areas available:` +
					`\n\n${location.areas.map(a => a.display).join('\n')}`)
				.addField('\u200b', `${icons.information} You could also do \`/scavenge\` alone to select an area using an interactive menu.`)

			await this.sendMessage(ctx, {
				content: `${icons.error_pain} Not sure which area you're trying to scavenge...`,
				embeds: [errorEmbed.embed],
				components: []
			}, botMessage)
			return
		}
		else if (!areaChoice) {
			try {
				const choice = await this.getAreaChoice(ctx, location, preBackpackRows, botMessage)
				botMessage = await ctx.fetch()
				areaChoice = choice.area
				preMobCD = choice.areaMobCD
			}
			catch (err) {
				return
			}
		}

		const transaction = await beginTransaction()
		const userData = (await getUserRow(transaction.query, ctx.user.id, true))!

		if (userData.fighting) {
			await transaction.commit()

			await this.sendMessage(ctx, {
				content: `${icons.danger} You cannot scavenge while in a duel.`,
				components: [],
				embeds: []
			}, botMessage)
			return
		}

		const areaCD = await getCooldown(transaction.query, ctx.user.id, `scavenge-${location.display}-${areaChoice.display}`, true)
		const mobKilledCD = await getCooldown(transaction.query, ctx.user.id, `npcdead-${location.display}-${areaChoice.display}`, true)

		if (areaCD) {
			await transaction.commit()

			await this.sendMessage(ctx, {
				content: `${icons.timer} You recently scavenged **${areaChoice.display}**, you can scavenge this area again in **${areaCD}**.`,
				components: [],
				embeds: []
			}, botMessage)
			return
		}
		else if (areaChoice.npc && preMobCD && !mobKilledCD) {
			await transaction.commit()

			await this.sendMessage(ctx, {
				content: `${icons.error_pain} Unfortunately, a mob arrived to **${areaChoice.display}** while you were deciding which area to scavenge.`,
				components: [],
				embeds: []
			}, botMessage)
			return
		}

		const backpackRows = await getUserBackpack(transaction.query, ctx.user.id, true)
		const preUserQuest = await getUserQuest(transaction.query, ctx.user.id, true)
		const backpackData = getItems(backpackRows)
		const userEquips = getEquips(backpackRows)
		const keysRequired = (!areaChoice.keyUsedToFightNPC && (!areaChoice.npc || mobKilledCD)) || (areaChoice.keyUsedToFightNPC && (!areaChoice.npc || !mobKilledCD)) ?
			areaChoice.requiresKey :
			undefined
		const hasRequiredKey = sortItemsByDurability(backpackData.items, true).reverse().find(i => keysRequired?.some(key => i.item.name === key.name))
		const backpackLimit = getBackpackLimit(userEquips.backpack?.item)

		// verify user has space needed to scavenge area, factoring in if they will lose a key from the scavenge
		if (
			backpackData.slotsUsed -
			(
				hasRequiredKey &&
				(!hasRequiredKey.row.durability || hasRequiredKey.row.durability - 1 <= 0) ? hasRequiredKey.item.slotsUsed : 0
			) > backpackLimit
		) {
			await transaction.commit()

			await this.sendMessage(ctx, {
				content: `${icons.danger} You don't have enough space in your inventory to scavenge **${areaChoice.display}**. Sell items to clear up some space.`,
				components: [],
				embeds: []
			}, botMessage)
			return
		}

		else if (keysRequired && !hasRequiredKey) {
			await transaction.commit()

			await this.sendMessage(ctx, {
				content: `${icons.information} You need a ${combineArrayWithOr(keysRequired.map(key => getItemDisplay(key)))} to scavenge **${areaChoice.display}**.`,
				components: [],
				embeds: []
			}, botMessage)
			return
		}

		// lower durability or remove key
		else if (hasRequiredKey) {
			if (!hasRequiredKey.row.durability || hasRequiredKey.row.durability - 1 <= 0) {
				await deleteItem(transaction.query, hasRequiredKey.row.id)
			}
			else {
				await lowerItemDurability(transaction.query, hasRequiredKey.row.id, 1)
			}
		}

		if (preUserQuest?.questType === 'Scavenge With A Key' || preUserQuest?.questType === 'Scavenge') {
			const quest = allQuests.find(q => q.id === preUserQuest.questId)

			if (preUserQuest.progress < preUserQuest.progressGoal) {
				if (
					(
						(!areaChoice.npc || mobKilledCD) &&
						quest &&
						quest.questType === 'Scavenge With A Key' &&
						hasRequiredKey &&
						quest.key.name === hasRequiredKey.item.name
					) ||
					preUserQuest.questType === 'Scavenge'
				) {
					await increaseProgress(transaction.query, ctx.user.id, 1)
				}
			}
		}

		// player scavenges without encountering mob
		if (!areaChoice.npc || mobKilledCD) {
			const scavengedLoot: { rarity: string, item: Item, row: ItemRow }[] = []
			let xpEarned = 0

			for (let i = 0; i < areaChoice.loot.rolls; i++) {
				const randomLoot = this.getRandomItem(areaChoice)

				if (randomLoot.item) {
					const itemRow = await createItem(transaction.query, randomLoot.item.name, { durability: randomLoot.item.durability })

					xpEarned += randomLoot.xp

					scavengedLoot.push({
						item: randomLoot.item,
						row: itemRow,
						rarity: randomLoot.rarityDisplay
					})

					await addItemToBackpack(transaction.query, ctx.user.id, itemRow.id)

					// check if users backpack has space for another item, otherwise stop scavenging
					if (
						backpackData.slotsUsed + scavengedLoot.reduce((prev, curr) => prev + curr.item.slotsUsed, 0) -
						(
							hasRequiredKey &&
							(!hasRequiredKey.row.durability || hasRequiredKey.row.durability - 1 <= 0) ? hasRequiredKey.item.slotsUsed : 0
						) >= backpackLimit
					) {
						break
					}
				}
			}

			await createCooldown(transaction.query, ctx.user.id, `scavenge-${location.display}-${areaChoice.display}`, areaChoice.scavengeCooldown)
			await addXp(transaction.query, ctx.user.id, xpEarned)
			await transaction.commit()

			if (!scavengedLoot.length) {
				await this.sendMessage(ctx, {
					content: `You ${hasRequiredKey ?
						`use your ${getItemDisplay(hasRequiredKey.item, { ...hasRequiredKey.row, durability: hasRequiredKey.row.durability ? hasRequiredKey.row.durability - 1 : undefined })} to ` :
						''}scavenge **${areaChoice.display}** and find:\n\n**nothing of value!**\n${icons.xp_star}***+${xpEarned}** xp!*`,
					components: [],
					embeds: []
				}, botMessage)
				return
			}

			botMessage = await this.sendMessage(ctx, {
				content: `You ${hasRequiredKey ?
					`use your ${getItemDisplay(hasRequiredKey.item, { ...hasRequiredKey.row, durability: hasRequiredKey.row.durability ? hasRequiredKey.row.durability - 1 : undefined })} to ` :
					''}scavenge **${areaChoice.display}** and find:\n\n${scavengedLoot.map(itm => `${icons.loading} ${itm.rarity} *examining...*`).join('\n')}` +
					`\n${icons.xp_star}***+???** xp!*`,
				components: [],
				embeds: []
			}, botMessage) as Message

			for (let i = 0; i < scavengedLoot.length; i++) {
				setTimeout(async () => {
					try {
						const unhiddenItems = scavengedLoot.slice(0, i + 1)
						const hiddenItems = scavengedLoot.slice(i + 1)
						const lootedMessage = `You ${hasRequiredKey ?
							`use your ${getItemDisplay(hasRequiredKey.item, { ...hasRequiredKey.row, durability: hasRequiredKey.row.durability ? hasRequiredKey.row.durability - 1 : undefined })} to ` :
							''}scavenge **${areaChoice!.display}** and find:\n\n${unhiddenItems.map(itm => `${itm.rarity} ${getItemDisplay(itm.item, itm.row)}`).join('\n')}` +
							`${hiddenItems.length ? `\n${hiddenItems.map(itm => `${icons.loading} ${itm.rarity} *examining...*`).join('\n')}` : ''}` +
							`\n${unhiddenItems.length === scavengedLoot.length ? `${icons.xp_star}***+${xpEarned}** xp!*` : `${icons.xp_star}***+???** xp!*`}`

						await this.sendMessage(ctx, {
							content: `${lootedMessage}` +
								`${unhiddenItems.length === scavengedLoot.length ? `\n\n${icons.checkmark} These items were added to your inventory.` : ''}`,
							components: [],
							embeds: []
						}, botMessage)
					}
					catch (err) {
						logger.warn(err)
					}
				}, 1500 * (i + 1))
			}
			return
		}

		if (this.app.channelsWithActiveDuel.has(ctx.channelID)) {
			await transaction.commit()

			await this.sendMessage(ctx, {
				content: `${icons.error_pain} There is already another fight occuring in this channel! Wait for other scavengers to finish their fight or head to a different channel.`,
				components: [],
				embeds: []
			}, botMessage)
			return
		}

		// player encountered mob
		await setFighting(transaction.query, ctx.user.id, true)
		await transaction.commit()

		const npc = areaChoice.npc
		const playerChoices = new Map<string, PlayerChoice>()
		const playerStimulants: Stimulant[] = []
		const playerAfflictions: Affliction[] = []
		const npcStimulants: Stimulant[] = []
		const npcAfflictions: Affliction[] = []
		let npcHealth = npc.health
		let turnNumber = 1
		let duelIsActive = true

		this.app.channelsWithActiveDuel.add(ctx.channelID)

		botMessage = await this.sendMessage(ctx, {
			content: `${icons.danger} <@${ctx.user.id}>, You ${hasRequiredKey ?
				`use your ${getItemDisplay(hasRequiredKey.item, { ...hasRequiredKey.row, durability: hasRequiredKey.row.durability ? hasRequiredKey.row.durability - 1 : undefined })} to ` :
				''}try and scavenge **${areaChoice.display}** but **ENCOUNTER A ${npc.type.toUpperCase()}!**`,
			embeds: [
				this.getMobDuelEmbed(
					ctx.member,
					npc,
					userData,
					npcHealth,
					backpackRows,
					1,
					playerStimulants,
					npcStimulants,
					playerAfflictions,
					npcAfflictions
				).embed
			],
			components: [{
				type: ComponentType.ACTION_ROW,
				components: [GRAY_BUTTON('Attack', 'attack', false, '🗡️'), GRAY_BUTTON('Use Medical Item', 'heal', false, '🩹'), GRAY_BUTTON('Use Stimulant', 'stimulant', false, '💉'), RED_BUTTON('Try to Flee', 'flee')]
			}]
		}, botMessage) as Message

		while (duelIsActive) {
			try {
				await awaitPlayerChoices(this.app.componentCollector, botMessage, playerChoices, [
					{ member: ctx.member, stims: playerStimulants, afflictions: playerAfflictions }
				], turnNumber)

				const playerChoice = playerChoices.get(ctx.user.id)
				const npcChoice = getMobChoice(npc, npcStimulants, npcHealth, turnNumber)
				const orderedChoices = [{ type: 'player', speed: playerChoice?.speed || 0 }, { type: 'npc', speed: npcChoice.speed }]
					.map(c => ({ ...c, random: Math.random() }))
					.sort((a, b) => {
						if (a.speed > b.speed) {
							return -1
						}
						else if (a.speed < b.speed) {
							return 1
						}

						return b.random - a.random
					})
					.map(c => ({ type: c.type }))
				const messages: string[][] = [[], []]
				const npcDisplayName = npc.boss ? `**${npc.display}**` : `the **${npc.type}**`
				const npcDisplayCapitalized = npc.boss ? `**${npc.display}**` : `The **${npc.type}**`
				let lootEmbed
				let msgContent

				for (let i = 0; i < orderedChoices.length; i++) {
					const choiceType = orderedChoices[i]

					if (choiceType.type === 'npc') {
						// npc turn

						if (npcChoice.choice === 'attack') {
							const atkTransaction = await beginTransaction()

							const playerRow = (await getUserRow(atkTransaction.query, ctx.user.id, true))!
							const playerBackpackRows = await getUserBackpack(atkTransaction.query, ctx.user.id, true)
							const attackResult = await attackPlayer(
								atkTransaction.query,
								ctx.member,
								playerRow,
								playerBackpackRows,
								npc,
								playerStimulants,
								playerAfflictions,
								npcStimulants,
								npcAfflictions
							)

							messages[i].push(...attackResult.messages)

							await atkTransaction.commit()

							if (playerRow.health - attackResult.damage <= 0) {
								// end the duel
								duelIsActive = false
								this.app.channelsWithActiveDuel.delete(ctx.channelID)

								if (!attackResult.savedByCompanion) {
									lootEmbed = new Embed()
										.setTitle('__Loot Lost__')
										.setColor(16734296)
										.setDescription(attackResult.lostItems.length ?
											`${sortItemsByLevel(attackResult.lostItems, true).slice(0, 15).map(victimItem => getItemDisplay(victimItem.item, victimItem.row, { showEquipped: false, showDurability: false })).join('\n')}` +
											`${attackResult.lostItems.length > 15 ? `\n...and **${attackResult.lostItems.length - 15}** other item${attackResult.lostItems.length - 15 > 1 ? 's' : ''}` : ''}` :
											'No items were lost.')

									if (webhooks.pvp.id && webhooks.pvp.token) {
										try {
											await this.app.bot.executeWebhook(webhooks.pvp.id, webhooks.pvp.token, {
												content: `☠️ ${npc.boss ? `**${npc.display}**` : `A **${npc.display}**`} killed **${ctx.user.username}#${ctx.user.discriminator}** at **${location.display}**!`,
												embeds: [lootEmbed.embed]
											})
										}
										catch (err) {
											logger.warn(err)
										}
									}
								}

								// break out of the loop to prevent other players turn
								break
							}
						}
						else if (npcChoice.choice === 'use a medical item') {
							const maxHeal = Math.min(npc.health - npcHealth, npcChoice.item.healsFor)
							const curedAfflictions = []

							if (npcChoice.item.curesBitten || npcChoice.item.curesBrokenArm || npcChoice.item.curesBurning) {
								for (let affIndex = npcAfflictions.length - 1; affIndex >= 0; affIndex--) {
									const affliction = npcAfflictions[affIndex]

									if (npcChoice.item.curesBitten && affliction.name === 'Bitten') {
										curedAfflictions.push(affliction)
										npcAfflictions.splice(affIndex, 1)
									}
									else if (npcChoice.item.curesBrokenArm && affliction.name === 'Broken Arm') {
										curedAfflictions.push(affliction)
										npcAfflictions.splice(affIndex, 1)
									}
									else if (npcChoice.item.curesBurning && affliction.name === 'Burning') {
										curedAfflictions.push(affliction)
										npcAfflictions.splice(affIndex, 1)
									}
								}
							}

							npcHealth += maxHeal

							messages[i].push(`${npcDisplayCapitalized} uses a ${getItemDisplay(npcChoice.item)} to heal for **${maxHeal}** health.` +
								`\n${npcDisplayCapitalized} now has ${formatHealth(npcHealth, npc.health)} **${npcHealth} / ${npc.health}** health.` +
								`${curedAfflictions.length ? `\n${npcDisplayCapitalized} cured the following afflictions: ${combineArrayWithAnd(curedAfflictions.map(a => a.name))}` : ''}`)
						}
						else if (npcChoice.choice === 'use a stimulant') {
							const effectsDisplay = getEffectsDisplay(npcChoice.item.effects)

							npcStimulants.push(npcChoice.item)

							messages[i].push(`${npcDisplayCapitalized} injects themself with ${getItemDisplay(npcChoice.item)}.` +
								`\n\n__Effects Received__\n${effectsDisplay.join('\n')}`)
						}
						else {
							messages[i].push(`${npcDisplayCapitalized} sits this turn out.`)
						}
					}
					else if (!playerChoice) {
						messages[i].push(`<@${ctx.user.id}> did not select an action.`)
					}
					else if (playerChoice.choice === 'try to flee') {
						const chance = 0.15

						if (Math.random() <= chance) {
							// success
							duelIsActive = false
							this.app.channelsWithActiveDuel.delete(ctx.channelID)
							messages[i].push(`<@${ctx.user.id}> flees from the duel! The duel has ended.`)
							await setFighting(query, ctx.user.id, false)
							break
						}
						else {
							messages[i].push(`${icons.danger} <@${ctx.user.id}> tries to flee from the duel (15% chance) but fails!`)
						}
					}
					else if (playerChoice.choice === 'use a medical item') {
						const choice = playerChoice
						const healTransaction = await beginTransaction()
						const playerData = (await getUserRow(healTransaction.query, ctx.user.id, true))!
						const playerBackpackRows = await getUserBackpack(healTransaction.query, ctx.user.id, true)
						const playerInventory = getItems(playerBackpackRows)

						const hasItem = playerInventory.items.find(itm => itm.row.id === choice.itemRow.row.id)

						if (!hasItem) {
							await healTransaction.commit()
							messages[i].push(`${icons.danger} <@${ctx.user.id}> did not have the item they wanted to heal with. Their turn has been skipped.`)
							continue
						}

						const maxHeal = Math.min(playerData.maxHealth - playerData.health, choice.itemRow.item.healsFor)
						const curedAfflictions = []

						if (!choice.itemRow.row.durability || choice.itemRow.row.durability - 1 <= 0) {
							await deleteItem(healTransaction.query, choice.itemRow.row.id)
						}
						else {
							await lowerItemDurability(healTransaction.query, choice.itemRow.row.id, 1)
						}

						if (choice.itemRow.item.curesBitten || choice.itemRow.item.curesBrokenArm || choice.itemRow.item.curesBurning) {
							for (let affIndex = playerAfflictions.length - 1; affIndex >= 0; affIndex--) {
								const affliction = playerAfflictions[affIndex]

								if (choice.itemRow.item.curesBitten && affliction.name === 'Bitten') {
									curedAfflictions.push(affliction)
									playerAfflictions.splice(affIndex, 1)
								}
								else if (choice.itemRow.item.curesBrokenArm && affliction.name === 'Broken Arm') {
									curedAfflictions.push(affliction)
									playerAfflictions.splice(affIndex, 1)
								}
								else if (choice.itemRow.item.curesBurning && affliction.name === 'Burning') {
									curedAfflictions.push(affliction)
									playerAfflictions.splice(affIndex, 1)
								}
							}
						}

						await addHealth(healTransaction.query, ctx.user.id, maxHeal)
						await healTransaction.commit()

						const itemDisplay = getItemDisplay(choice.itemRow.item, {
							...choice.itemRow.row,
							durability: choice.itemRow.row.durability ? choice.itemRow.row.durability - 1 : undefined
						}, {
							showID: false
						})

						messages[i].push(`<@${ctx.user.id}> uses a ${itemDisplay} to heal for **${maxHeal}** health.` +
							`\n**${ctx.member.displayName}** now has ${formatHealth(playerData.health + maxHeal, playerData.maxHealth)} **${playerData.health + maxHeal} / ${playerData.maxHealth}** health.` +
							`${curedAfflictions.length ? `\n**${ctx.member.displayName}** cured the following afflictions: ${combineArrayWithAnd(curedAfflictions.map(a => a.name))}` : ''}`)
					}
					else if (playerChoice.choice === 'use a stimulant') {
						const choice = playerChoice
						const stimTransaction = await beginTransaction()
						const playerBackpackRows = await getUserBackpack(stimTransaction.query, ctx.user.id, true)
						const playerInventory = getItems(playerBackpackRows)

						const hasItem = playerInventory.items.find(itm => itm.row.id === choice.itemRow.row.id)

						if (!hasItem) {
							await stimTransaction.commit()
							messages[i].push(`${icons.danger} <@${ctx.user.id}> did not have the stimulant they wanted to use. Their turn has been skipped.`)
							continue
						}

						if (!choice.itemRow.row.durability || choice.itemRow.row.durability - 1 <= 0) {
							await deleteItem(stimTransaction.query, choice.itemRow.row.id)
						}
						else {
							await lowerItemDurability(stimTransaction.query, choice.itemRow.row.id, 1)
						}

						// ensure multiple of the same stimulant don't stack
						if (!playerStimulants.includes(choice.itemRow.item)) {
							playerStimulants.push(choice.itemRow.item)
						}

						await stimTransaction.commit()

						const itemDisplay = getItemDisplay(choice.itemRow.item, {
							...choice.itemRow.row,
							durability: choice.itemRow.row.durability ? choice.itemRow.row.durability - 1 : undefined
						}, {
							showID: false
						})
						const effectsDisplay = getEffectsDisplay(choice.itemRow.item.effects)

						messages[i].push(`<@${ctx.user.id}> injects themself with ${itemDisplay}.` +
							`\n\n__Effects Received__\n${effectsDisplay.join('\n')}`)
					}
					else {
						// user chose to attack
						const atkTransaction = await beginTransaction()

						// fetch user row to prevent changes during attack
						await getUserRow(atkTransaction.query, ctx.user.id, true)

						const playerBackpackRows = await getUserBackpack(atkTransaction.query, ctx.user.id, true)
						const playerInventory = getItems(playerBackpackRows)
						const stimulantEffects = addStatusEffects(playerStimulants, playerAfflictions)
						const victimEffects = addStatusEffects(npcStimulants, npcAfflictions)
						const stimulantDamageMulti = (1 + (stimulantEffects.damageBonus / 100) - ((victimEffects.damageTaken * -1) / 100))

						const weaponChoice = playerChoice.weapon
						const hasWeapon = !weaponChoice.row || playerInventory.items.find(itm => itm.row.id === weaponChoice.row.id)
						const hasAmmo = playerInventory.items.find(itm => itm.row.id === playerChoice.ammo?.row.id)
						const bodyPartHit = getBodyPartHit(playerChoice.weapon.item.accuracy + stimulantEffects.accuracyBonus, playerChoice.limbTarget)
						const missedPartChoice = playerChoice.limbTarget && (playerChoice.limbTarget !== bodyPartHit.result || !bodyPartHit.accurate)
						const limbsHit = []
						let totalDamage

						// verify user has weapon they want to attack with
						if (!hasWeapon || !playerChoice.weapon) {
							await atkTransaction.commit()
							messages[i].push(`${icons.danger} <@${ctx.user.id}> did not have the weapon they wanted to use. Their turn has been skipped.`)
							continue
						}
						else if (playerChoice.weapon.item.type === 'Ranged Weapon') {
							if (!hasAmmo || !playerChoice.ammo) {
								await atkTransaction.commit()
								messages[i].push(`${icons.danger} <@${ctx.user.id}> did not have the ammunition they wanted to use. Their turn has been skipped.`)
								continue
							}

							await deleteItem(atkTransaction.query, playerChoice.ammo.row.id)

							if (playerChoice.ammo.item.spreadsDamageToLimbs) {
								limbsHit.push({
									damage: getAttackDamage((playerChoice.ammo.item.damage * stimulantDamageMulti) / playerChoice.ammo.item.spreadsDamageToLimbs, playerChoice.ammo.item.penetration, bodyPartHit.result, npc.armor, npc.helmet),
									limb: bodyPartHit.result
								})

								for (let i2 = 0; i2 < playerChoice.ammo.item.spreadsDamageToLimbs - 1; i2++) {
									let limb = getBodyPartHit(playerChoice.weapon.item.accuracy)

									// make sure no duplicate limbs are hit
									while (limbsHit.find(l => l.limb === limb.result)) {
										limb = getBodyPartHit(playerChoice.weapon.item.accuracy)
									}

									limbsHit.push({
										damage: getAttackDamage((playerChoice.ammo.item.damage * stimulantDamageMulti) / playerChoice.ammo.item.spreadsDamageToLimbs, playerChoice.ammo.item.penetration, limb.result, npc.armor, npc.helmet),
										limb: limb.result
									})
								}
							}
							else {
								limbsHit.push({
									damage: getAttackDamage((playerChoice.ammo.item.damage * stimulantDamageMulti), playerChoice.ammo.item.penetration, bodyPartHit.result, npc.armor, npc.helmet),
									limb: bodyPartHit.result
								})
							}

							totalDamage = limbsHit.reduce((prev, curr) => prev + curr.damage.total, 0)

							if (missedPartChoice) {
								messages[i].push(`<@${ctx.user.id}> tries to shoot ${npcDisplayName} in the ${getBodyPartEmoji(playerChoice.limbTarget!)} **${playerChoice.limbTarget}** with their ${getItemDisplay(playerChoice.weapon.item, playerChoice.weapon.row)} (ammo: ${getItemDisplay(playerChoice.ammo.item)}) **BUT MISSES!**\n`)
							}
							else {
								messages[i].push(getAttackString(playerChoice.weapon as ItemWithRow<ItemRow, RangedWeapon>, `<@${ctx.user.id}>`, npcDisplayName, limbsHit, totalDamage, playerChoice.ammo.item))
							}
						}
						else if (playerChoice.weapon.item.type === 'Throwable Weapon') {
							if (playerChoice.weapon.item.spreadsDamageToLimbs) {
								limbsHit.push({
									damage: getAttackDamage((playerChoice.weapon.item.damage * stimulantDamageMulti) / playerChoice.weapon.item.spreadsDamageToLimbs, playerChoice.weapon.item.penetration, bodyPartHit.result, npc.armor, npc.helmet),
									limb: bodyPartHit.result
								})

								for (let i2 = 0; i2 < playerChoice.weapon.item.spreadsDamageToLimbs - 1; i2++) {
									let limb = getBodyPartHit(playerChoice.weapon.item.accuracy)

									// make sure no duplicate limbs are hit
									while (limbsHit.find(l => l.limb === limb.result)) {
										limb = getBodyPartHit(playerChoice.weapon.item.accuracy)
									}

									limbsHit.push({
										damage: getAttackDamage((playerChoice.weapon.item.damage * stimulantDamageMulti) / playerChoice.weapon.item.spreadsDamageToLimbs, playerChoice.weapon.item.penetration, limb.result, npc.armor, npc.helmet),
										limb: limb.result
									})
								}
							}
							else {
								limbsHit.push({
									damage: getAttackDamage((playerChoice.weapon.item.damage * stimulantDamageMulti), playerChoice.weapon.item.penetration, bodyPartHit.result, npc.armor, npc.helmet),
									limb: bodyPartHit.result
								})
							}

							totalDamage = limbsHit.reduce((prev, curr) => prev + curr.damage.total, 0)

							if (missedPartChoice) {
								messages[i].push(`${icons.danger} <@${ctx.user.id}> tries to throw a ${getItemDisplay(playerChoice.weapon.item, playerChoice.weapon.row)} at ${npcDisplayName}'s ${getBodyPartEmoji(playerChoice.limbTarget!)} **${playerChoice.limbTarget}** **BUT MISSES!**\n`)
							}
							else {
								messages[i].push(getAttackString(playerChoice.weapon as ItemWithRow<ItemRow, ThrowableWeapon>, `<@${ctx.user.id}>`, `${npcDisplayName}`, limbsHit, totalDamage))

								if (playerChoice.weapon.item.subtype === 'Incendiary Grenade' && !npcAfflictions.includes(afflictions.Burning)) {
									messages[i].push(`${icons.postive_effect_debuff} ${npcDisplayCapitalized} is ${getAfflictionEmoji('Burning')} Burning! (${combineArrayWithAnd(getEffectsDisplay(afflictions.Burning.effects))})`)

									npcAfflictions.push(afflictions.Burning)
								}
							}
						}
						else {
							// melee weapon
							limbsHit.push({
								damage: getAttackDamage((playerChoice.weapon.item.damage * stimulantDamageMulti), playerChoice.weapon.item.penetration, bodyPartHit.result, npc.armor, npc.helmet),
								limb: bodyPartHit.result
							})
							totalDamage = limbsHit[0].damage.total

							if (missedPartChoice) {
								messages[i].push(`${icons.danger} <@${ctx.user.id}> tries to hit ${npcDisplayName} in the ${getBodyPartEmoji(playerChoice.limbTarget!)} **${playerChoice.limbTarget}** with their ${getItemDisplay(playerChoice.weapon.item, playerChoice.weapon.row)} **BUT MISSES!**\n`)
							}
							else {
								messages[i].push(getAttackString(playerChoice.weapon as ItemWithRow<ItemRow, MeleeWeapon>, `<@${ctx.user.id}>`, `${npcDisplayName}`, limbsHit, totalDamage))
							}
						}

						// remove weapon
						if (playerChoice.weapon.row && (!playerChoice.weapon.row.durability || playerChoice.weapon.row.durability - 1 <= 0)) {
							messages[i].push(`${icons.danger} **${ctx.member.displayName}**'s ${getItemDisplay(playerChoice.weapon.item)} broke from this attack.`)

							await deleteItem(atkTransaction.query, playerChoice.weapon.row.id)
						}
						else if (playerChoice.weapon.row && playerChoice.weapon.row.durability) {
							messages[i].push(`**${ctx.member.displayName}**'s ${getItemDisplay(playerChoice.weapon.item)} now has **${playerChoice.weapon.row.durability - 1}** durability.`)

							await lowerItemDurability(atkTransaction.query, playerChoice.weapon.row.id, 1)
						}

						if (!missedPartChoice) {
							for (const result of limbsHit) {
								if (result.limb === 'head' && npc.helmet) {
									messages[i].push(`${npcDisplayCapitalized}'s helmet (${getItemDisplay(npc.helmet)}) reduced the damage by **${result.damage.reduced}**.`)
								}
								else if (result.limb === 'chest' && npc.armor) {
									messages[i].push(`${npcDisplayCapitalized}'s armor (${getItemDisplay(npc.armor)}) reduced the damage by **${result.damage.reduced}**.`)
								}
								else if (result.limb === 'arm' && Math.random() <= 0.2 && !npcAfflictions.includes(afflictions['Broken Arm'])) {
									messages[i].push(`${icons.postive_effect_debuff} ${npcDisplayCapitalized}'s ${getAfflictionEmoji('Broken Arm')} arm was broken! (${combineArrayWithAnd(getEffectsDisplay(afflictions['Broken Arm'].effects))})`)

									npcAfflictions.push(afflictions['Broken Arm'])
								}
							}

							npcHealth -= totalDamage
						}

						if (!missedPartChoice && npcHealth <= 0) {
							const userQuest = await getUserQuest(atkTransaction.query, ctx.user.id, true)
							const droppedItems = []

							if (npc.armor) {
								const armorDura = getRandomInt(Math.max(1, npc.armor.durability / 4), npc.armor.durability)
								const armorRow = await createItem(atkTransaction.query, npc.armor.name, { durability: armorDura })
								await addItemToBackpack(atkTransaction.query, ctx.user.id, armorRow.id)

								droppedItems.push({
									item: npc.armor,
									row: armorRow
								})
							}

							if (npc.helmet) {
								const helmDura = getRandomInt(Math.max(1, npc.helmet.durability / 4), npc.helmet.durability)
								const helmRow = await createItem(atkTransaction.query, npc.helmet.name, { durability: helmDura })
								await addItemToBackpack(atkTransaction.query, ctx.user.id, helmRow.id)

								droppedItems.push({
									item: npc.helmet,
									row: helmRow
								})
							}

							if (npc.type === 'raider') {
								if ('ammo' in npc) {
									// drop random amount of bullets
									const ammoToDrop = getRandomInt(1, 3)

									for (let a = 0; a < ammoToDrop; a++) {
										const ammoRow = await createItem(atkTransaction.query, npc.ammo.name, { durability: npc.ammo.durability })
										await addItemToBackpack(atkTransaction.query, ctx.user.id, ammoRow.id)

										droppedItems.push({
											item: npc.ammo,
											row: ammoRow
										})
									}
								}

								// weapon durability is random
								const weapDurability = npc.weapon.durability ? getRandomInt(Math.max(1, npc.weapon.durability / 4), npc.weapon.durability) : undefined
								const weapRow = await createItem(atkTransaction.query, npc.weapon.name, { durability: weapDurability })
								await addItemToBackpack(atkTransaction.query, ctx.user.id, weapRow.id)

								droppedItems.push({
									item: npc.weapon,
									row: weapRow
								})
							}

							// roll random loot drops
							for (let l = 0; l < npc.drops.rolls; l++) {
								const lootDrop = getMobDrop(npc)

								if (lootDrop) {
									let itemDurability

									// item durability is random when dropped by npc
									if (lootDrop.item.durability) {
										itemDurability = getRandomInt(Math.max(1, lootDrop.item.durability / 4), lootDrop.item.durability)
									}

									const lootDropRow = await createItem(atkTransaction.query, lootDrop.item.name, { durability: itemDurability })
									await addItemToBackpack(atkTransaction.query, ctx.user.id, lootDropRow.id)

									droppedItems.push({
										item: lootDrop.item,
										row: lootDropRow,
										rarityDisplay: lootDrop.rarityDisplay
									})
								}
							}

							await setFighting(atkTransaction.query, ctx.user.id, false)
							await createCooldown(atkTransaction.query, ctx.user.id, `npcdead-${location.display}-${areaChoice.display}`, npc.respawnTime)
							await increaseKills(atkTransaction.query, ctx.user.id, npc.boss ? 'boss' : 'npc', 1)
							await addXp(atkTransaction.query, ctx.user.id, npc.xp)

							// check if user has any kill quests
							if (userQuest && userQuest.progress < userQuest.progressGoal) {
								if (
									(userQuest.questType === 'Boss Kills' && npc.boss) ||
									(userQuest.questType === 'Any Kills' || userQuest.questType === 'NPC Kills')
								) {
									await increaseProgress(atkTransaction.query, ctx.user.id, 1)
								}
							}

							msgContent = `<@${ctx.user.id}>, You defeated ${npcDisplayName}! You have **${formatTime(npc.respawnTime * 1000)}** to scavenge **${areaChoice.display}** before the enemy respawns.`
							messages[i].push(`☠️ ${npcDisplayCapitalized} **DIED!**`)

							// have to put loot in a separate embed to avoid character limit issues (up to 18 mob drops can be displayed by using an embed description)
							lootEmbed = new Embed()
								.setTitle('__Loot Received__')
								.setColor(9043800)
								.setDescription(`${(sortItemsByLevel(droppedItems, true) as (ItemWithRow<ItemRow> & { rarityDisplay?: string })[])
									.map(itm => 'rarityDisplay' in itm ? `${itm.rarityDisplay} ${getItemDisplay(itm.item, itm.row)}` : `${getRarityDisplay('Common')} ${getItemDisplay(itm.item, itm.row)}`).join('\n')}` +
									`\n${icons.xp_star}***+${npc.xp}** xp!*`)
						}
						else if (!missedPartChoice) {
							messages[i].push(`${npcDisplayCapitalized} is left with ${formatHealth(npcHealth, npc.health)} **${npcHealth}** health.`)
						}

						// commit changes
						await atkTransaction.commit()

						if (!missedPartChoice && npcHealth <= 0) {
							// end the duel
							duelIsActive = false
							this.app.channelsWithActiveDuel.delete(ctx.channelID)

							if (webhooks.pvp.id && webhooks.pvp.token) {
								try {
									await this.app.bot.executeWebhook(webhooks.pvp.id, webhooks.pvp.token, {
										content: `☠️ **${ctx.user.username}#${ctx.user.discriminator}** killed ${npc.boss ? `**${npc.display}**` : `a **${npc.display}**`} at **${location.display}** using their ${getItemDisplay(playerChoice.weapon.item)}` +
											`${playerChoice.ammo ? ` (ammo: ${getItemDisplay(playerChoice.ammo.item)})` : ''}.`,
										embeds: lootEmbed ? [lootEmbed.embed] : undefined
									})
								}
								catch (err) {
									logger.warn(err)
								}
							}

							// break out of the loop to prevent other players turn
							break
						}
					}
				}

				const actionsEmbed = new Embed()
					.setTitle(`Duel - ${ctx.member.displayName} vs ${npc.display} (${npc.boss ? 'boss' : 'mob'})`)
					.setFooter(`Turn #${turnNumber} · actions are ordered by speed (higher speed action goes first)`)

				const filteredMessages = messages.filter(m => m.length)
				for (let i = 0; i < filteredMessages.length; i++) {
					actionsEmbed.addField('\u200b', `${i + 1}. ${filteredMessages[i].join('\n')}`)
				}

				await ctx.sendFollowUp({
					content: msgContent,
					embeds: lootEmbed ? [actionsEmbed.embed, lootEmbed.embed] : [actionsEmbed.embed]
				})
			}
			catch (err) {
				logger.error(err)

				duelIsActive = false
				this.app.channelsWithActiveDuel.delete(ctx.channelID)
				await setFighting(query, ctx.user.id, false)

				try {
					await ctx.sendFollowUp({
						content: `${icons.danger} <@${ctx.user.id}>, An error occured, the fight had to be ended. Sorry about that...`
					})
				}
				catch (msgErr) {
					logger.warn(msgErr)
				}
			}

			playerChoices.clear()

			if (duelIsActive) {
				if (turnNumber >= 20) {
					duelIsActive = false
					this.app.channelsWithActiveDuel.delete(ctx.channelID)
					await setFighting(query, ctx.user.id, false)
					await ctx.sendFollowUp({
						content: `${icons.danger} <@${ctx.user.id}>, **The max turn limit (20) has been reached!** The duel ends in a tie.`
					})
				}
				else {
					const playerDataV = (await getUserRow(query, ctx.user.id))!
					const playerInventoryV = await getUserBackpack(query, ctx.user.id)

					turnNumber += 1
					botMessage = await ctx.sendFollowUp({
						content: `<@${ctx.user.id}>, Turn #${turnNumber} - select your action:`,
						embeds: [
							this.getMobDuelEmbed(
								ctx.member,
								npc,
								playerDataV,
								npcHealth,
								playerInventoryV,
								turnNumber,
								playerStimulants,
								npcStimulants,
								playerAfflictions,
								npcAfflictions
							).embed
						],
						components: [{
							type: ComponentType.ACTION_ROW,
							components: [GRAY_BUTTON('Attack', 'attack', false, '🗡️'), GRAY_BUTTON('Use Medical Item', 'heal', false, '🩹'), GRAY_BUTTON('Use Stimulant', 'stimulant', false, '💉'), RED_BUTTON('Try to Flee', 'flee')]
						}]
					})
				}
			}
		}
	}

	async getAreaChoice (ctx: CommandContext, location: Location, backpackRows: BackpackItemRow[], previousBotMessage?: Message): Promise<{ area: Area, areaMobCD?: string }> {
		const userBackpack = getItems(backpackRows)
		let page = 0
		let currentAreaInfo: { page: Embed, button: ComponentButton, mobCD?: string }
		let components: ComponentActionRow[] = []

		// so area information can be updated as user scrolls through pages
		const getAreaInfo = async (area: Area): Promise<{ page: Embed, button: ComponentButton, mobCD?: string }> => {
			const areaCD = await getCooldown(query, ctx.user.id, `scavenge-${location.display}-${area.display}`)
			const hasRequiredKey = sortItemsByDurability(userBackpack.items, true).reverse().find(itm => area.requiresKey?.some(key => itm.item.name === key.name))
			const areaEmbed = new Embed()
				.setTitle(`${location.display} - ${area.display}`)
			const requirements = []
			let scavengeButton = GREEN_BUTTON('Scavenge', 'scavenge')
			let mobCD

			if (area.image) {
				areaEmbed.setThumbnail(area.image)
			}

			if (area.requiresKey && hasRequiredKey && !area.keyUsedToFightNPC) {
				const iconID = hasRequiredKey.item.icon.match(/:([0-9]*)>/)

				scavengeButton = {
					type: ComponentType.BUTTON,
					label: 'Use Key',
					custom_id: 'scavenge',
					style: ButtonStyle.PRIMARY,
					emoji: iconID ? {
						id: iconID[1],
						name: hasRequiredKey.item.name
					} : undefined
				}
				requirements.push(`${icons.checkmark} ~~Have a ${combineArrayWithOr(area.requiresKey.map(key => getItemDisplay(key)))} in your inventory.~~`)
			}
			else if (area.requiresKey && !area.keyUsedToFightNPC) {
				scavengeButton = BLUE_BUTTON('Use Key', 'scavenge', true)
				requirements.push(`${icons.cancel} Have a ${combineArrayWithOr(area.requiresKey.map(key => getItemDisplay(key)))} in your inventory.`)
			}

			if (area.npc) {
				const mobKilledCD = await getCooldown(query, ctx.user.id, `npcdead-${location.display}-${area.display}`)

				if (!mobKilledCD) {
					if (area.requiresKey && hasRequiredKey && area.keyUsedToFightNPC) {
						const iconID = hasRequiredKey.item.icon.match(/:([0-9]*)>/)

						areaEmbed.addField(`Guarded by ${getMobDisplayReference(area.npc, { lowerCase: true })}!`,
							getMobDisplay(area.npc, area.npc.health).join('\n'),
							true)
						requirements.push(`${icons.cancel} Defeat ${getMobDisplayReference(area.npc, { specific: true, lowerCase: true })}.`)
						scavengeButton = {
							type: ComponentType.BUTTON,
							label: `Use key to fight ${area.npc.display}`,
							custom_id: 'scavenge',
							style: ButtonStyle.DESTRUCTIVE,
							emoji: iconID ? {
								id: iconID[1],
								name: hasRequiredKey.item.name
							} : undefined
						}
						requirements.push(`${icons.checkmark} ~~Have a ${combineArrayWithOr(area.requiresKey.map(key => getItemDisplay(key)))} in your inventory.~~`)
					}
					else if (area.requiresKey && area.keyUsedToFightNPC) {
						areaEmbed.addField(`Guarded by ${area.npc.display.replace(/\w/g, '?')}`,
							getMobDisplay(area.npc, area.npc.health).join('\n'),
							true)
						requirements.push(`${icons.cancel} Defeat ${area.npc.display.replace(/\w/g, '?')}.`)
						scavengeButton = RED_BUTTON(`Use key to fight ${area.npc.display.replace(/\w/g, '?')}`, 'scavenge', true)
						requirements.push(`${icons.cancel} Have a ${combineArrayWithOr(area.requiresKey.map(key => getItemDisplay(key)))} in your inventory.`)
					}
					else {
						areaEmbed.addField(`Guarded by ${getMobDisplayReference(area.npc, { lowerCase: true })}!`,
							getMobDisplay(area.npc, area.npc.health).join('\n'),
							true)
						requirements.push(`${icons.cancel} Defeat ${getMobDisplayReference(area.npc, { specific: true, lowerCase: true })}.`)
						scavengeButton = RED_BUTTON(`Fight ${area.npc.display}`, 'scavenge', false, '🗡️')
					}
				}
				else {
					areaEmbed.addField('Mob',
						`☠️ ${getMobDisplayReference(area.npc, { specific: true })} has been defeated and won't return for **${mobKilledCD}**. Scavenge while you can!`,
						true)
					requirements.push(`${icons.checkmark} ~~Defeat ${getMobDisplayReference(area.npc, { specific: true, lowerCase: true })}.~~`)
					mobCD = mobKilledCD
				}
			}


			if (areaCD) {
				requirements.push(`${icons.cancel} Wait **${areaCD}** for loot to replenish in this area.`)
				scavengeButton = { ...scavengeButton, disabled: true, label: `${scavengeButton.label} - Available in ${areaCD}` }
			}
			else if (!areaCD && !area.requiresKey && !area.npc) {
				requirements.push('None!')
			}

			if (area.quote) {
				areaEmbed.setDescription(`**${ctx.member?.displayName || ctx.user.username}**: ${area.quote}`)
			}

			areaEmbed.addField('Requirements to Scavenge', requirements.join('\n'), true)
			areaEmbed.setFooter(`Area ${page + 1}/${location.areas.length}`)

			return {
				page: areaEmbed,
				button: scavengeButton,
				mobCD
			}
		}

		currentAreaInfo = await getAreaInfo(location.areas[page])
		components.push({
			type: ComponentType.ACTION_ROW,
			components: [
				PREVIOUS_BUTTON(true),
				NEXT_BUTTON(false),
				currentAreaInfo.button
			]
		})
		const botMessage = await this.sendMessage(ctx, {
			content: '',
			embeds: [currentAreaInfo.page.embed],
			components
		}, previousBotMessage) as Message

		return new Promise((resolve, reject) => {
			const { collector, stopCollector } = this.app.componentCollector.createCollector(botMessage.id, c => c.user.id === ctx.user.id, 60000)

			collector.on('collect', async c => {
				try {
					await c.acknowledge()

					components = []

					if (c.customID === 'previous' && page !== 0) {
						page--

						currentAreaInfo = await getAreaInfo(location.areas[page])
						components.push({
							type: ComponentType.ACTION_ROW,
							components: [
								PREVIOUS_BUTTON(page === 0),
								NEXT_BUTTON(false),
								currentAreaInfo.button
							]
						})
						await c.editParent({
							embeds: [currentAreaInfo.page.embed],
							components
						})
					}
					else if (c.customID === 'next' && page !== (location.areas.length - 1)) {
						page++

						currentAreaInfo = await getAreaInfo(location.areas[page])
						components.push({
							type: ComponentType.ACTION_ROW,
							components: [
								PREVIOUS_BUTTON(false),
								NEXT_BUTTON(page === (location.areas.length - 1)),
								currentAreaInfo.button
							]
						})
						await c.editParent({
							embeds: [currentAreaInfo.page.embed],
							components
						})
					}
					else if (c.customID === 'scavenge') {
						stopCollector()

						resolve({
							area: location.areas[page],
							areaMobCD: currentAreaInfo.mobCD
						})
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
							content: `${icons.danger} You decide against scavenging (ran out of time to select an area).`,
							components: disableAllComponents(components)
						})

						reject(msg)
					}
				}
				catch (err) {
					logger.warn(err)
				}
			})
		})
	}

	getMobDuelEmbed (
		player: ResolvedMember,
		mob: NPC,
		playerData: UserRow,
		npcHealth: number,
		playerInventory: BackpackItemRow[],
		turnNumber: number,
		playerStimulants: Stimulant[],
		npcStimulants: Stimulant[],
		playerAfflictions: Affliction[],
		npcAfflictions: Affliction[]
	): Embed {
		const playerEquips = getEquips(playerInventory)
		const playerEffects = addStatusEffects(playerStimulants, playerAfflictions)
		const npcEffects = addStatusEffects(npcStimulants, npcAfflictions)
		const playerEffectsDisplay = getEffectsDisplay(playerEffects)
		const npcEffectsDisplay = getEffectsDisplay(npcEffects)

		const duelEmb = new Embed()
			.setTitle(`Duel - ${player.displayName} vs ${mob.display} (${mob.boss ? 'boss' : 'mob'})`)
			.addField(`${player.user.username}#${player.user.discriminator} (Level ${playerData.level})`,
				`**${playerData.health} / ${playerData.maxHealth}** HP\n${formatHealth(playerData.health, playerData.maxHealth)}` +
				`\n\n__**Equipment**__\n**Backpack**: ${playerEquips.backpack ? getItemDisplay(playerEquips.backpack.item, playerEquips.backpack.row, { showEquipped: false, showID: false }) : 'None'}` +
				`\n**Helmet**: ${playerEquips.helmet ? getItemDisplay(playerEquips.helmet.item, playerEquips.helmet.row, { showEquipped: false, showID: false }) : 'None'}` +
				`\n**Body Armor**: ${playerEquips.armor ? getItemDisplay(playerEquips.armor.item, playerEquips.armor.row, { showEquipped: false, showID: false }) : 'None'}` +
				`\n\n__**Stimulants**__\n${playerStimulants.length ? playerStimulants.map(i => getItemDisplay(i)).join('\n') : 'None'}` +
				`\n\n__**Afflictions**__\n${playerAfflictions.length ? combineArrayWithAnd(playerAfflictions.map(a => `${getAfflictionEmoji(a.name as AfflictionName)} ${a.name}`)) : 'None'}` +
				`${playerEffectsDisplay.length ? `\n\n__**Effects**__\n${playerEffectsDisplay.join('\n')}` : ''}`,
				true)
			.addField(`${mob.display} (${mob.boss ? 'boss' : 'mob'})`,
				`${getMobDisplay(mob, npcHealth).join('\n')}` +
				`\n\n__**Stimulants**__\n${npcStimulants.length ? npcStimulants.map(i => getItemDisplay(i)).join('\n') : 'None'}` +
				`\n\n__**Afflictions**__\n${npcAfflictions.length ? combineArrayWithAnd(npcAfflictions.map(a => `${getAfflictionEmoji(a.name as AfflictionName)} ${a.name}`)) : 'None'}` +
				`${npcEffectsDisplay.length ? `\n\n__**Effects**__\n${npcEffectsDisplay.join('\n')}` : ''}`,
				true)
			.setFooter(`Turn #${turnNumber} / 20 max · 40 seconds to make selection`)

		if (mob.quotes && mob.quotes.length) {
			duelEmb.setDescription(`**${mob.display}**: ${mob.quotes[Math.floor(Math.random() * mob.quotes.length)]}`)
		}

		return duelEmb
	}

	/**
	 * Gets a random scavenged item from an area
	 * @param area The area to get scavenge loot for
	 * @returns An item
	 */
	getRandomItem (area: Area): { item: Item | undefined, xp: number, rarityDisplay: string } {
		const rand = Math.random()
		let randomItem
		let xpEarned
		let rarityDisplay

		if (area.loot.rarest && rand < 0.05) {
			xpEarned = area.loot.rarest.xp
			randomItem = area.loot.rarest.items[Math.floor(Math.random() * area.loot.rarest.items.length)]
			rarityDisplay = getRarityDisplay('Insanely Rare')
		}
		else if (rand < 0.60) {
			xpEarned = area.loot.common.xp
			randomItem = area.loot.common.items[Math.floor(Math.random() * area.loot.common.items.length)]
			rarityDisplay = getRarityDisplay('Common')
		}
		else if (rand < 0.85) {
			xpEarned = area.loot.uncommon.xp
			randomItem = area.loot.uncommon.items[Math.floor(Math.random() * area.loot.uncommon.items.length)]
			rarityDisplay = getRarityDisplay('Uncommon')
		}
		else {
			xpEarned = area.loot.rare.xp
			randomItem = area.loot.rare.items[Math.floor(Math.random() * area.loot.rare.items.length)]
			rarityDisplay = getRarityDisplay('Rare')
		}

		return {
			item: randomItem,
			xp: xpEarned,
			rarityDisplay
		}
	}

	/**
	 * Either edits the botMessage or sends a new response (prevents me
	 * from having to use editOriginal so I can use command handler to send messages before responding to commands)
	 * @param ctx Commands context
	 * @param options Message options
	 * @param botMessage The message bot has sent, if already responded to command
	 */
	async sendMessage (ctx: CommandContext, options: MessageOptions, botMessage?: Message): Promise<Message | boolean> {
		if (botMessage) {
			return botMessage.edit(options)
		}

		return ctx.send(options)
	}

	async autocomplete (ctx: AutocompleteContext): Promise<void> {
		const userData = (await getUserRow(query, ctx.user.id))

		if (!userData || !isValidLocation(userData.currentLocation)) {
			await ctx.sendResults([{ name: 'You need to /travel to a region first.', value: 'none' }])
			return
		}

		const location = locations[userData.currentLocation]
		const search = ctx.options[ctx.focused].toLowerCase()
		const areas = location.areas.filter(a => a.display.toLowerCase().includes(search))

		if (areas.length) {
			await ctx.sendResults(areas.slice(0, 25).map(a => ({ name: a.display, value: a.display })))
		}
		else {
			await ctx.sendResults([])
		}
	}
}

export default ScavengeCommand
