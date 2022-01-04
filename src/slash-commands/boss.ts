import { SlashCreator, CommandContext, ComponentType, Message, CommandOptionType } from 'slash-create'
import App from '../app'
import { icons, webhooks } from '../config'
import { NPC } from '../types/NPCs'
import { allLocations, isValidLocation, locations } from '../resources/locations'
import CustomSlashCommand from '../structures/CustomSlashCommand'
import Embed from '../structures/Embed'
import { Stimulant } from '../types/Items'
import { Location } from '../types/Locations'
import { addItemToBackpack, createItem, deleteItem, getUserBackpack, lowerItemDurability } from '../utils/db/items'
import { beginTransaction, query } from '../utils/db/mysql'
import { addHealth, addXp, getUserRow, increaseKills, setFighting, setLocationLevel } from '../utils/db/players'
import { getUserQuests, increaseProgress } from '../utils/db/quests'
import { getEquips, getItemDisplay, getItems, sortItemsByLevel } from '../utils/itemUtils'
import { logger } from '../utils/logger'
import getRandomInt from '../utils/randomInt'
import { combineArrayWithAnd, formatHealth, getBodyPartEmoji, getRarityDisplay } from '../utils/stringUtils'
import { BackpackItemRow, ItemRow, ItemWithRow, UserRow } from '../types/mysql'
import { Affliction, afflictions } from '../resources/afflictions'
import { addStatusEffects, getEffectsDisplay } from '../utils/playerUtils'
import { ResolvedMember } from 'slash-create/lib/structures/resolvedMember'
import { awaitPlayerChoices, getAttackDamage, getAttackString, getBodyPartHit, isFleeChoice, isHealChoice, isStimulantChoice, PlayerChoice } from '../utils/duelUtils'
import { GRAY_BUTTON, GREEN_BUTTON, RED_BUTTON } from '../utils/constants'
import { attackPlayer, getMobChoice, getMobDisplay, getMobDrop } from '../utils/npcUtils'
import { createCooldown } from '../utils/db/cooldowns'
import { EmbedOptions } from 'eris'

interface Player {
	member: ResolvedMember
	data: UserRow
	stimulants: Stimulant[]
	afflictions: Affliction[]
	inventory: BackpackItemRow[]
}

interface BaseOrderedChoice {
	type: 'player' | 'npc'
	speed: number
	random: number
}
interface OrderedPlayerChoice extends BaseOrderedChoice, Player {
	type: 'player'
	selection?: PlayerChoice
}
interface OrderedMobChoice extends BaseOrderedChoice {
	type: 'npc'
}
type OrderedChoice = OrderedPlayerChoice | OrderedMobChoice

class BossCommand extends CustomSlashCommand {
	constructor (creator: SlashCreator, app: App) {
		super(creator, app, {
			name: 'boss',
			description: 'Fight the boss of your current region! You can team up with up to 2 friends to help you.',
			longDescription: 'Fight the boss of the region you are currently at! It\'s recommended that you invite some friends to help' +
				' you, as bosses are significantly stronger than the mobs you encounter while scavenging.' +
				'\n\n**Defeating a boss will unlock a new region for you to travel to, which will contain better loot and stronger enemies.**',
			options: [
				{
					type: CommandOptionType.USER,
					name: 'user',
					description: 'Invite a friend to help fight the boss.',
					required: false
				},
				{
					type: CommandOptionType.USER,
					name: 'user-2',
					description: 'Invite another friend to help fight the boss.',
					required: false
				}
			],
			category: 'info',
			guildModsOnly: false,
			worksInDMs: false,
			worksDuringDuel: false,
			noDefer: true,
			guildIDs: []
		})

		this.filePath = __filename
	}

