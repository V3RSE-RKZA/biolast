import { CommandOptionType, SlashCreator, CommandContext, ComponentType, ComponentSelectMenu } from 'slash-create'
import { ResolvedMember } from 'slash-create/lib/structures/resolvedMember'
import App from '../app'
import { icons, webhooks } from '../config'
import { Affliction, AfflictionName, afflictions } from '../resources/afflictions'
import { items } from '../resources/items'
import CustomSlashCommand from '../structures/CustomSlashCommand'
import Embed from '../structures/Embed'
import { MeleeWeapon, RangedWeapon, Stimulant, ThrowableWeapon } from '../types/Items'
import { BackpackItemRow, ItemRow, ItemWithRow, UserRow } from '../types/mysql'
import { GRAY_BUTTON, GREEN_BUTTON, RED_BUTTON } from '../utils/constants'
import { addItemToBackpack, createItem, deleteItem, getUserBackpack, lowerItemDurability, removeItemFromBackpack } from '../utils/db/items'
import { beginTransaction, query } from '../utils/db/mysql'
import { addHealth, addXp, getUserRow, increaseDeaths, increaseKills, lowerHealth, setFighting } from '../utils/db/players'
import { getUserQuest, increaseProgress } from '../utils/db/quests'
import { backpackHasSpace, getEquips, getItemDisplay, getItemNameDisplay, getItemPrice, getItems, sortItemsByLevel, sortItemsByValue } from '../utils/itemUtils'
import { logger } from '../utils/logger'
import { addStatusEffects, getEffectsDisplay } from '../utils/playerUtils'
import { awaitPlayerChoices, getAttackDamage, getAttackString, getBodyPartHit, PlayerChoice } from '../utils/duelUtils'
import { combineArrayWithAnd, formatHealth, formatMoney, getAfflictionEmoji, getBodyPartEmoji } from '../utils/stringUtils'
import { disableAllComponents } from '../utils/messageUtils'