	async run (ctx: CommandContext): Promise<void> {
		if (!ctx.member) {
			throw new Error('Member not attached to interaction')
		}

		const teammates = [ctx.members.get(ctx.options.user), ctx.members.get(ctx.options['user-2'])].filter(Boolean) as ResolvedMember[]
		const preUserData = (await getUserRow(query, ctx.user.id))!

		if (!isValidLocation(preUserData.currentLocation)) {
			await ctx.send({
				content: `${icons.warning} You need to travel to a region. Use the \`/travel\` command to travel to a region you want to fight the boss of.`
			})
			return
		}

		const location = locations[preUserData.currentLocation]
		const nextLocation = allLocations.filter(l => l.locationLevel === location.locationLevel + 1)
		const preMembersData: { member: ResolvedMember, data: UserRow }[] = [{ member: ctx.member, data: preUserData }]

		for (const member of teammates) {
			if (member.id === ctx.user.id) {
				await ctx.send({
					content: `${icons.danger} Are you trying to invite yourself to fight the boss? Try inviting someone else, perhaps a friend...`
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

			if (!isValidLocation(memberData.currentLocation) || memberData.currentLocation !== preUserData.currentLocation) {
				await ctx.send({
					content: `${icons.warning} **${member.displayName}** is not located in the same region, they need to \`/travel\` to **${location.display}**.`,
					components: []
				})
				return
			}

			preMembersData.push({ member, data: memberData })
		}

		await ctx.send({
			content: `${preMembersData.map(d => `<@${d.member.id}>`).join(' ')}, All players must ready up to start the fight.`,
			embeds: [this.getAgreementEmbed(location, preMembersData.map(d => d.member), []).embed],
			components: [{
				type: ComponentType.ACTION_ROW,
				components: [GREEN_BUTTON('Ready Up', 'accept')]
			}]
		})
		let botMessage = await ctx.fetch()

		try {
			await this.awaitPlayerAgreements(botMessage, location, preMembersData.map(d => d.member))
		}
		catch (err) {
			await botMessage.edit({
				content: `${icons.danger} Not all players readied up! The fight has been canceled.`,
				components: []
			})
			return
		}

		const preTransaction = await beginTransaction()
		let players: Player[] = []

		for (const player of preMembersData) {
			const memberData = await getUserRow(preTransaction.query, player.member.id, true)

			if (!memberData) {
				await botMessage.edit({
					content: `${icons.warning} **${player.member.displayName}** does not have an account!`,
					components: []
				})
				return
			}
			else if (memberData.fighting) {
				await botMessage.edit({
					content: `${icons.warning} **${player.member.displayName}** is in another fight right now!`,
					components: []
				})
				return
			}
			else if (!isValidLocation(memberData.currentLocation) || memberData.currentLocation !== preUserData.currentLocation) {
				await ctx.send({
					content: `${icons.warning} **${player.member.displayName}** traveled to a different region, they need to \`/travel\` to **${location.display}**.`,
					components: []
				})
				return
			}

			const memberBackpack = await getUserBackpack(preTransaction.query, player.member.id)

			await setFighting(preTransaction.query, player.member.id, true)
			players.push({ member: player.member, data: memberData, stimulants: [], afflictions: [], inventory: memberBackpack })
		}

		await preTransaction.commit()

		const playerChoices = new Map<string, PlayerChoice>()
		const npcStimulants: Stimulant[] = []
		const npcAfflictions: Affliction[] = []
		let npcHealth = location.boss.health
		let turnNumber = 1
		let duelIsActive = true

		await botMessage.edit({
			content: `${players.map(p => `<@${p.member.id}>`).join(' ')}, Turn #1 - select your action:`,
			embeds: [
				this.getMobDuelEmbed(
					players,
					location.boss,
					npcHealth,
					turnNumber,
					npcStimulants,
					npcAfflictions
				).embed
			],
			components: [{
				type: ComponentType.ACTION_ROW,
				components: [GRAY_BUTTON('Attack', 'attack', false, '🗡️'), GRAY_BUTTON('Use Medical Item', 'heal', false, '🩹'), GRAY_BUTTON('Use Stimulant', 'stimulant', false, '💉'), RED_BUTTON('Try to Flee', 'flee')]
			}]
		})

		while (duelIsActive) {
			try {
				await awaitPlayerChoices(
					this.app.componentCollector,
					botMessage,
					playerChoices,
					players.map(p => ({ member: p.member, stims: p.stimulants, afflictions: p.afflictions })),
					turnNumber
				)

				const playersWithChoices = players.map(p => ({ ...p, selection: playerChoices.get(p.member.id) }))
				const npcChoice = getMobChoice(location.boss, npcStimulants, npcHealth)
				const orderedChoices: OrderedChoice[] = [
					{ type: ('npc' as const), speed: npcChoice.speed, random: Math.random() },
					...playersWithChoices.map(c => ({ ...c, type: ('player' as const), speed: c.selection?.speed || 0, random: Math.random() }))]
					.sort((a, b) => {
						if (a.speed > b.speed) {
							return -1
						}
						else if (a.speed < b.speed) {
							return 1
						}

						return b.random - a.random
					})
				const messages: string[][] = [[], ...players.map(p => [])]
				const npcDisplayName = `**${location.boss.display}**`
				const lootEmbeds: EmbedOptions[] = []
				let msgContent

				for (let i = 0; i < orderedChoices.length; i++) {
					const choiceInfo = orderedChoices[i]

					if (choiceInfo.type === 'npc') {
						// npc turn

						if (npcChoice.choice === 'attack') {
							const playerToAttack = players[Math.floor(Math.random() * players.length)]
							const atkTransaction = await beginTransaction()

							const playerRow = (await getUserRow(atkTransaction.query, playerToAttack.member.id, true))!
							const playerBackpackRows = await getUserBackpack(atkTransaction.query, playerToAttack.member.id, true)
							const attackResult = await attackPlayer(
								atkTransaction.query,
								playerToAttack.member,
								playerRow,
								playerBackpackRows,
								location.boss,
								playerToAttack.stimulants,
								playerToAttack.afflictions,
								npcStimulants,
								npcAfflictions
							)

							messages[i].push(...attackResult.messages)

							await atkTransaction.commit()

							if (playerRow.health - attackResult.damage <= 0) {
								players = players.filter(p => p.member.id !== playerToAttack.member.id)

								const lootLostEmbed = new Embed()
									.setAuthor(`${playerToAttack.member.user.username}#${playerToAttack.member.user.discriminator}'s Loot Lost`, playerToAttack.member.avatarURL)
									.setColor(16734296)
									.setDescription(attackResult.lostItems.length ?
										`${sortItemsByLevel(attackResult.lostItems, true).slice(0, 15).map(victimItem => getItemDisplay(victimItem.item, victimItem.row, { showEquipped: false, showDurability: false })).join('\n')}` +
										`${attackResult.lostItems.length > 15 ? `\n...and **${attackResult.lostItems.length - 15}** other item${attackResult.lostItems.length - 15 > 1 ? 's' : ''}` : ''}` :
										'No items were lost.')

								lootEmbeds.push({ ...lootLostEmbed.embed })

								// removing the author field because I dont want user avatars to show in the global kill feed,
								// who knows what kind of weird pfp someone could have
								lootLostEmbed.embed.author = undefined
								lootLostEmbed.setTitle('__Loot Lost__')

								if (webhooks.pvp.id && webhooks.pvp.token) {
									try {
										await this.app.bot.executeWebhook(webhooks.pvp.id, webhooks.pvp.token, {
											content: `☠️ ${npcDisplayName} (${location.display} Boss) killed **${playerToAttack.member.user.username}#${playerToAttack.member.user.discriminator}**!`,
											embeds: [lootLostEmbed.embed]
										})
									}
									catch (err) {
										logger.warn(err)
									}
								}

								if (!players.length) {
									// all players died, end the duel
									duelIsActive = false
									break
								}
							}
						}
						else if (npcChoice.choice === 'use a medical item') {
							const maxHeal = Math.min(location.boss.health - npcHealth, npcChoice.item.healsFor)
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

							messages[i].push(`${npcDisplayName} uses a ${getItemDisplay(npcChoice.item)} to heal for **${maxHeal}** health.` +
								`\n${npcDisplayName} now has ${formatHealth(npcHealth + maxHeal, location.boss.health)} **${npcHealth + maxHeal} / ${location.boss.health}** health.` +
								`${curedAfflictions.length ? `\n${npcDisplayName} cured the following afflictions: ${combineArrayWithAnd(curedAfflictions.map(a => a.name))}` : ''}`)
						}
						else if (npcChoice.choice === 'use a stimulant') {
							const effectsDisplay = getEffectsDisplay(npcChoice.item.effects)

							npcStimulants.push(npcChoice.item)
							messages[i].push(`${npcDisplayName} injects themself with ${getItemDisplay(npcChoice.item)}.` +
								`\n\n__Effects Received__\n${effectsDisplay.join('\n')}`)
						}
						else {
							messages[i].push(`${npcDisplayName} sits this turn out.`)
						}
					}
					else if (!players.some(p => p.member.id === choiceInfo.member.id)) {
						messages[i].push(`<@${choiceInfo.member.id}> died before they could ${choiceInfo.selection?.choice || 'take action'}.`)
					}
					else if (!choiceInfo.selection) {
						messages[i].push(`<@${choiceInfo.member.id}> did not select an action.`)
					}
					else if (isFleeChoice(choiceInfo.selection)) {
						const chance = 0.1

						if (Math.random() <= chance) {
							// success
							messages[i].push(`<@${choiceInfo.member.id}> flees from the duel!`)
							players = players.filter(p => p.member.id !== choiceInfo.member.id)
							await setFighting(query, choiceInfo.member.id, false)

							if (!players.length) {
								// end duel if all players flee or died
								duelIsActive = false
								break
							}
						}
						else {
							messages[i].push(`${icons.danger} <@${choiceInfo.member.id}> tries to flee from the duel (10% chance) but fails!`)
						}
					}
					else if (isHealChoice(choiceInfo.selection)) {
						const choice = choiceInfo.selection
						const healTransaction = await beginTransaction()
						const playerData = (await getUserRow(healTransaction.query, choiceInfo.member.id, true))!
						const playerBackpackRows = await getUserBackpack(healTransaction.query, choiceInfo.member.id, true)
						const playerInventory = getItems(playerBackpackRows)

						const hasItem = playerInventory.items.find(itm => itm.row.id === choice.itemRow.row.id)

						if (!hasItem) {
							await healTransaction.commit()
							messages[i].push(`${icons.danger} <@${choiceInfo.member.id}> did not have the item they wanted to heal with. Their turn has been skipped.`)
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
							for (let affIndex = choiceInfo.afflictions.length - 1; affIndex >= 0; affIndex--) {
								const affliction = choiceInfo.afflictions[affIndex]

								if (choice.itemRow.item.curesBitten && affliction.name === 'Bitten') {
									curedAfflictions.push(affliction)
									choiceInfo.afflictions.splice(affIndex, 1)
								}
								else if (choice.itemRow.item.curesBrokenArm && affliction.name === 'Broken Arm') {
									curedAfflictions.push(affliction)
									choiceInfo.afflictions.splice(affIndex, 1)
								}
								else if (choice.itemRow.item.curesBurning && affliction.name === 'Burning') {
									curedAfflictions.push(affliction)
									choiceInfo.afflictions.splice(affIndex, 1)
								}
							}
						}

						await addHealth(healTransaction.query, choiceInfo.member.id, maxHeal)
						await healTransaction.commit()

						const itemDisplay = getItemDisplay(choice.itemRow.item, {
							...choice.itemRow.row,
							durability: choice.itemRow.row.durability ? choice.itemRow.row.durability - 1 : undefined
						}, {
							showID: false
						})

						messages[i].push(`<@${choiceInfo.member.id}> uses a ${itemDisplay} to heal for **${maxHeal}** health.` +
							`\n**${choiceInfo.member.displayName}** now has ${formatHealth(playerData.health + maxHeal, playerData.maxHealth)} **${playerData.health + maxHeal} / ${playerData.maxHealth}** health.` +
							`${curedAfflictions.length ? `\n**${choiceInfo.member.displayName}** cured the following afflictions: ${combineArrayWithAnd(curedAfflictions.map(a => a.name))}` : ''}`)
					}
					else if (isStimulantChoice(choiceInfo.selection)) {
						const choice = choiceInfo.selection
						const stimTransaction = await beginTransaction()
						const playerBackpackRows = await getUserBackpack(stimTransaction.query, choiceInfo.member.id, true)
						const playerInventory = getItems(playerBackpackRows)

						const hasItem = playerInventory.items.find(itm => itm.row.id === choice.itemRow.row.id)

						if (!hasItem) {
							await stimTransaction.commit()
							messages[i].push(`${icons.danger} <@${choiceInfo.member.id}> did not have the stimulant they wanted to use. Their turn has been skipped.`)
							continue
						}

						if (!choice.itemRow.row.durability || choice.itemRow.row.durability - 1 <= 0) {
							await deleteItem(stimTransaction.query, choice.itemRow.row.id)
						}
						else {
							await lowerItemDurability(stimTransaction.query, choice.itemRow.row.id, 1)
						}

						// ensure multiple of the same stimulant don't stack
						if (!choiceInfo.stimulants.includes(choice.itemRow.item)) {
							choiceInfo.stimulants.push(choice.itemRow.item)
						}

						await stimTransaction.commit()

						const itemDisplay = getItemDisplay(choice.itemRow.item, {
							...choice.itemRow.row,
							durability: choice.itemRow.row.durability ? choice.itemRow.row.durability - 1 : undefined
						}, {
							showID: false
						})
						const effectsDisplay = getEffectsDisplay(choice.itemRow.item.effects)

						messages[i].push(`<@${choiceInfo.member.id}> injects themself with ${itemDisplay}.` +
							`\n\n__Effects Received__\n${effectsDisplay.join('\n')}`)
					}
					else {
						// user chose to attack
						const atkTransaction = await beginTransaction()
						const choice = choiceInfo.selection

						const playerBackpackRows = await getUserBackpack(atkTransaction.query, choiceInfo.member.id, true)
						const playerInventory = getItems(playerBackpackRows)
						const stimulantEffects = addStatusEffects(choiceInfo.stimulants, choiceInfo.afflictions)
						const victimEffects = addStatusEffects(npcStimulants, npcAfflictions)
						const stimulantDamageMulti = (1 + (stimulantEffects.damageBonus / 100) - ((victimEffects.damageTaken * -1) / 100))

						const weaponChoice = choice.weapon
						const hasWeapon = !weaponChoice.row || playerInventory.items.find(itm => itm.row.id === weaponChoice.row.id)
						const hasAmmo = playerInventory.items.find(itm => itm.row.id === choice.ammo?.row.id)
						const bodyPartHit = getBodyPartHit(choice.weapon.item.accuracy + stimulantEffects.accuracyBonus, choice.limbTarget)
						const missedPartChoice = choice.limbTarget && (choice.limbTarget !== bodyPartHit.result || !bodyPartHit.accurate)
						const limbsHit = []
						let totalDamage

						// verify user has weapon they want to attack with
						if (!hasWeapon || !choice.weapon) {
							await atkTransaction.commit()
							messages[i].push(`${icons.danger} <@${choiceInfo.member.id}> did not have the weapon they wanted to use. Their turn has been skipped.`)
							continue
						}
						else if (choice.weapon.item.type === 'Ranged Weapon') {
							if (!hasAmmo || !choice.ammo) {
								await atkTransaction.commit()
								messages[i].push(`${icons.danger} <@${choiceInfo.member.id}> did not have the ammunition they wanted to use. Their turn has been skipped.`)
								continue
							}

							await deleteItem(atkTransaction.query, choice.ammo.row.id)

							if (choice.ammo.item.spreadsDamageToLimbs) {
								limbsHit.push({
									damage: getAttackDamage((choice.ammo.item.damage * stimulantDamageMulti) / choice.ammo.item.spreadsDamageToLimbs, choice.ammo.item.penetration, bodyPartHit.result, location.boss.armor, location.boss.helmet),
									limb: bodyPartHit.result
								})

								for (let i2 = 0; i2 < choice.ammo.item.spreadsDamageToLimbs - 1; i2++) {
									let limb = getBodyPartHit(choice.weapon.item.accuracy)

									// make sure no duplicate limbs are hit
									while (limbsHit.find(l => l.limb === limb.result)) {
										limb = getBodyPartHit(choice.weapon.item.accuracy)
									}

									limbsHit.push({
										damage: getAttackDamage((choice.ammo.item.damage * stimulantDamageMulti) / choice.ammo.item.spreadsDamageToLimbs, choice.ammo.item.penetration, limb.result, location.boss.armor, location.boss.helmet),
										limb: limb.result
									})
								}
							}
							else {
								limbsHit.push({
									damage: getAttackDamage((choice.ammo.item.damage * stimulantDamageMulti), choice.ammo.item.penetration, bodyPartHit.result, location.boss.armor, location.boss.helmet),
									limb: bodyPartHit.result
								})
							}

							totalDamage = limbsHit.reduce((prev, curr) => prev + curr.damage.total, 0)

							if (missedPartChoice) {
								messages[i].push(`<@${choiceInfo.member.id}> tries to shoot ${npcDisplayName} in the ${getBodyPartEmoji(choice.limbTarget!)} **${choice.limbTarget}** with their ${getItemDisplay(choice.weapon.item)} (ammo: ${getItemDisplay(choice.ammo.item)}) **BUT MISSES!**\n`)
							}
							else {
								messages[i].push(getAttackString(choice.weapon.item, `<@${choiceInfo.member.id}>`, npcDisplayName, limbsHit, totalDamage, choice.ammo.item))
							}
						}
						else if (choice.weapon.item.type === 'Throwable Weapon') {
							if (choice.weapon.item.spreadsDamageToLimbs) {
								limbsHit.push({
									damage: getAttackDamage((choice.weapon.item.damage * stimulantDamageMulti) / choice.weapon.item.spreadsDamageToLimbs, choice.weapon.item.penetration, bodyPartHit.result, location.boss.armor, location.boss.helmet),
									limb: bodyPartHit.result
								})

								for (let i2 = 0; i2 < choice.weapon.item.spreadsDamageToLimbs - 1; i2++) {
									let limb = getBodyPartHit(choice.weapon.item.accuracy)

									// make sure no duplicate limbs are hit
									while (limbsHit.find(l => l.limb === limb.result)) {
										limb = getBodyPartHit(choice.weapon.item.accuracy)
									}

									limbsHit.push({
										damage: getAttackDamage((choice.weapon.item.damage * stimulantDamageMulti) / choice.weapon.item.spreadsDamageToLimbs, choice.weapon.item.penetration, limb.result, location.boss.armor, location.boss.helmet),
										limb: limb.result
									})
								}
							}
							else {
								limbsHit.push({
									damage: getAttackDamage((choice.weapon.item.damage * stimulantDamageMulti), choice.weapon.item.penetration, bodyPartHit.result, location.boss.armor, location.boss.helmet),
									limb: bodyPartHit.result
								})
							}

							totalDamage = limbsHit.reduce((prev, curr) => prev + curr.damage.total, 0)

							if (missedPartChoice) {
								messages[i].push(`${icons.danger} <@${choiceInfo.member.id}> tries to throw a ${getItemDisplay(choice.weapon.item)} at ${npcDisplayName}'s ${getBodyPartEmoji(choice.limbTarget!)} **${choice.limbTarget}** **BUT MISSES!**\n`)
							}
							else {
								messages[i].push(getAttackString(choice.weapon.item, `<@${choiceInfo.member.id}>`, `${npcDisplayName}`, limbsHit, totalDamage))

								if (choice.weapon.item.subtype === 'Incendiary Grenade' && !npcAfflictions.includes(afflictions.Burning)) {
									messages[i].push(`${icons.debuff} ${npcDisplayName} is Burning! (${combineArrayWithAnd(getEffectsDisplay(afflictions.Burning.effects))})`)

									npcAfflictions.push(afflictions.Burning)
								}
							}
						}
						else {
							// melee weapon
							limbsHit.push({
								damage: getAttackDamage((choice.weapon.item.damage * stimulantDamageMulti), choice.weapon.item.penetration, bodyPartHit.result, location.boss.armor, location.boss.helmet),
								limb: bodyPartHit.result
							})
							totalDamage = limbsHit[0].damage.total

							if (missedPartChoice) {
								messages[i].push(`${icons.danger} <@${choiceInfo.member.id}> tries to hit ${npcDisplayName} in the ${getBodyPartEmoji(choice.limbTarget!)} **${choice.limbTarget}** with their ${getItemDisplay(choice.weapon.item)} **BUT MISSES!**\n`)
							}
							else {
								messages[i].push(getAttackString(choice.weapon.item, `<@${choiceInfo.member.id}>`, `${npcDisplayName}`, limbsHit, totalDamage))
							}
						}

						// remove weapon
						if (choice.weapon.row && (!choice.weapon.row.durability || choice.weapon.row.durability - 1 <= 0)) {
							messages[i].push(`${icons.danger} **${choiceInfo.member.displayName}**'s ${getItemDisplay(choice.weapon.item, choice.weapon.row, { showDurability: false, showEquipped: false })} broke from this attack.`)

							await deleteItem(atkTransaction.query, choice.weapon.row.id)
						}
						else if (choice.weapon.row && choice.weapon.row.durability) {
							messages[i].push(`**${choiceInfo.member.displayName}**'s ${getItemDisplay(choice.weapon.item, choice.weapon.row, { showDurability: false, showEquipped: false })} now has **${choice.weapon.row.durability - 1}** durability.`)

							await lowerItemDurability(atkTransaction.query, choice.weapon.row.id, 1)
						}

						if (!missedPartChoice) {
							for (const result of limbsHit) {
								if (result.limb === 'head' && location.boss.helmet) {
									messages[i].push(`${npcDisplayName}'s helmet (${getItemDisplay(location.boss.helmet)}) reduced the damage by **${result.damage.reduced}**.`)
								}
								else if (result.limb === 'chest' && location.boss.armor) {
									messages[i].push(`${npcDisplayName}'s armor (${getItemDisplay(location.boss.armor)}) reduced the damage by **${result.damage.reduced}**.`)
								}
								else if (result.limb === 'arm' && Math.random() <= 0.2 && !npcAfflictions.includes(afflictions['Broken Arm'])) {
									messages[i].push(`${icons.debuff} ${npcDisplayName}'s arm was broken! (${combineArrayWithAnd(getEffectsDisplay(afflictions['Broken Arm'].effects))})`)

									npcAfflictions.push(afflictions['Broken Arm'])
								}
							}

							npcHealth -= totalDamage
						}

						const bossKilledEmbeds: Embed[] = []

						if (!missedPartChoice && npcHealth <= 0) {
							const weaponReceiver = players[Math.floor(Math.random() * players.length)].member.id
							const armorReceiver = players[Math.floor(Math.random() * players.length)].member.id
							const helmetReceiver = players[Math.floor(Math.random() * players.length)].member.id

							messages[i].push(`☠️ ${npcDisplayName} **DIED!**`)
							msgContent = `${combineArrayWithAnd(players.map(p => `<@${p.member.id}>`))} unlocked a new region! You can now travel to ${combineArrayWithAnd(nextLocation.map(l => `**${l.display}**`))}.`

							for (const player of players) {
								const userData = (await getUserRow(atkTransaction.query, player.member.id, true))!
								const userQuests = (await getUserQuests(atkTransaction.query, player.member.id, true)).filter(q => q.questType === 'NPC Kills' || q.questType === 'Any Kills' || q.questType === 'Boss Kills')
								const droppedItems = []

								if (location.boss.armor && armorReceiver === player.member.id) {
									const armorDura = getRandomInt(Math.max(1, location.boss.armor.durability / 2), location.boss.armor.durability)
									const armorRow = await createItem(atkTransaction.query, location.boss.armor.name, { durability: armorDura })
									await addItemToBackpack(atkTransaction.query, player.member.id, armorRow.id)

									droppedItems.push({
										item: location.boss.armor,
										row: armorRow
									})
								}

								if (location.boss.helmet && helmetReceiver === player.member.id) {
									const helmDura = getRandomInt(Math.max(1, location.boss.helmet.durability / 2), location.boss.helmet.durability)
									const helmRow = await createItem(atkTransaction.query, location.boss.helmet.name, { durability: helmDura })
									await addItemToBackpack(atkTransaction.query, player.member.id, helmRow.id)

									droppedItems.push({
										item: location.boss.helmet,
										row: helmRow
									})
								}

								if (location.boss.type === 'raider') {
									// drop weapon and ammo on ground

									if ('ammo' in location.boss) {
										// drop random amount of bullets
										const ammoToDrop = getRandomInt(1, 2)

										for (let a = 0; a < ammoToDrop; a++) {
											const ammoRow = await createItem(atkTransaction.query, location.boss.ammo.name, { durability: location.boss.ammo.durability })
											await addItemToBackpack(atkTransaction.query, player.member.id, ammoRow.id)

											droppedItems.push({
												item: location.boss.ammo,
												row: ammoRow
											})
										}
									}

									if (weaponReceiver === player.member.id) {
										// weapon durability is random
										const weapDurability = location.boss.weapon.durability ? getRandomInt(Math.max(1, location.boss.weapon.durability / 2), location.boss.weapon.durability) : undefined
										const weapRow = await createItem(atkTransaction.query, location.boss.weapon.name, { durability: weapDurability })
										await addItemToBackpack(atkTransaction.query, player.member.id, weapRow.id)

										droppedItems.push({
											item: location.boss.weapon,
											row: weapRow
										})
									}
								}

								// roll random loot drops
								for (let l = 0; l < location.boss.drops.rolls; l++) {
									const lootDrop = getMobDrop(location.boss)

									if (lootDrop) {
										let itemDurability

										// item durability is random when dropped by npc
										if (lootDrop.item.durability) {
											itemDurability = getRandomInt(Math.max(1, lootDrop.item.durability / 4), lootDrop.item.durability)
										}

										const lootDropRow = await createItem(atkTransaction.query, lootDrop.item.name, { durability: itemDurability })
										await addItemToBackpack(atkTransaction.query, player.member.id, lootDropRow.id)

										droppedItems.push({
											item: lootDrop.item,
											row: lootDropRow,
											rarityDisplay: lootDrop.rarityDisplay
										})
									}
								}

								await setFighting(atkTransaction.query, player.member.id, false)
								await createCooldown(atkTransaction.query, player.member.id, `npcdead-${location.display}`, location.boss.respawnTime)
								await increaseKills(atkTransaction.query, player.member.id, 'boss', 1)
								await addXp(atkTransaction.query, player.member.id, location.boss.xp)

								if (userData.locationLevel <= location.locationLevel) {
									await setLocationLevel(atkTransaction.query, player.member.id, userData.locationLevel + 1)
								}

								// check if user has any kill quests
								for (const quest of userQuests) {
									if (quest.progress < quest.progressGoal) {
										if (
											quest.questType === 'Boss Kills' ||
											quest.questType === 'Any Kills' ||
											quest.questType === 'NPC Kills'
										) {
											await increaseProgress(atkTransaction.query, quest.id, 1)
										}
									}
								}

								// have to put loot in a separate embed to avoid character limit issues (up to 18 mob drops can be displayed by using an embed description)
								const killEmbed = new Embed()
									.setAuthor(`${player.member.user.username}#${player.member.user.discriminator}'s Loot Received`, player.member.avatarURL)
									.setColor(9043800)
									.setDescription(`🌟 ***+${location.boss.xp}** xp!*` +
										`\n${(sortItemsByLevel(droppedItems, true) as (ItemWithRow<ItemRow> & { rarityDisplay?: string })[])
											.map(itm => 'rarityDisplay' in itm ? `${itm.rarityDisplay} ${getItemDisplay(itm.item, itm.row)}` : `${getRarityDisplay('Common')} ${getItemDisplay(itm.item, itm.row)}`).join('\n')}`)

								lootEmbeds.push({ ...killEmbed.embed })

								// removing the author field because I dont want user avatars to show in the global kill feed
								killEmbed.embed.author = undefined
								killEmbed.setTitle(`__${player.member.user.username}#${player.member.user.discriminator}'s Loot Received__`)
								bossKilledEmbeds.push(killEmbed)
							}
						}
						else if (!missedPartChoice) {
							messages[i].push(`${npcDisplayName} is left with ${formatHealth(npcHealth, location.boss.health)} **${npcHealth}** health.`)
						}

						// commit changes
						await atkTransaction.commit()

						if (!missedPartChoice && npcHealth <= 0) {
							// end the duel
							duelIsActive = false

							if (webhooks.pvp.id && webhooks.pvp.token) {
								try {
									await this.app.bot.executeWebhook(webhooks.pvp.id, webhooks.pvp.token, {
										content: `☠️ ${combineArrayWithAnd(players.map(p => `**${p.member.user.username}#${p.member.user.discriminator}**`))} killed ${npcDisplayName} (${location.display} Boss)`,
										embeds: bossKilledEmbeds.map(e => e.embed)
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

				const playersDisplay = orderedChoices.filter((c): c is OrderedPlayerChoice => c.type === 'player').map(c => c.member.displayName)
				const actionsEmbed = new Embed()
					.setTitle(`Boss Fight${players.length ?
						` - ${combineArrayWithAnd(playersDisplay)}` :
						''} vs ${location.boss.display}`)
					.setFooter(`Turn #${turnNumber} · actions are ordered by speed (higher speed action goes first)`)

				const filteredMessages = messages.filter(m => m.length)
				for (let i = 0; i < filteredMessages.length; i++) {
					actionsEmbed.addField('\u200b', `${i + 1}. ${filteredMessages[i].join('\n')}`)
				}

				await ctx.sendFollowUp({
					content: msgContent,
					embeds: lootEmbeds.length ? [actionsEmbed.embed, ...lootEmbeds] : [actionsEmbed.embed]
				})
			}
			catch (err) {
				// TODO cancel duel early due to an error?
				logger.warn(err)
			}
			finally {
				playerChoices.clear()

				if (duelIsActive) {
					if (turnNumber >= 20) {
						duelIsActive = false

						for (const player of players) {
							await setFighting(query, player.member.id, false)
						}

						await ctx.sendFollowUp({
							content: `${icons.danger} ${players.map(p => `<@${p.member.id}>`).join(' ')}, **The max turn limit (20) has been reached!** The boss fight ends in a tie.`
						})
					}
					else {
						players = await Promise.all(players.map(async p => ({
							...p,
							data: (await getUserRow(query, p.member.id))!,
							inventory: await getUserBackpack(query, p.member.id)
						})))

						turnNumber += 1

						botMessage = await ctx.sendFollowUp({
							content: `${players.map(p => `<@${p.member.id}>`).join(' ')}, Turn #${turnNumber} - select your action:`,
							embeds: [
								this.getMobDuelEmbed(
									players,
									location.boss,
									npcHealth,
									turnNumber,
									npcStimulants,
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
	}

	getMobDuelEmbed (
		players: Player[],
		mob: NPC,
		npcHealth: number,
		turnNumber: number,
		npcStimulants: Stimulant[],
		npcAfflictions: Affliction[]
	): Embed {
		const npcEffects = addStatusEffects(npcStimulants, npcAfflictions)
		const npcEffectsDisplay = getEffectsDisplay(npcEffects)

		const duelEmb = new Embed()
			.addField(`${mob.display} (Boss Fight)`, `__**Health**__\n**${npcHealth} / ${mob.health}** HP\n${formatHealth(npcHealth, mob.health, { emojisLength: 17 })}`)
			.addField('\u200b', getMobDisplay(mob, npcHealth, { showHealth: false }).join('\n'), true)
			.addField('\u200b', `__**Stimulants**__\n${npcStimulants.length ? npcStimulants.map(i => getItemDisplay(i)).join('\n') : 'None'}` +
				`\n\n__**Afflictions**__\n${npcAfflictions.length ? combineArrayWithAnd(npcAfflictions.map(a => a.name)) : 'None'}` +
				`${npcEffectsDisplay.length ? `\n\n__**Effects**__\n${npcEffectsDisplay.join('\n')}` : ''}`, true)
			.addBlankField()
			.setFooter(`Turn #${turnNumber} / 20 max · 40 seconds to make selection`)

		for (const player of players) {
			const playerEquips = getEquips(player.inventory)
			const playerEffects = addStatusEffects(player.stimulants, player.afflictions)
			const playerEffectsDisplay = getEffectsDisplay(playerEffects)

			duelEmb.addField(`${player.member.user.username}#${player.member.user.discriminator} (Level ${player.data.level})`,
				`__**Health**__\n**${player.data.health} / ${player.data.maxHealth}** HP\n${formatHealth(player.data.health, player.data.maxHealth)}` +
				`\n\n__**Gear**__\n**Backpack**: ${playerEquips.backpack ? getItemDisplay(playerEquips.backpack.item, playerEquips.backpack.row, { showEquipped: false, showID: false }) : 'None'}` +
				`\n**Helmet**: ${playerEquips.helmet ? getItemDisplay(playerEquips.helmet.item, playerEquips.helmet.row, { showEquipped: false, showID: false }) : 'None'}` +
				`\n**Body Armor**: ${playerEquips.armor ? getItemDisplay(playerEquips.armor.item, playerEquips.armor.row, { showEquipped: false, showID: false }) : 'None'}` +
				`\n\n__**Stimulants**__\n${player.stimulants.length ? player.stimulants.map(i => getItemDisplay(i)).join('\n') : 'None'}` +
				`\n\n__**Afflictions**__\n${player.afflictions.length ? combineArrayWithAnd(player.afflictions.map(a => a.name)) : 'None'}` +
				`${playerEffectsDisplay.length ? `\n\n__**Effects**__\n${playerEffectsDisplay.join('\n')}` : ''}`,
				true)
		}

		return duelEmb
	}

	getAgreementEmbed (location: Location, users: ResolvedMember[], agreedUsers: string[]): Embed {
		const embed = new Embed()
			.setTitle(`${location.display} Boss Fight`)
			.setDescription(`${users.length === 1 ? `${icons.warning} It is highly recommended to invite at least **1** other player to help you fight this boss!\n` : ''}` +
				`${icons.warning} If you die, you will lose everything in your inventory.` +
				`\n${icons.information} All participants who **survive** the fight will progress and receive some loot + xp.` +
				' The weapon, helmet, and armor will be split randomly between survivors.')
			.addField(location.boss.display, getMobDisplay(location.boss, location.boss.health).join('\n'), true)
			.addField(`Participants (${users.length})`, users.map(u => agreedUsers.includes(u.id) ?
				`${icons.checkmark} ${u.displayName} - Ready!` :
				`${icons.cancel} ${u.displayName} - Not ready`
			).join('\n'), true)
			.setFooter('All players must ready up within 30 seconds to start the fight')

		return embed
	}

	async awaitPlayerAgreements (botMessage: Message, location: Location, users: ResolvedMember[]): Promise<void> {
		return new Promise((resolve, reject) => {
			const { collector, stopCollector } = this.app.componentCollector.createCollector(botMessage.id, c => users.some(m => m.id === c.user.id), 30000)
			const agreedUsers: string[] = []

			collector.on('collect', async c => {
				try {
					await c.acknowledge()

					if (c.customID === 'accept') {
						if (agreedUsers.includes(c.user.id)) {
							await c.send({
								ephemeral: true,
								content: 'You have already readied up!'
							})
							return
						}

						agreedUsers.push(c.user.id)

						if (users.every(m => agreedUsers.includes(m.id))) {
							stopCollector()
							resolve()
						}
						else {
							await c.editParent({
								embeds: [this.getAgreementEmbed(location, users, agreedUsers).embed]
							})
						}
					}
				}
				catch (err) {
					// continue
				}
			})

			collector.on('end', msg => {
				if (msg === 'time') {
					reject(new Error('time'))
				}
			})
		})
	}
}

export default BossCommand