class DuelCommand extends CustomSlashCommand<'duel'> {
	constructor (creator: SlashCreator, app: App) {
		super(creator, app, {
			name: 'duel',
			description: 'Fight another player for their loot.',
			longDescription: 'Fight another scavenger. Take turns using your weapons, whoever dies will lose all of the items in their inventory.',
			options: [{
				type: CommandOptionType.USER,
				name: 'user',
				description: 'User to fight.',
				required: true
			}],
			category: 'scavenging',
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

		const member = ctx.members.get(ctx.options.user)
		if (!member) {
			await ctx.send({
				content: `${icons.danger} You must specify someone to duel against!`
			})
			return
		}
		else if (member.id === ctx.user.id) {
			await ctx.send({
				content: `${icons.danger} You cannot duel yourself!`
			})
			return
		}
		else if (this.app.channelsWithActiveDuel.has(ctx.channelID)) {
			await ctx.send({
				content: `${icons.error_pain} There is already another fight occuring in this channel! Wait for other scavengers to finish their fight or head to a different channel.`
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
				content: `${icons.warning} **${member.displayName}** is in another fight right now!`,
				components: []
			})
			return
		}

		await ctx.send({
			content: `<@${member.id}>, **${ctx.member.displayName}** would like to fight you!`,
			components: [{
				type: ComponentType.ACTION_ROW,
				components: [GREEN_BUTTON('Accept Duel', 'confirmed'), RED_BUTTON('Decline', 'canceled')]
			}]
		})
		let botMessage = await ctx.fetch()

		try {
			const confirmed = (await this.app.componentCollector.awaitClicks(botMessage.id, i => i.user.id === member.id))[0]

			if (confirmed.customID !== 'confirmed') {
				await botMessage.edit({
					content: `${icons.danger} **${member.displayName}** declined the duel invite.`,
					components: []
				})
				return
			}

			const preTransaction = await beginTransaction()
			const player1Data = (await getUserRow(preTransaction.query, ctx.user.id, true))!
			const player2Data = (await getUserRow(preTransaction.query, member.id, true))!
			const player1Inventory = await getUserBackpack(preTransaction.query, ctx.user.id, true)
			const player2Inventory = await getUserBackpack(preTransaction.query, member.id, true)
			const player1Stimulants: Stimulant[] = []
			const player1Afflictions: Affliction[] = []
			const player2Stimulants: Stimulant[] = []
			const player2Afflictions: Affliction[] = []

			if (player1Data.fighting) {
				await preTransaction.commit()
				await confirmed.editParent({
					content: `${icons.warning} **${ctx.member.displayName}** is in another fight right now!`,
					components: []
				})
				return
			}
			else if (player2Data.fighting) {
				await preTransaction.commit()
				await confirmed.editParent({
					content: `${icons.warning} **${member.displayName}** is in another fight right now!`,
					components: []
				})
				return
			}
			else if (!backpackHasSpace(player1Inventory, 0)) {
				await preTransaction.commit()
				await confirmed.editParent({
					content: `${icons.warning} **${ctx.member.displayName}** has too many items in their inventory and is overweight!`,
					components: []
				})
				return
			}
			else if (!backpackHasSpace(player2Inventory, 0)) {
				await preTransaction.commit()
				await confirmed.editParent({
					content: `${icons.warning} **${member.displayName}** has too many items in their inventory and is overweight!`,
					components: []
				})
				return
			}
			else if (this.app.channelsWithActiveDuel.has(ctx.channelID)) {
				await preTransaction.commit()
				await confirmed.editParent({
					content: `${icons.error_pain} There is already another fight occuring in this channel! Wait for other scavengers to finish their fight or head to a different channel.`,
					components: []
				})
				return
			}

			this.app.channelsWithActiveDuel.add(ctx.channelID)
			await setFighting(preTransaction.query, ctx.user.id, true)
			await setFighting(preTransaction.query, member.id, true)
			await preTransaction.commit()

			const playerChoices = new Map<string, PlayerChoice>()
			let turnNumber = 1
			let duelIsActive = true

			await confirmed.editParent({
				content: `<@${ctx.user.id}> <@${member.id}>, Turn #1 - select your action:`,
				embeds: [
					this.getDuelEmbed(
						ctx.member,
						member,
						player1Data,
						player2Data,
						player1Inventory,
						player2Inventory,
						1,
						player1Stimulants,
						player2Stimulants,
						player1Afflictions,
						player2Afflictions
					).embed
				],
				components: [{
					type: ComponentType.ACTION_ROW,
					components: [GRAY_BUTTON('Attack', 'attack', false, '🗡️'), GRAY_BUTTON('Use Medical Item', 'heal', false, '🩹'), GRAY_BUTTON('Use Stimulant', 'stimulant', false, '💉'), RED_BUTTON('Try to Flee', 'flee')]
				}]
			})

			while (duelIsActive) {
				try {
					await awaitPlayerChoices(this.app.componentCollector, botMessage, playerChoices, [
						{ member: ctx.member, stims: player1Stimulants, afflictions: player1Afflictions },
						{ member, stims: player2Stimulants, afflictions: player2Afflictions }
					], turnNumber)

					const player1Choice = playerChoices.get(ctx.user.id)
					const player2Choice = playerChoices.get(member.id)
					const orderedChoices = [{ member: ctx.member, action: player1Choice, speed: player1Choice?.speed || 0 }, { member, action: player2Choice, speed: player2Choice?.speed || 0 }]
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
						.map(c => ({ member: c.member, action: c.action }))
					const messages: string[][] = [[], []]

					for (let i = 0; i < orderedChoices.length; i++) {
						const userChoice = orderedChoices[i]

						if (!userChoice.action) {
							messages[i].push(`<@${userChoice.member.id}> did not select an action.`)
						}
						else if (userChoice.action.choice === 'try to flee') {
							const chance = 0.1

							if (Math.random() <= chance) {
								// success
								duelIsActive = false
								messages[i].push(`<@${userChoice.member.id}> flees from the duel! The duel has ended.`)
								this.app.channelsWithActiveDuel.delete(ctx.channelID)
								await setFighting(query, ctx.user.id, false)
								await setFighting(query, member.id, false)
								break
							}
							else {
								messages[i].push(`${icons.danger} <@${userChoice.member.id}> tries to flee from the duel (10% chance) but fails!`)
							}
						}
						else if (userChoice.action.choice === 'use a medical item') {
							const choice = userChoice.action
							const healTransaction = await beginTransaction()
							const playerData = (await getUserRow(healTransaction.query, userChoice.member.id, true))!
							const playerBackpackRows = await getUserBackpack(healTransaction.query, userChoice.member.id, true)
							const playerInventory = getItems(playerBackpackRows)

							const hasItem = playerInventory.items.find(itm => itm.row.id === choice.itemRow.row.id)

							if (!hasItem) {
								await healTransaction.commit()
								messages[i].push(`${icons.danger} <@${userChoice.member.id}> did not have the item they wanted to heal with. Their turn has been skipped.`)
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
								const playerAfflictions = userChoice.member.id === ctx.user.id ? player1Afflictions : player2Afflictions

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

							await addHealth(healTransaction.query, userChoice.member.id, maxHeal)
							await healTransaction.commit()

							const itemDisplay = getItemDisplay(choice.itemRow.item, {
								...choice.itemRow.row,
								durability: choice.itemRow.row.durability ? choice.itemRow.row.durability - 1 : undefined
							}, {
								showID: false
							})

							messages[i].push(`<@${userChoice.member.id}> uses a ${itemDisplay} to heal for **${maxHeal}** health.` +
								`\n**${userChoice.member.displayName}** now has ${formatHealth(playerData.health + maxHeal, playerData.maxHealth)} **${playerData.health + maxHeal} / ${playerData.maxHealth}** health.` +
								`${curedAfflictions.length ? `\n**${userChoice.member.displayName}** cured the following afflictions: ${combineArrayWithAnd(curedAfflictions.map(a => a.name))}` : ''}`)
						}
						else if (userChoice.action.choice === 'use a stimulant') {
							const choice = userChoice.action
							const stimTransaction = await beginTransaction()
							const playerBackpackRows = await getUserBackpack(stimTransaction.query, userChoice.member.id, true)
							const playerInventory = getItems(playerBackpackRows)

							const hasItem = playerInventory.items.find(itm => itm.row.id === choice.itemRow.row.id)

							if (!hasItem) {
								await stimTransaction.commit()
								messages[i].push(`${icons.danger} <@${userChoice.member.id}> did not have the stimulant they wanted to use. Their turn has been skipped.`)
								continue
							}

							if (!choice.itemRow.row.durability || choice.itemRow.row.durability - 1 <= 0) {
								await deleteItem(stimTransaction.query, choice.itemRow.row.id)
							}
							else {
								await lowerItemDurability(stimTransaction.query, choice.itemRow.row.id, 1)
							}

							const playerStimulants = userChoice.member.id === ctx.user.id ? player1Stimulants : player2Stimulants

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

							messages[i].push(`<@${userChoice.member.id}> injects themself with ${itemDisplay}.` +
								`\n\n__Effects Received__\n${effectsDisplay.join('\n')}`)
						}
						else {
							// user chose to attack
							const otherPlayerMember = userChoice.member.id === ctx.user.id ? member : ctx.member
							const atkTransaction = await beginTransaction()

							// fetch user row to prevent changes during attack
							await getUserRow(atkTransaction.query, userChoice.member.id, true)

							const choice = userChoice.action
							const playerBackpackRows = await getUserBackpack(atkTransaction.query, userChoice.member.id, true)
							const victimData = (await getUserRow(atkTransaction.query, otherPlayerMember.id, true))!
							const victimBackpackRows = await getUserBackpack(atkTransaction.query, otherPlayerMember.id, true)
							const playerInventory = getItems(playerBackpackRows)
							const victimInventory = getItems(victimBackpackRows)
							const victimEquips = getEquips(victimBackpackRows)
							const playerStimulants = userChoice.member.id === ctx.user.id ? player1Stimulants : player2Stimulants
							const playerAfflictions = userChoice.member.id === ctx.user.id ? player1Afflictions : player2Afflictions
							const victimStimulants = userChoice.member.id === ctx.user.id ? player2Stimulants : player1Stimulants
							const victimAfflictions = userChoice.member.id === ctx.user.id ? player2Afflictions : player1Afflictions
							const stimulantEffects = addStatusEffects(playerStimulants, playerAfflictions)
							const victimEffects = addStatusEffects(victimStimulants, victimAfflictions)
							const stimulantDamageMulti = (1 + (stimulantEffects.damageBonus / 100) - ((victimEffects.damageTaken * -1) / 100))

							const weaponChoice = choice.weapon
							const hasWeapon = !weaponChoice.row || playerInventory.items.find(itm => itm.row.id === weaponChoice.row.id)
							const hasAmmo = playerInventory.items.find(itm => itm.row.id === choice.ammo?.row.id)
							const bodyPartHit = getBodyPartHit(choice.weapon.item.accuracy + stimulantEffects.accuracyBonus, choice.limbTarget)
							const missedPartChoice = choice.limbTarget && (choice.limbTarget !== bodyPartHit.result || !bodyPartHit.accurate)
							const victimItemsRemoved: number[] = []
							const limbsHit = []
							let totalDamage

							// verify user has weapon they want to attack with
							if (!hasWeapon || !choice.weapon) {
								await atkTransaction.commit()
								messages[i].push(`${icons.danger} <@${userChoice.member.id}> did not have the weapon they wanted to use. Their turn has been skipped.`)
								continue
							}
							else if (choice.weapon.item.type === 'Ranged Weapon') {
								if (!hasAmmo || !choice.ammo) {
									await atkTransaction.commit()
									messages[i].push(`${icons.danger} <@${userChoice.member.id}> did not have the ammunition they wanted to use. Their turn has been skipped.`)
									continue
								}

								await deleteItem(atkTransaction.query, choice.ammo.row.id)

								if (choice.ammo.item.spreadsDamageToLimbs) {
									limbsHit.push({
										damage: getAttackDamage((choice.ammo.item.damage * stimulantDamageMulti) / choice.ammo.item.spreadsDamageToLimbs, choice.ammo.item.penetration, bodyPartHit.result, victimEquips.armor?.item, victimEquips.helmet?.item),
										limb: bodyPartHit.result
									})

									for (let i2 = 0; i2 < choice.ammo.item.spreadsDamageToLimbs - 1; i2++) {
										let limb = getBodyPartHit(choice.weapon.item.accuracy)

										// make sure no duplicate limbs are hit
										while (limbsHit.find(l => l.limb === limb.result)) {
											limb = getBodyPartHit(choice.weapon.item.accuracy)
										}

										limbsHit.push({
											damage: getAttackDamage((choice.ammo.item.damage * stimulantDamageMulti) / choice.ammo.item.spreadsDamageToLimbs, choice.ammo.item.penetration, limb.result, victimEquips.armor?.item, victimEquips.helmet?.item),
											limb: limb.result
										})
									}
								}
								else {
									limbsHit.push({
										damage: getAttackDamage((choice.ammo.item.damage * stimulantDamageMulti), choice.ammo.item.penetration, bodyPartHit.result, victimEquips.armor?.item, victimEquips.helmet?.item),
										limb: bodyPartHit.result
									})
								}

								totalDamage = limbsHit.reduce((prev, curr) => prev + curr.damage.total, 0)

								if (missedPartChoice) {
									messages[i].push(`<@${userChoice.member.id}> tries to shoot <@${otherPlayerMember.id}> in the ${getBodyPartEmoji(choice.limbTarget!)} **${choice.limbTarget}** with their ${getItemDisplay(choice.weapon.item, choice.weapon.row, { showDurability: false })} (ammo: ${getItemDisplay(choice.ammo.item)}) **BUT MISSES!**\n`)
								}
								else {
									messages[i].push(getAttackString(choice.weapon as ItemWithRow<ItemRow, RangedWeapon>, `<@${userChoice.member.id}>`, `<@${otherPlayerMember.id}>`, limbsHit, totalDamage, choice.ammo.item))
								}
							}
							else if (choice.weapon.item.type === 'Throwable Weapon') {
								if (choice.weapon.item.spreadsDamageToLimbs) {
									limbsHit.push({
										damage: getAttackDamage((choice.weapon.item.damage * stimulantDamageMulti) / choice.weapon.item.spreadsDamageToLimbs, choice.weapon.item.penetration, bodyPartHit.result, victimEquips.armor?.item, victimEquips.helmet?.item),
										limb: bodyPartHit.result
									})

									for (let i2 = 0; i2 < choice.weapon.item.spreadsDamageToLimbs - 1; i2++) {
										let limb = getBodyPartHit(choice.weapon.item.accuracy)

										// make sure no duplicate limbs are hit
										while (limbsHit.find(l => l.limb === limb.result)) {
											limb = getBodyPartHit(choice.weapon.item.accuracy)
										}

										limbsHit.push({
											damage: getAttackDamage((choice.weapon.item.damage * stimulantDamageMulti) / choice.weapon.item.spreadsDamageToLimbs, choice.weapon.item.penetration, limb.result, victimEquips.armor?.item, victimEquips.helmet?.item),
											limb: limb.result
										})
									}
								}
								else {
									limbsHit.push({
										damage: getAttackDamage((choice.weapon.item.damage * stimulantDamageMulti), choice.weapon.item.penetration, bodyPartHit.result, victimEquips.armor?.item, victimEquips.helmet?.item),
										limb: bodyPartHit.result
									})
								}

								totalDamage = limbsHit.reduce((prev, curr) => prev + curr.damage.total, 0)

								if (missedPartChoice) {
									messages[i].push(`${icons.danger} <@${userChoice.member.id}> tries to throw a ${getItemDisplay(choice.weapon.item, choice.weapon.row)} at <@${otherPlayerMember.id}>'s ${getBodyPartEmoji(choice.limbTarget!)} **${choice.limbTarget}** **BUT MISSES!**\n`)
								}
								else {
									messages[i].push(getAttackString(choice.weapon as ItemWithRow<ItemRow, ThrowableWeapon>, `<@${userChoice.member.id}>`, `<@${otherPlayerMember.id}>`, limbsHit, totalDamage))

									if (choice.weapon.item.subtype === 'Incendiary Grenade' && !victimAfflictions.includes(afflictions.Burning)) {
										messages[i].push(`${icons.postive_effect_debuff} <@${otherPlayerMember.id}> is ${getAfflictionEmoji('Burning')} Burning! (${combineArrayWithAnd(getEffectsDisplay(afflictions.Burning.effects))})`)

										if (userChoice.member.id === ctx.user.id) {
											player2Afflictions.push(afflictions.Burning)
										}
										else {
											player1Afflictions.push(afflictions.Burning)
										}
									}
								}
							}
							else {
								// melee weapon
								limbsHit.push({
									damage: getAttackDamage((choice.weapon.item.damage * stimulantDamageMulti), choice.weapon.item.penetration, bodyPartHit.result, victimEquips.armor?.item, victimEquips.helmet?.item),
									limb: bodyPartHit.result
								})
								totalDamage = limbsHit[0].damage.total

								if (missedPartChoice) {
									messages[i].push(`${icons.danger} <@${userChoice.member.id}> tries to hit <@${otherPlayerMember.id}> in the ${getBodyPartEmoji(choice.limbTarget!)} **${choice.limbTarget}** with their ${getItemDisplay(choice.weapon.item, choice.weapon.row)} **BUT MISSES!**\n`)
								}
								else {
									messages[i].push(getAttackString(choice.weapon as ItemWithRow<ItemRow, MeleeWeapon>, `<@${userChoice.member.id}>`, `<@${otherPlayerMember.id}>`, limbsHit, totalDamage))
								}
							}

							// remove weapon annd ammo
							if (choice.weapon.row && (!choice.weapon.row.durability || choice.weapon.row.durability - 1 <= 0)) {
								messages[i].push(`${icons.danger} **${userChoice.member.displayName}**'s ${getItemDisplay(choice.weapon.item)} broke from this attack.`)

								await deleteItem(atkTransaction.query, choice.weapon.row.id)
							}
							else if (choice.weapon.row && choice.weapon.row.durability) {
								messages[i].push(`**${userChoice.member.displayName}**'s ${getItemDisplay(choice.weapon.item)} now has **${choice.weapon.row.durability - 1}** durability.`)

								await lowerItemDurability(atkTransaction.query, choice.weapon.row.id, 1)
							}

							if (!missedPartChoice) {
								for (const result of limbsHit) {
									if (result.limb === 'head' && victimEquips.helmet) {
										messages[i].push(`**${otherPlayerMember.displayName}**'s helmet (${getItemDisplay(victimEquips.helmet.item)}) reduced the damage by **${result.damage.reduced}**.`)

										if (victimEquips.helmet.row.durability - 1 <= 0) {
											messages[i].push(`**${otherPlayerMember.displayName}**'s ${getItemDisplay(victimEquips.helmet.item)} broke from this attack!`)

											await deleteItem(atkTransaction.query, victimEquips.helmet.row.id)
											victimItemsRemoved.push(victimEquips.helmet.row.id)
										}
										else {
											await lowerItemDurability(atkTransaction.query, victimEquips.helmet.row.id, 1)
										}
									}
									else if (result.limb === 'chest' && victimEquips.armor) {
										messages[i].push(`**${otherPlayerMember.displayName}**'s armor (${getItemDisplay(victimEquips.armor.item)}) reduced the damage by **${result.damage.reduced}**.`)

										if (victimEquips.armor.row.durability - 1 <= 0) {
											messages[i].push(`**${otherPlayerMember.displayName}**'s ${getItemDisplay(victimEquips.armor.item)} broke from this attack!`)

											await deleteItem(atkTransaction.query, victimEquips.armor.row.id)
											victimItemsRemoved.push(victimEquips.armor.row.id)
										}
										else {
											await lowerItemDurability(atkTransaction.query, victimEquips.armor.row.id, 1)
										}
									}
									else if (result.limb === 'arm' && Math.random() <= 0.2 && !victimAfflictions.includes(afflictions['Broken Arm'])) {
										messages[i].push(`${icons.postive_effect_debuff} **${otherPlayerMember.displayName}**'s ${getAfflictionEmoji('Broken Arm')} arm was broken! (${combineArrayWithAnd(getEffectsDisplay(afflictions['Broken Arm'].effects))})`)

										if (userChoice.member.id === ctx.user.id) {
											player2Afflictions.push(afflictions['Broken Arm'])
										}
										else {
											player1Afflictions.push(afflictions['Broken Arm'])
										}
									}
								}
							}

							// have to filter out the removed armor/helmet to prevent sql reference errors
							const victimLoot = victimInventory.items.filter(itm => !victimItemsRemoved.includes(itm.row.id))

							if (!missedPartChoice && victimData.health - totalDamage <= 0) {
								const userQuest = await getUserQuest(atkTransaction.query, userChoice.member.id, true)
								let xpEarned = 15

								for (const victimItem of victimLoot) {
									// 3 xp per level of the item
									xpEarned += victimItem.item.itemLevel * 3

									await removeItemFromBackpack(atkTransaction.query, victimItem.row.id)
								}

								// create dog tags for victim
								const dogTagsRow = await createItem(atkTransaction.query, items.dog_tags.name, { displayName: `${otherPlayerMember.user.username.replace(/`/g, '')}#${otherPlayerMember.user.discriminator}'s dog tags` })
								victimLoot.push({
									item: items.dog_tags,
									row: { ...dogTagsRow, equipped: 0 }
								})

								this.app.channelsWithActiveDuel.delete(ctx.channelID)
								await setFighting(atkTransaction.query, ctx.user.id, false)
								await setFighting(atkTransaction.query, member.id, false)
								await increaseKills(atkTransaction.query, userChoice.member.id, 'player', 1)
								await increaseDeaths(atkTransaction.query, otherPlayerMember.id, 1)
								await addXp(atkTransaction.query, userChoice.member.id, xpEarned)

								// check if user has any kill quests
								if (userQuest && userQuest.progress < userQuest.progressGoal) {
									if (userQuest.questType === 'Any Kills' || userQuest.questType === 'Player Kills') {
										await increaseProgress(atkTransaction.query, userChoice.member.id, 1)
									}
								}

								// remove users items while victor picks loot
								for (const victimItem of victimLoot) {
									await removeItemFromBackpack(atkTransaction.query, victimItem.row.id)
								}

								messages[i].push(`☠️ **${otherPlayerMember.displayName} DIED!**`, `**${userChoice.member.displayName} wins** and earned ${icons.xp_star}***+${xpEarned}*** xp for this kill.`)
							}
							else if (!missedPartChoice) {
								await lowerHealth(atkTransaction.query, otherPlayerMember.id, totalDamage)

								messages[i].push(`**${otherPlayerMember.displayName}** is left with ${formatHealth(victimData.health - totalDamage, victimData.maxHealth)} **${victimData.health - totalDamage}** health.`)
							}

							// commit changes
							await atkTransaction.commit()

							if (!missedPartChoice && victimData.health - totalDamage <= 0) {
								// end the duel
								duelIsActive = false

								// user picks items from victims inventory
								const maxPossibleItemsToPick = Math.min(victimLoot.length, 5)
								const components: ComponentSelectMenu[] = [
									{
										type: ComponentType.SELECT,
										min_values: 1,
										max_values: maxPossibleItemsToPick,
										custom_id: 'items',
										placeholder: 'Select up to 5 items to keep:',
										options: sortItemsByValue(victimLoot, true).slice(0, 25).map(itm => {
											const iconID = itm.item.icon.match(/:([0-9]*)>/)

											return {
												label: `[${itm.row.id}] ${getItemNameDisplay(itm.item, itm.row)}`,
												value: itm.row.id.toString(),
												description: `${itm.row.durability ? `${itm.row.durability} uses left. ` : ''}Worth ${formatMoney(getItemPrice(itm.item, itm.row), false)}`,
												emoji: iconID ? {
													id: iconID[1],
													name: itm.item.name
												} : undefined
											}
										})
									}
								]

								const playerAttackCtx = userChoice.action.attackCtx
								if (playerAttackCtx) {
									setTimeout(async () => {
										try {
											const itemSelectMessage = await playerAttackCtx.sendFollowUp({
												ephemeral: true,
												content: `<@${userChoice.member.id}>, **You won the duel!** Select up to **5** items from <@${otherPlayerMember.id}>'s inventory to keep.`,
												components: [{
													type: ComponentType.ACTION_ROW,
													components
												}]
											})
											let itemsPicked: ItemWithRow<BackpackItemRow>[] = []

											try {
												const itemChoices = (await this.app.componentCollector.awaitClicks(itemSelectMessage.id, int => int.user.id === userChoice.member.id, 40000))[0]
												itemsPicked = victimLoot.filter(itm => itemChoices.values.includes(itm.row.id.toString()))

												try {
													await itemChoices.acknowledge()
												}
												catch (err) {
													logger.warn(err)
												}

												try {
													for (const victimItem of victimLoot) {
														if (itemsPicked.some(itm => itm.row.id === victimItem.row.id)) {
															await addItemToBackpack(query, userChoice.member.id, victimItem.row.id)
														}
														else {
															await addItemToBackpack(query, otherPlayerMember.id, victimItem.row.id)
														}
													}

													await itemSelectMessage.edit({
														content: `${icons.checkmark} Transferred **${itemsPicked.length}** items to your inventory:` +
															`\n\n${itemsPicked.map(itm => getItemDisplay(itm.item, itm.row, { showEquipped: false })).join('\n')}`,
														components: []
													})
												}
												catch (err) {
													logger.warn(err)
												}
											}
											catch (err) {
												for (const victimItem of victimLoot.filter(itm => !itemsPicked.some(pick => pick.row.id === itm.row.id))) {
													await addItemToBackpack(query, otherPlayerMember.id, victimItem.row.id)
												}

												await itemSelectMessage.edit({
													content: `${icons.danger} You ran out of time to select which items to keep.`,
													components: [{
														type: ComponentType.ACTION_ROW,
														components: disableAllComponents(components)
													}]
												})
											}

											if ((webhooks.pvp.id && webhooks.pvp.token) || (webhooks.bot_logs.id && webhooks.bot_logs.token)) {
												const lootEmbed = new Embed()
													.setTitle('__Loot Stolen__')
													.setDescription(itemsPicked.length ?
														`${sortItemsByLevel(itemsPicked, true).slice(0, 15).map(victimItem => getItemDisplay(victimItem.item, victimItem.row, { showEquipped: false, showDurability: false })).join('\n')}` +
														`${itemsPicked.length > 15 ? `\n...and **${itemsPicked.length - 15}** other item${itemsPicked.length - 15 > 1 ? 's' : ''}` : ''}` :
														'No items were stolen.')

												if (webhooks.pvp.id && webhooks.pvp.token) {
													try {
														await this.app.bot.executeWebhook(webhooks.pvp.id, webhooks.pvp.token, {
															content: `☠️ **${userChoice.member.user.username}#${userChoice.member.user.discriminator}** killed **${otherPlayerMember.user.username}#${otherPlayerMember.user.discriminator}** using their ${getItemDisplay(choice.weapon.item)}` +
																`${choice.ammo ? ` (ammo: ${getItemDisplay(choice.ammo.item)})` : ''}.`,
															embeds: [lootEmbed.embed]
														})
													}
													catch (err) {
														logger.warn(err)
													}
												}
												if (webhooks.bot_logs.id && webhooks.bot_logs.token) {
													try {
														lootEmbed.setFooter(`Guild ID: ${userChoice.member.guildID}`)

														await this.app.bot.executeWebhook(webhooks.bot_logs.id, webhooks.bot_logs.token, {
															content: `☠️ **${userChoice.member.user.username}#${userChoice.member.user.discriminator}** (${userChoice.member.id}) killed **${otherPlayerMember.user.username}#${otherPlayerMember.user.discriminator}** (${otherPlayerMember.id}) using their ${getItemDisplay(choice.weapon.item)}` +
																`${choice.ammo ? ` (ammo: ${getItemDisplay(choice.ammo.item)})` : ''}.`,
															embeds: [lootEmbed.embed]
														})
													}
													catch (err) {
														logger.warn(err)
													}
												}
											}
										}
										catch (err) {
											logger.warn(err)

											for (const victimItem of victimLoot) {
												await addItemToBackpack(query, otherPlayerMember.id, victimItem.row.id)
											}
										}
									}, 2500)
								}
								else {
									// this shouldn't happen but JUST IN CASE IT DOES
									logger.error(`User ${userChoice.member.user.username}#${userChoice.member.user.discriminator} (${userChoice.member.id}) attack context not set after attack selection`)

									for (const victimItem of victimLoot) {
										await deleteItem(query, victimItem.row.id)
									}
								}

								// break out of the loop to prevent other players turn
								break
							}
						}
					}

					if (!player1Choice && !player2Choice) {
						duelIsActive = false
						this.app.channelsWithActiveDuel.delete(ctx.channelID)
						await setFighting(query, ctx.user.id, false)
						await setFighting(query, member.id, false)
						messages.push(['Neither players selected an action, the duel has been ended early.'])
					}

					const actionsEmbed = new Embed()
						.setTitle(`Duel - ${ctx.member.displayName} vs ${member.displayName}`)
						.setFooter(`Turn #${turnNumber} · actions are ordered by speed (higher speed action goes first)`)

					const filteredMessages = messages.filter(m => m.length)
					for (let i = 0; i < filteredMessages.length; i++) {
						actionsEmbed.addField('\u200b', `${i + 1}. ${filteredMessages[i].join('\n')}`)
					}

					await confirmed.sendFollowUp({
						embeds: [actionsEmbed.embed]
					})
				}
				catch (err) {
					logger.error(err)

					duelIsActive = false
					this.app.channelsWithActiveDuel.delete(ctx.channelID)
					await setFighting(query, ctx.user.id, false)
					await setFighting(query, member.id, false)

					try {
						await confirmed.sendFollowUp({
							content: `${icons.danger} <@${ctx.user.id}> <@${member.id}>, An error occured, the duel has been ended. Sorry about that...`
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
						await setFighting(query, member.id, false)
						await confirmed.sendFollowUp({
							content: `${icons.danger} <@${ctx.user.id}> <@${member.id}>, **The max turn limit (20) has been reached!** The duel ends in a tie, neither players will lose their items.`
						})
					}
					else {
						const player1DataV = (await getUserRow(query, ctx.user.id))!
						const player2DataV = (await getUserRow(query, member.id))!
						const player1InventoryV = await getUserBackpack(query, ctx.user.id)
						const player2InventoryV = await getUserBackpack(query, member.id)

						turnNumber += 1
						botMessage = await confirmed.sendFollowUp({
							content: `<@${ctx.user.id}> <@${member.id}>, Turn #${turnNumber} - select your action:`,
							embeds: [
								this.getDuelEmbed(
									ctx.member,
									member,
									player1DataV,
									player2DataV,
									player1InventoryV,
									player2InventoryV,
									turnNumber,
									player1Stimulants,
									player2Stimulants,
									player1Afflictions,
									player2Afflictions
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
		catch (err) {
			await botMessage.edit({
				content: `${icons.danger} **${member.displayName}** did not respond to the duel invite.`,
				components: []
			})
		}
	}

	getDuelEmbed (
		player1: ResolvedMember,
		player2: ResolvedMember,
		player1Data: UserRow,
		player2Data: UserRow,
		player1Inventory: BackpackItemRow[],
		player2Inventory: BackpackItemRow[],
		turnNumber: number,
		player1Stimulants: Stimulant[],
		player2Stimulants: Stimulant[],
		player1Afflictions: Affliction[],
		player2Afflictions: Affliction[]
	): Embed {
		const player1Equips = getEquips(player1Inventory)
		const player2Equips = getEquips(player2Inventory)
		const player1Effects = addStatusEffects(player1Stimulants, player1Afflictions)
		const player2Effects = addStatusEffects(player2Stimulants, player2Afflictions)
		const player1EffectsDisplay = getEffectsDisplay(player1Effects)
		const player2EffectsDisplay = getEffectsDisplay(player2Effects)

		const duelEmb = new Embed()
			.setTitle(`Duel - ${player1.displayName} vs ${player2.displayName}`)
			.addField(`${player1.user.username}#${player1.user.discriminator} (Level ${player1Data.level})`,
				`**${player1Data.health} / ${player1Data.maxHealth}** HP\n${formatHealth(player1Data.health, player1Data.maxHealth)}` +
				`\n\n__**Equipment**__\n**Backpack**: ${player1Equips.backpack ? getItemDisplay(player1Equips.backpack.item, player1Equips.backpack.row, { showEquipped: false, showID: false }) : 'None'}` +
				`\n**Helmet**: ${player1Equips.helmet ? getItemDisplay(player1Equips.helmet.item, player1Equips.helmet.row, { showEquipped: false, showID: false }) : 'None'}` +
				`\n**Body Armor**: ${player1Equips.armor ? getItemDisplay(player1Equips.armor.item, player1Equips.armor.row, { showEquipped: false, showID: false }) : 'None'}` +
				`\n\n__**Stimulants**__\n${player1Stimulants.length ? player1Stimulants.map(i => getItemDisplay(i)).join('\n') : 'None'}` +
				`\n\n__**Afflictions**__\n${player1Afflictions.length ? combineArrayWithAnd(player1Afflictions.map(a => `${getAfflictionEmoji(a.name as AfflictionName)} ${a.name}`)) : 'None'}` +
				`${player1EffectsDisplay.length ? `\n\n__**Effects**__\n${player1EffectsDisplay.join('\n')}` : ''}`,
				true)
			.addField(`${player2.user.username}#${player2.user.discriminator} (Level ${player2Data.level})`,
				`**${player2Data.health} / ${player2Data.maxHealth}** HP\n${formatHealth(player2Data.health, player2Data.maxHealth)}` +
				`\n\n__**Equipment**__\n**Backpack**: ${player2Equips.backpack ? getItemDisplay(player2Equips.backpack.item, player2Equips.backpack.row, { showEquipped: false, showID: false }) : 'None'}` +
				`\n**Helmet**: ${player2Equips.helmet ? getItemDisplay(player2Equips.helmet.item, player2Equips.helmet.row, { showEquipped: false, showID: false }) : 'None'}` +
				`\n**Body Armor**: ${player2Equips.armor ? getItemDisplay(player2Equips.armor.item, player2Equips.armor.row, { showEquipped: false, showID: false }) : 'None'}` +
				`\n\n__**Stimulants**__\n${player2Stimulants.length ? player2Stimulants.map(i => getItemDisplay(i)).join('\n') : 'None'}` +
				`\n\n__**Afflictions**__\n${player2Afflictions.length ? combineArrayWithAnd(player2Afflictions.map(a => `${getAfflictionEmoji(a.name as AfflictionName)} ${a.name}`)) : 'None'}` +
				`${player2EffectsDisplay.length ? `\n\n__**Effects**__\n${player2EffectsDisplay.join('\n')}` : ''}`,
				true)
			.setFooter(`Turn #${turnNumber} / 20 max · 40 seconds to make selection`)

		return duelEmb
	}
}

export default DuelCommand
