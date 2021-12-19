import { CommandOptionType, SlashCreator, CommandContext, ComponentType, Message, ComponentContext, ComponentSelectMenu } from 'slash-create'
import { ResolvedMember } from 'slash-create/lib/structures/resolvedMember'
import App from '../app'
import { icons } from '../config'
import { Affliction, afflictions } from '../resources/afflictions'
import { allItems, items } from '../resources/items'
import CustomSlashCommand from '../structures/CustomSlashCommand'
import Embed from '../structures/Embed'
import { Ammunition, HealingMedical, Item, MeleeWeapon, RangedWeapon, StimulantMedical, ThrowableWeapon, Weapon } from '../types/Items'
import { BackpackItemRow, ItemWithRow, UserRow } from '../types/mysql'
import { GRAY_BUTTON, GREEN_BUTTON, RED_BUTTON } from '../utils/constants'
import { addItemToBackpack, createItem, deleteItem, getUserBackpack, lowerItemDurability, removeItemFromBackpack } from '../utils/db/items'
import { beginTransaction, query } from '../utils/db/mysql'
import { addHealth, addXp, getUserRow, increaseDeaths, increaseKills, lowerHealth, setFighting } from '../utils/db/players'
import { getUserQuests, increaseProgress } from '../utils/db/quests'
import { getEquips, getItemDisplay, getItemPrice, getItems, sortItemsByAmmo, sortItemsByLevel, sortItemsByValue } from '../utils/itemUtils'
import { logger } from '../utils/logger'
import { addStatusEffects, getEffectsDisplay } from '../utils/playerUtils'
import { BodyPart, getAttackDamage, getBodyPartHit } from '../utils/raidUtils'
import { combineArrayWithAnd, formatHealth, formatMoney, getBodyPartEmoji } from '../utils/stringUtils'

type ItemWithRowOfType<T extends Item> = ItemWithRow<BackpackItemRow> & { item: T }

const maxStimulantsPerDuel = 4

class DuelCommand extends CustomSlashCommand {
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
			category: 'info',
			guildModsOnly: false,
			worksInDMs: false,
			worksDuringDuel: false,
			guildIDs: []
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

		const memberData = await getUserRow(query, member.id)
		if (!memberData) {
			await ctx.send({
				content: `${icons.warning} **${member.displayName}** does not have an account!`
			})
			return
		}

		let botMessage = await ctx.send({
			content: `<@${member.id}>, **${ctx.member.displayName}** would like to fight you!`,
			components: [{
				type: ComponentType.ACTION_ROW,
				components: [GREEN_BUTTON('Accept Duel', 'confirmed'), RED_BUTTON('Decline', 'canceled')]
			}]
		}) as Message

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
			const player1Stimulants: StimulantMedical[] = []
			const player1Afflictions: Affliction[] = []
			const player2Stimulants: StimulantMedical[] = []
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

			await setFighting(preTransaction.query, ctx.user.id, true)
			await setFighting(preTransaction.query, member.id, true)
			await preTransaction.commit()

			await confirmed.editParent({
				content: `<@${ctx.user.id}>'s turn:`,
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

			let turn = ctx.user.id
			let turnNumber = 1
			let duelIsActive = true

			while (duelIsActive) {
				try {
					const otherPlayerID = turn === ctx.user.id ? member.id : ctx.user.id
					let validActionChoice = false
					let healBtnDisabled = false
					let stimBtnDisabled = false

					while (!validActionChoice) {
						const val = await this.getActionChoice(turn, otherPlayerID, botMessage.id)
						await val.acknowledge()

						if (val.customID === 'attack') {
							validActionChoice = true
							await val.editOriginal({
								components: [{
									type: ComponentType.ACTION_ROW,
									components: [GREEN_BUTTON('Attack', 'attack', true, '🗡️'), GRAY_BUTTON('Use Medical Item', 'heal', true, '🩹'), GRAY_BUTTON('Use Stimulant', 'stimulant', true, '💉'), RED_BUTTON('Try to Flee', 'flee', true)]
								}]
							})

							let validAttack = false
							while (!validAttack) {
								const choice = await this.getAttackChoice(val, turn)
								const atkTransaction = await beginTransaction()

								// fetch user row to prevent changes during attack
								await getUserRow(atkTransaction.query, turn, true)

								const playerBackpackRows = await getUserBackpack(atkTransaction.query, turn, true)
								const victimData = (await getUserRow(atkTransaction.query, otherPlayerID, true))!
								const victimBackpackRows = await getUserBackpack(atkTransaction.query, otherPlayerID, true)
								const playerInventory = getItems(playerBackpackRows)
								const victimInventory = getItems(victimBackpackRows)
								const victimEquips = getEquips(victimBackpackRows)
								const playerStimulants = turn === ctx.user.id ? player1Stimulants : player2Stimulants
								const playerAfflictions = turn === ctx.user.id ? player1Afflictions : player2Afflictions
								const victimStimulants = turn === ctx.user.id ? player2Stimulants : player1Stimulants
								const victimAfflictions = turn === ctx.user.id ? player2Afflictions : player1Afflictions
								const stimulantEffects = addStatusEffects(playerStimulants, playerAfflictions)
								const victimEffects = addStatusEffects(victimStimulants, victimAfflictions)
								const stimulantDamageMulti = (1 + (stimulantEffects.damageBonus / 100) - (victimEffects.damageReduction / 100))

								const weaponChoice = choice.weapon
								const hasWeapon = !weaponChoice.row || playerInventory.items.find(i => i.row.id === weaponChoice.row.id)
								const hasAmmo = playerInventory.items.find(i => i.row.id === choice.ammo?.row.id)
								const bodyPartHit = getBodyPartHit((choice.weapon.item as Weapon).accuracy + stimulantEffects.accuracyBonus, choice.limbTarget)
								const missedPartChoice = choice.limbTarget && (choice.limbTarget !== bodyPartHit.result || !bodyPartHit.accurate)
								const victimItemsRemoved: number[] = []
								const limbsHit = []
								const messages = []
								let attackPenetration
								let totalDamage

								// verify user has weapon they want to attack with
								if (!hasWeapon || !choice.weapon) {
									await atkTransaction.commit()
									await val.sendFollowUp({
										ephemeral: true,
										content: `${icons.danger} Could not find ${getItemDisplay(choice.weapon.item)} in your inventory. Re-running weapon selection menu...`
									})
									continue
								}
								else if (choice.weapon.item.type === 'Ranged Weapon') {
									if (!hasAmmo || !choice.ammo) {
										await atkTransaction.commit()
										await val.sendFollowUp({
											ephemeral: true,
											content: `${icons.danger} Could not find ${getItemDisplay(choice.ammo!.item)} in your inventory. Re-running weapon selection menu...`
										})
										continue
									}

									attackPenetration = choice.ammo.item.penetration
									await deleteItem(atkTransaction.query, choice.ammo.row.id)

									if (choice.ammo.item.spreadsDamageToLimbs) {
										limbsHit.push({
											damage: getAttackDamage((choice.ammo.item.damage * stimulantDamageMulti) / choice.ammo.item.spreadsDamageToLimbs, choice.ammo.item.penetration, bodyPartHit.result, victimEquips.armor?.item, victimEquips.helmet?.item),
											limb: bodyPartHit.result
										})

										for (let i = 0; i < choice.ammo.item.spreadsDamageToLimbs - 1; i++) {
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
										messages.push(`<@${turn}> tries to shoot <@${otherPlayerID}> in the ${getBodyPartEmoji(choice.limbTarget!)} **${choice.limbTarget}** with their ${getItemDisplay(choice.weapon.item)} (ammo: ${getItemDisplay(choice.ammo.item)}) **BUT MISSES!**\n`)
									}
									else {
										messages.push(this.getAttackString(choice.weapon.item, `<@${turn}>`, `<@${otherPlayerID}>`, limbsHit, totalDamage, choice.ammo.item))
									}
								}
								else if (choice.weapon.item.type === 'Throwable Weapon') {
									attackPenetration = choice.weapon.item.penetration

									if (choice.weapon.item.spreadsDamageToLimbs) {
										limbsHit.push({
											damage: getAttackDamage((choice.weapon.item.damage * stimulantDamageMulti) / choice.weapon.item.spreadsDamageToLimbs, choice.weapon.item.penetration, bodyPartHit.result, victimEquips.armor?.item, victimEquips.helmet?.item),
											limb: bodyPartHit.result
										})

										for (let i = 0; i < choice.weapon.item.spreadsDamageToLimbs - 1; i++) {
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
										messages.push(`${icons.danger} <@${turn}> tries to throw a ${getItemDisplay(choice.weapon.item)} at <@${otherPlayerID}>'s ${getBodyPartEmoji(choice.limbTarget!)} **${choice.limbTarget}** **BUT MISSES!**\n`)
									}
									else {
										messages.push(this.getAttackString(choice.weapon.item, `<@${turn}>`, `<@${otherPlayerID}>`, limbsHit, totalDamage))

										if (choice.weapon.item.subtype === 'Incendiary Grenade') {
											messages.push(`- ${icons.debuff} <@${otherPlayerID}> is Burning! (${combineArrayWithAnd(getEffectsDisplay(afflictions.Burning.effects))})`)

											if (turn === ctx.user.id) {
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
									attackPenetration = choice.weapon.item.penetration
									limbsHit.push({
										damage: getAttackDamage((choice.weapon.item.damage * stimulantDamageMulti), choice.weapon.item.penetration, bodyPartHit.result, victimEquips.armor?.item, victimEquips.helmet?.item),
										limb: bodyPartHit.result
									})
									totalDamage = limbsHit[0].damage.total

									if (missedPartChoice) {
										messages.push(`${icons.danger} <@${turn}> tries to hit <@${otherPlayerID}> in the ${getBodyPartEmoji(choice.limbTarget!)} **${choice.limbTarget}** with their ${getItemDisplay(choice.weapon.item)} **BUT MISSES!**\n`)
									}
									else {
										messages.push(this.getAttackString(choice.weapon.item, `<@${turn}>`, `<@${otherPlayerID}>`, limbsHit, totalDamage))
									}
								}

								// remove weapon annd ammo
								if (choice.weapon.row && (!choice.weapon.row.durability || choice.weapon.row.durability - 1 <= 0)) {
									messages.push(`- ${icons.danger} <@${turn}>'s ${getItemDisplay(choice.weapon.item, choice.weapon.row, { showDurability: false, showEquipped: false })} broke from this attack.`)

									await deleteItem(atkTransaction.query, choice.weapon.row.id)
								}
								else if (choice.weapon.row && choice.weapon.row.durability) {
									messages.push(`- <@${turn}>'s ${getItemDisplay(choice.weapon.item, choice.weapon.row, { showDurability: false, showEquipped: false })} now has **${choice.weapon.row.durability - 1}** durability.`)

									await lowerItemDurability(atkTransaction.query, choice.weapon.row.id, 1)
								}

								if (!missedPartChoice) {
									for (const result of limbsHit) {
										if (result.limb === 'head' && victimEquips.helmet) {
											messages.push(`- <@${otherPlayerID}>'s helmet (${getItemDisplay(victimEquips.helmet.item)}) reduced the damage by **${result.damage.reduced}**.`)

											// only lower helmet durability if attackers weapon is within 1 penetration (exclusive) of
											// the level of armor victim is wearing (so if someone used a knife with 1.0 level penetration
											// against someone who had level 3 armor, the armor would NOT lose durability)
											if (attackPenetration > victimEquips.helmet.item.level - 1) {
												if (victimEquips.helmet.row.durability - 1 <= 0) {
													messages.push(`- <@${otherPlayerID}>'s ${getItemDisplay(victimEquips.helmet.item)} broke from this attack!`)

													await deleteItem(atkTransaction.query, victimEquips.helmet.row.id)
													victimItemsRemoved.push(victimEquips.helmet.row.id)
												}
												else {
													await lowerItemDurability(atkTransaction.query, victimEquips.helmet.row.id, 1)
												}
											}
										}
										else if (result.limb === 'chest' && victimEquips.armor) {
											messages.push(`- <@${otherPlayerID}>'s armor (${getItemDisplay(victimEquips.armor.item)}) reduced the damage by **${result.damage.reduced}**.`)

											// only lower armor durability if attackers weapon is within 1 penetration (exclusive) of
											// the level of armor victim is wearing (so if someone used a knife with 1.0 level penetration
											// against someone who had level 3 armor, the armor would NOT lose durability)
											if (attackPenetration > victimEquips.armor.item.level - 1) {
												if (victimEquips.armor.row.durability - 1 <= 0) {
													messages.push(`- <@${otherPlayerID}>'s ${getItemDisplay(victimEquips.armor.item)} broke from this attack!`)

													await deleteItem(atkTransaction.query, victimEquips.armor.row.id)
													victimItemsRemoved.push(victimEquips.armor.row.id)
												}
												else {
													await lowerItemDurability(atkTransaction.query, victimEquips.armor.row.id, 1)
												}
											}
										}
										else if (result.limb === 'arm' && Math.random() <= 0.2) {
											messages.push(`- ${icons.debuff} <@${otherPlayerID}>'s arm was broken! (${combineArrayWithAnd(getEffectsDisplay(afflictions['Broken Arm'].effects))})`)

											if (turn === ctx.user.id) {
												player2Afflictions.push(afflictions['Broken Arm'])
											}
											else {
												player1Afflictions.push(afflictions['Broken Arm'])
											}
										}
									}
								}

								// have to filter out the removed armor/helmet to prevent sql reference errors
								const victimLoot = victimInventory.items.filter(i => !victimItemsRemoved.includes(i.row.id))

								if (!missedPartChoice && victimData.health - totalDamage <= 0) {
									const killQuests = (await getUserQuests(atkTransaction.query, turn, true)).filter(q => q.questType === 'Player Kills' || q.questType === 'Any Kills')
									let xpEarned = 15

									for (const victimItem of victimLoot) {
										// 3 xp per level of the item
										xpEarned += victimItem.item.itemLevel * 3

										await removeItemFromBackpack(atkTransaction.query, victimItem.row.id)
									}

									// create dog tags for victim
									const otherPlayerUser = turn === ctx.user.id ? member.user : ctx.user
									const dogTagsRow = await createItem(atkTransaction.query, items.dog_tags.name, { displayName: `${otherPlayerUser.username.replace(/`/g, '')}#${otherPlayerUser.discriminator}'s dog tags` })
									victimLoot.push({
										item: items.dog_tags,
										row: { ...dogTagsRow, equipped: 0 }
									})

									await increaseKills(atkTransaction.query, turn, 'player', 1)
									await increaseDeaths(atkTransaction.query, otherPlayerID, 1)
									await addXp(atkTransaction.query, turn, xpEarned)

									// check if user has any kill quests
									for (const quest of killQuests) {
										if (quest.progress < quest.progressGoal) {
											await increaseProgress(atkTransaction.query, quest.id, 1)
										}
									}

									messages.push(`\n☠️ <@${otherPlayerID}> **DIED!** They dropped **${victimLoot.length}** items.`, `<@${turn}> earned 🌟 ***+${xpEarned}*** xp for this kill.`)
								}
								else if (!missedPartChoice) {
									await lowerHealth(atkTransaction.query, otherPlayerID, totalDamage)

									messages.push(`- <@${otherPlayerID}> is left with ${formatHealth(victimData.health - totalDamage, victimData.maxHealth)} **${victimData.health - totalDamage}** health.`)
								}

								// commit changes and end attack loop
								await setFighting(atkTransaction.query, ctx.user.id, false)
								await setFighting(atkTransaction.query, member.id, false)
								await atkTransaction.commit()
								validAttack = true

								const attackEmbed = new Embed()
									.setTitle(`Duel - ${ctx.member.displayName} vs ${member.displayName}`)
									.setDescription(messages.join('\n'))
									.setFooter(`Turn #${turnNumber}`)

								if (!missedPartChoice && victimData.health - totalDamage <= 0) {
									// end the duel
									duelIsActive = false

									await val.sendFollowUp({
										content: `<@${turn}> wins the duel!`,
										embeds: [attackEmbed.embed]
									})

									// user picks items from victims inventory
									const maxPossibleItemsToPick = Math.min(victimLoot.length, 5)
									const components: ComponentSelectMenu[] = [
										{
											type: ComponentType.SELECT,
											min_values: 1,
											max_values: maxPossibleItemsToPick,
											custom_id: 'items',
											placeholder: 'Select up to 5 items to keep.',
											options: sortItemsByValue(victimLoot, true).slice(0, 25).map(i => {
												const iconID = i.item.icon.match(/:([0-9]*)>/)

												return {
													label: `${i.row.displayName ? i.row.displayName : i.item.name.replace(/_/g, ' ')} (ID: ${i.row.id})`,
													value: i.row.id.toString(),
													description: `${i.row.durability ? `${i.row.durability} uses left. ` : ''}Worth ${formatMoney(getItemPrice(i.item, i.row), false, false)}`,
													emoji: iconID ? {
														id: iconID[1],
														name: i.item.name
													} : undefined
												}
											})
										}
									]
									const itemSelectMessage = await val.sendFollowUp({
										ephemeral: true,
										content: `Select up to **5** items from <@${otherPlayerID}>'s inventory to keep.`,
										components: [{
											type: ComponentType.ACTION_ROW,
											components
										}]
									})

									try {
										const itemsPicked = await this.getItemChoices(itemSelectMessage, victimLoot)

										for (const victimItem of victimLoot) {
											if (itemsPicked.some(i => i.row.id === victimItem.row.id)) {
												await addItemToBackpack(query, turn, victimItem.row.id)
											}
											else {
												await deleteItem(query, victimItem.row.id)
											}
										}

										await itemSelectMessage.edit({
											content: `${icons.checkmark} Successfully transferred **${itemsPicked.length}** items to your inventory:` +
												`\n\n${itemsPicked.map(i => getItemDisplay(i.item, i.row, { showEquipped: false })).join('\n')}`,
											components: []
										})
									}
									catch (err) {
										await itemSelectMessage.edit({
											content: `${icons.danger} You ran out of time to select which items to keep.`,
											components: [{
												type: ComponentType.ACTION_ROW,
												components: components.map(c => ({ ...c, disabled: true }))
											}]
										})
									}
								}
								else {
									await val.sendFollowUp({
										content: `<@${turn}> chose to attack!`,
										embeds: [attackEmbed.embed]
									})
								}
							}
						}
						else if (val.customID === 'heal') {
							const preHealPlayerData = (await getUserRow(query, turn))!
							const preHealBackpackRows = await getUserBackpack(query, turn)
							const preHealInventory = getItems(preHealBackpackRows)
							const possibleHealItems = preHealInventory.items.filter(i => i.item.type === 'Medical' && i.item.subtype === 'Healing')
							const preHealMaxPossible = preHealPlayerData.maxHealth - preHealPlayerData.health

							if (!possibleHealItems.length) {
								healBtnDisabled = true
								await val.editOriginal({
									components: [{
										type: ComponentType.ACTION_ROW,
										components: [GRAY_BUTTON('Attack', 'attack', false, '🗡️'), GRAY_BUTTON('Use Medical Item', 'heal', healBtnDisabled, '🩹'), GRAY_BUTTON('Use Stimulant', 'stimulant', stimBtnDisabled, '💉'), RED_BUTTON('Try to Flee', 'flee')]
									}]
								})
								await val.sendFollowUp({
									ephemeral: true,
									content: `${icons.danger} You don't have any healing items in your inventory. Please select a different action.`
								})
								continue
							}
							else if (preHealMaxPossible <= 0) {
								healBtnDisabled = true
								await val.editOriginal({
									components: [{
										type: ComponentType.ACTION_ROW,
										components: [GRAY_BUTTON('Attack', 'attack', false, '🗡️'), GRAY_BUTTON('Use Medical Item', 'heal', healBtnDisabled, '🩹'), GRAY_BUTTON('Use Stimulant', 'stimulant', stimBtnDisabled, '💉'), RED_BUTTON('Try to Flee', 'flee')]
									}]
								})
								await val.sendFollowUp({
									ephemeral: true,
									content: `${icons.danger} You are already at max health. Please select a different action.`
								})
								continue
							}

							validActionChoice = true
							await val.editOriginal({
								components: [{
									type: ComponentType.ACTION_ROW,
									components: [GRAY_BUTTON('Attack', 'attack', true, '🗡️'), GREEN_BUTTON('Use Medical Item', 'heal', true, '🩹'), GRAY_BUTTON('Use Stimulant', 'stimulant', true, '💉'), RED_BUTTON('Try to Flee', 'flee', true)]
								}]
							})

							let validHeal = false
							while (!validHeal) {
								const choice = await this.getHealChoice(val, turn)
								const healTransaction = await beginTransaction()
								const playerData = (await getUserRow(healTransaction.query, turn, true))!
								const playerBackpackRows = await getUserBackpack(healTransaction.query, turn, true)
								const playerInventory = getItems(playerBackpackRows)

								const hasItem = playerInventory.items.find(i => i.row.id === choice.row.id)

								if (!hasItem) {
									await healTransaction.commit()
									await val.sendFollowUp({
										ephemeral: true,
										content: `${icons.danger} Could not find ${getItemDisplay(choice.item)} in your inventory. Re-running item selection menu...`
									})
									continue
								}

								const maxHeal = Math.min(playerData.maxHealth - playerData.health, choice.item.healsFor)
								const curedAfflictions = []

								if (!choice.row.durability || choice.row.durability - 1 <= 0) {
									await deleteItem(healTransaction.query, choice.row.id)
								}
								else {
									await lowerItemDurability(healTransaction.query, choice.row.id, 1)
								}

								if (choice.item.curesBitten || choice.item.curesBrokenArm || choice.item.curesBurning) {
									const playerAfflictions = turn === ctx.user.id ? player1Afflictions : player2Afflictions

									for (let i = playerAfflictions.length - 1; i >= 0; i--) {
										const affliction = playerAfflictions[i]

										if (choice.item.curesBitten && affliction.name === 'Bitten') {
											curedAfflictions.push(affliction)
											playerAfflictions.splice(i, 1)
										}
										else if (choice.item.curesBrokenArm && affliction.name === 'Broken Arm') {
											curedAfflictions.push(affliction)
											playerAfflictions.splice(i, 1)
										}
										else if (choice.item.curesBurning && affliction.name === 'Burning') {
											curedAfflictions.push(affliction)
											playerAfflictions.splice(i, 1)
										}
									}
								}

								await addHealth(healTransaction.query, ctx.user.id, maxHeal)
								await healTransaction.commit()
								validHeal = true

								const itemDisplay = getItemDisplay(choice.item, {
									...choice.row,
									durability: choice.row.durability ? choice.row.durability - 1 : undefined
								}, {
									showID: false
								})
								const healEmbed = new Embed()
									.setTitle(`Duel - ${ctx.member.displayName} vs ${member.displayName}`)
									.setDescription(`<@${turn}> uses a ${itemDisplay} to heal for **${maxHeal}** health.` +
										`\n<@${turn}> now has ${formatHealth(playerData.health + maxHeal, playerData.maxHealth)} **${playerData.health + maxHeal} / ${playerData.maxHealth}** health.` +
										`${curedAfflictions.length ? `\n<@${turn}> cured the following afflictions: ${combineArrayWithAnd(curedAfflictions.map(a => a.name))}` : ''}`)
									.setFooter(`Turn #${turnNumber}`)

								await val.sendFollowUp({
									content: `<@${turn}> chose to heal!`,
									embeds: [healEmbed.embed]
								})
							}
						}
						else if (val.customID === 'stimulant') {
							const preHealBackpackRows = await getUserBackpack(query, turn)
							const preHealInventory = getItems(preHealBackpackRows)
							const playerStimulants = turn === ctx.user.id ? player1Stimulants : player2Stimulants
							const playerStimItems = preHealInventory.items.filter(i => i.item.type === 'Medical' && i.item.subtype === 'Stimulant')
							const possibleStimulants = playerStimItems.filter(i => !playerStimulants.some(stim => stim.name === i.item.name))

							if (!playerStimItems.length) {
								stimBtnDisabled = true
								await val.editOriginal({
									components: [{
										type: ComponentType.ACTION_ROW,
										components: [GRAY_BUTTON('Attack', 'attack', false, '🗡️'), GRAY_BUTTON('Use Medical Item', 'heal', healBtnDisabled, '🩹'), GRAY_BUTTON('Use Stimulant', 'stimulant', stimBtnDisabled, '💉'), RED_BUTTON('Try to Flee', 'flee')]
									}]
								})
								await val.sendFollowUp({
									ephemeral: true,
									content: `${icons.danger} You don't have any stimulants in your inventory. Please select a different action.`
								})
								continue
							}
							else if (!possibleStimulants.length) {
								// user has stimulants but they are already active, cannot inject the same stimulant twice
								stimBtnDisabled = true
								await val.editOriginal({
									components: [{
										type: ComponentType.ACTION_ROW,
										components: [GRAY_BUTTON('Attack', 'attack', false, '🗡️'), GRAY_BUTTON('Use Medical Item', 'heal', healBtnDisabled, '🩹'), GRAY_BUTTON('Use Stimulant', 'stimulant', stimBtnDisabled, '💉'), RED_BUTTON('Try to Flee', 'flee')]
									}]
								})
								await val.sendFollowUp({
									ephemeral: true,
									content: `${icons.danger} You don't have any stimulants that you can inject right now. Please select a different action.`
								})
								continue
							}
							else if (playerStimulants.length >= maxStimulantsPerDuel) {
								// user has used max stimulants in this duel already
								stimBtnDisabled = true
								await val.editOriginal({
									components: [{
										type: ComponentType.ACTION_ROW,
										components: [GRAY_BUTTON('Attack', 'attack', false, '🗡️'), GRAY_BUTTON('Use Medical Item', 'heal', healBtnDisabled, '🩹'), GRAY_BUTTON('Use Stimulant', 'stimulant', stimBtnDisabled, '💉'), RED_BUTTON('Try to Flee', 'flee')]
									}]
								})
								await val.sendFollowUp({
									ephemeral: true,
									content: `${icons.danger} You can only inject up to **${maxStimulantsPerDuel}** stimulants per duel. Please select a different action.`
								})
								continue
							}

							validActionChoice = true
							await val.editOriginal({
								components: [{
									type: ComponentType.ACTION_ROW,
									components: [GRAY_BUTTON('Attack', 'attack', true, '🗡️'), GRAY_BUTTON('Use Medical Item', 'heal', true, '🩹'), GREEN_BUTTON('Use Stimulant', 'stimulant', true, '💉'), RED_BUTTON('Try to Flee', 'flee', true)]
								}]
							})

							let validStim = false
							while (!validStim) {
								const choice = await this.getStimChoice(val, turn)
								const stimTransaction = await beginTransaction()
								const playerBackpackRows = await getUserBackpack(stimTransaction.query, turn, true)
								const playerInventory = getItems(playerBackpackRows)

								const hasItem = playerInventory.items.find(i => i.row.id === choice.row.id)

								if (!hasItem) {
									await stimTransaction.commit()
									await val.sendFollowUp({
										ephemeral: true,
										content: `${icons.danger} Could not find ${getItemDisplay(choice.item)} in your inventory. Re-running item selection menu...`
									})
									continue
								}

								if (!choice.row.durability || choice.row.durability - 1 <= 0) {
									await deleteItem(stimTransaction.query, choice.row.id)
								}
								else {
									await lowerItemDurability(stimTransaction.query, choice.row.id, 1)
								}

								// ensure multiple of the same stimulant don't stack
								if (!playerStimulants.includes(choice.item)) {
									playerStimulants.push(choice.item)
								}

								await stimTransaction.commit()
								validStim = true

								const itemDisplay = getItemDisplay(choice.item, {
									...choice.row,
									durability: choice.row.durability ? choice.row.durability - 1 : undefined
								}, {
									showID: false
								})
								const effectsDisplay = getEffectsDisplay(choice.item.effects)

								const healEmbed = new Embed()
									.setTitle(`Duel - ${ctx.member.displayName} vs ${member.displayName}`)
									.setDescription(`<@${turn}> injects themself with ${itemDisplay}.` +
										`\n\n__Effects Received__\n${effectsDisplay.join('\n')}`)
									.setFooter(`Turn #${turnNumber}`)

								await val.sendFollowUp({
									content: `<@${turn}> used a stimulant!`,
									embeds: [healEmbed.embed]
								})
							}
						}
						else if (val.customID === 'flee') {
							const chance = 0.1

							validActionChoice = true
							await val.editOriginal({
								components: [{
									type: ComponentType.ACTION_ROW,
									components: [GRAY_BUTTON('Attack', 'attack', true, '🗡️'), GRAY_BUTTON('Use Medical Item', 'heal', true, '🩹'), GRAY_BUTTON('Use Stimulant', 'stimulant', true, '💉'), GREEN_BUTTON('Try to Flee', 'flee', true)]
								}]
							})

							if (Math.random() <= chance) {
								// success
								duelIsActive = false

								const fleeEmbed = new Embed()
									.setTitle(`Duel - ${ctx.member.displayName} vs ${member.displayName}`)
									.setDescription(`<@${turn}> flees from the duel! The duel has ended.`)
									.setFooter(`Turn #${turnNumber}`)
									.setColor(9043800)

								await val.sendFollowUp({
									content: `<@${turn}> chose to flee!`,
									embeds: [fleeEmbed.embed]
								})
							}
							else {
								const fleeEmbed = new Embed()
									.setTitle(`Duel - ${ctx.member.displayName} vs ${member.displayName}`)
									.setDescription(`${icons.danger} <@${turn}> tries to flee from the duel (10% chance) but fails!`)
									.setFooter(`Turn #${turnNumber}`)
									.setColor(16734296)

								await val.sendFollowUp({
									content: `<@${turn}> chose to flee!`,
									embeds: [fleeEmbed.embed]
								})
							}
						}
					}
				}
				catch (err) {
					// user did not select an action, skip turn
					await botMessage.edit({
						content: `${icons.danger} <@${turn}> ran out of time to complete an action. Their turn has been skipped.`,
						components: [{
							type: ComponentType.ACTION_ROW,
							components: [GRAY_BUTTON('Attack', 'attack', true, '🗡️'), GRAY_BUTTON('Use Medical Item', 'heal', true, '🩹'), GRAY_BUTTON('Use Stimulant', 'stimulant', true, '💉'), RED_BUTTON('Try to Flee', 'flee', true)]
						}]
					})
				}
				finally {
					if (duelIsActive) {
						if (turnNumber >= 20) {
							duelIsActive = false
							await setFighting(query, ctx.user.id, false)
							await setFighting(query, member.id, false)
							await confirmed.sendFollowUp({
								content: `${icons.danger} **The max turn limit (20) has been reached!** The duel ends in a tie, neither players will lose their items.`
							})
						}
						else {
							const player1DataV = (await getUserRow(preTransaction.query, ctx.user.id))!
							const player2DataV = (await getUserRow(preTransaction.query, member.id))!
							const player1InventoryV = await getUserBackpack(preTransaction.query, ctx.user.id)
							const player2InventoryV = await getUserBackpack(preTransaction.query, member.id)

							turnNumber += 1
							turn = turn === ctx.user.id ? member.id : ctx.user.id
							botMessage = await confirmed.sendFollowUp({
								content: `<@${turn}>'s turn:`,
								embeds: [this.getDuelEmbed(
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
								).embed],
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
		player1Stimulants: StimulantMedical[],
		player2Stimulants: StimulantMedical[],
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
				`__**Health**__\n**${player1Data.health} / ${player1Data.maxHealth}** HP\n${formatHealth(player1Data.health, player1Data.maxHealth)}` +
				`\n\n__**Gear**__\n**Backpack**: ${player1Equips.backpack ? getItemDisplay(player1Equips.backpack.item, player1Equips.backpack.row, { showEquipped: false, showID: false }) : 'None'}` +
				`\n**Helmet**: ${player1Equips.helmet ? getItemDisplay(player1Equips.helmet.item, player1Equips.helmet.row, { showEquipped: false, showID: false }) : 'None'}` +
				`\n**Body Armor**: ${player1Equips.armor ? getItemDisplay(player1Equips.armor.item, player1Equips.armor.row, { showEquipped: false, showID: false }) : 'None'}` +
				`\n\n__**Stimulants**__\n${player1Stimulants.length ? player1Stimulants.map(i => getItemDisplay(i)).join('\n') : 'None'}` +
				`\n\n__**Afflictions**__\n${player1Afflictions.length ? combineArrayWithAnd(player1Afflictions.map(a => a.name)) : 'None'}` +
				`${player1EffectsDisplay.length ? `\n\n__**Effects**__\n${player1EffectsDisplay.join('\n')}` : ''}`,
				true)
			.addField(`${player2.user.username}#${player2.user.discriminator} (Level ${player2Data.level})`,
				`__**Health**__\n**${player2Data.health} / ${player2Data.maxHealth}** HP\n${formatHealth(player2Data.health, player2Data.maxHealth)}` +
				`\n\n__**Gear**__\n**Backpack**: ${player2Equips.backpack ? getItemDisplay(player2Equips.backpack.item, player2Equips.backpack.row, { showEquipped: false, showID: false }) : 'None'}` +
				`\n**Helmet**: ${player2Equips.helmet ? getItemDisplay(player2Equips.helmet.item, player2Equips.helmet.row, { showEquipped: false, showID: false }) : 'None'}` +
				`\n**Body Armor**: ${player2Equips.armor ? getItemDisplay(player2Equips.armor.item, player2Equips.armor.row, { showEquipped: false, showID: false }) : 'None'}` +
				`\n\n__**Stimulants**__\n${player2Stimulants.length ? player2Stimulants.map(i => getItemDisplay(i)).join('\n') : 'None'}` +
				`\n\n__**Afflictions**__\n${player2Afflictions.length ? combineArrayWithAnd(player2Afflictions.map(a => a.name)) : 'None'}` +
				`${player2EffectsDisplay.length ? `\n\n__**Effects**__\n${player2EffectsDisplay.join('\n')}` : ''}`,
				true)
			.setFooter(`Turn #${turnNumber} / 20 max`)

		return duelEmb
	}

	async getActionChoice (playerID: string, otherPlayerID: string, messageID: string): Promise<ComponentContext> {
		const { collector, stopCollector } = this.app.componentCollector.createCollector(messageID, c => c.user.id === playerID || c.user.id === otherPlayerID, 30000)

		return new Promise((resolve, reject) => {
			collector.on('collect', async c => {
				try {
					if (c.user.id === otherPlayerID) {
						await c.send({
							content: `${icons.warning} It's not your turn! Wait for <@${playerID}> to make their choice.`,
							ephemeral: true
						})
						return
					}

					stopCollector()
					resolve(c)
				}
				catch (err) {
					// continue
				}
			})

			collector.on('end', msg => {
				if (msg === 'time') {
					reject(msg)
				}
			})
		})
	}

	async getAttackChoice (ctx: ComponentContext, playerID: string): Promise<{
		weapon: ItemWithRowOfType<Weapon> | { item: Weapon, row: undefined }
		ammo: ItemWithRowOfType<Ammunition> | undefined
		limbTarget: BodyPart | undefined
	}> {
		const playerItemRows = await getUserBackpack(query, playerID)
		const playerInventory = getItems(playerItemRows)
		let components: ComponentSelectMenu[] = [
			{
				type: ComponentType.SELECT,
				custom_id: 'weapon',
				placeholder: 'Select a weapon from your inventory to use.',
				options: [
					...(sortItemsByLevel(playerInventory.items, true).filter(i => ['Melee Weapon', 'Ranged Weapon', 'Throwable Weapon'].includes(i.item.type))).slice(0, 24).map(i => {
						const iconID = i.item.icon.match(/:([0-9]*)>/)
						const weaponDesc = i.item.type === 'Throwable Weapon' && i.item.spreadsDamageToLimbs ?
							`${i.item.damage} (${Math.round(i.item.damage / i.item.spreadsDamageToLimbs)} x ${i.item.spreadsDamageToLimbs} limbs) damage. ${i.item.penetration.toFixed(1)} armor penetration.` :
							i.item.type === 'Melee Weapon' || i.item.type === 'Throwable Weapon' ?
								`${i.item.damage} damage. ${i.item.penetration.toFixed(1)} armor penetration.` :
								'Damage determined by ammunition.'


						return {
							label: `${i.item.name.replace(/_/g, ' ')} (ID: ${i.row.id})`,
							value: i.row.id.toString(),
							description: `${i.row.durability ? `${i.row.durability} uses left. ` : ''}${weaponDesc}`,
							emoji: iconID ? {
								id: iconID[1],
								name: i.item.name
							} : undefined
						}
					}),
					{
						label: 'Fists',
						value: 'fists',
						description: '10 damage. 0.0 armor penetration.',
						emoji: {
							name: '👊'
						}
					}
				]
			}
		]
		const botMessage = await ctx.sendFollowUp({
			ephemeral: true,
			content: 'What weapon do you want to attack with? *You have 60 seconds to choose.*',
			components: [{
				type: ComponentType.ACTION_ROW,
				components
			}]
		})
		let choiceTimeout
		const choiceTimer = new Promise((resolve, reject) => {
			choiceTimeout = setTimeout(async () => {
				try {
					await botMessage.edit({
						content: `${icons.timer} You ran out of time to complete this attack. Your turn has been skipped.`,
						components: [{
							type: ComponentType.ACTION_ROW,
							components: components.map(c => ({ ...c, disabled: true }))
						}]
					})
				}
				catch (err) {
					logger.error(err)
				}

				reject(new Error('Ran out of time to make selection'))
			}, 60000)
		})
		let weapon: ItemWithRowOfType<Weapon> | { item: Weapon, row?: undefined } | undefined
		let ammo: ItemWithRowOfType<Ammunition> | undefined
		let limbTarget: BodyPart | undefined

		const getChoices = async () => {
			while (!weapon) {
				const weaponChoice = (await this.app.componentCollector.awaitClicks(botMessage.id, i => i.user.id === playerID, 61000))[0]
				const weaponItemRow = playerInventory.items.find(i => i.row.id.toString() === weaponChoice.values[0])
				const weaponItem = weaponItemRow?.item

				await weaponChoice.acknowledge()

				if (weaponChoice.values[0] === 'fists') {
					weapon = {
						item: {
							type: 'Melee Weapon',
							name: 'fists',
							aliases: [],
							icon: '👊',
							slotsUsed: 0,
							itemLevel: 1,
							damage: 10,
							accuracy: 50,
							durability: 1,
							penetration: 0
						}
					}
					break
				}
				else if (!weaponItemRow || !weaponItem) {
					await botMessage.edit({
						content: `${icons.danger} Weapon not found in your inventory. Please select another weapon:`
					})
					continue
				}
				else if (weaponItem.type === 'Ranged Weapon') {
					const userPossibleAmmo = playerInventory.items.filter((row, i) =>
						row.item.type === 'Ammunition' &&
						row.item.ammoFor.includes(weaponItem) &&
						playerInventory.items.map(r => r.item.name).indexOf(row.item.name) === i
					)

					if (!userPossibleAmmo.length) {
						await botMessage.edit({
							content: `${icons.danger} You don't have any ammo for your ${getItemDisplay(weaponItemRow.item, weaponItemRow.row, { showEquipped: false, showDurability: false })}.` +
								` You need one of the following ammunitions in your inventory:\n\n${allItems.filter(i => i.type === 'Ammunition' && i.ammoFor.includes(weaponItem)).map(i => getItemDisplay(i)).join(', ')}.` +
								'\n\nPlease select another weapon:'
						})
						continue
					}
					else {
						// user must select ammo
						const ammoSortedByBest = sortItemsByAmmo(userPossibleAmmo, true)

						components = [{
							type: ComponentType.SELECT,
							custom_id: 'weapon',
							placeholder: 'Select an ammunition from your inventory to use.',
							options: ammoSortedByBest.map(i => {
								const ammoItem = i.item as Ammunition
								const iconID = i.item.icon.match(/:([0-9]*)>/)
								const ammoDesc = ammoItem.spreadsDamageToLimbs ?
									`${ammoItem.damage} (${Math.round(ammoItem.damage / ammoItem.spreadsDamageToLimbs)} x ${ammoItem.spreadsDamageToLimbs} limbs) damage. ${ammoItem.penetration.toFixed(1)} armor penetration.` :
									`${ammoItem.damage} damage. ${ammoItem.penetration.toFixed(1)} armor penetration.`

								return {
									label: i.item.name.replace(/_/g, ' '),
									value: i.row.id.toString(),
									description: ammoDesc,
									emoji: iconID ? {
										id: iconID[1],
										name: i.item.name
									} : undefined
								}
							})
						}]
						await botMessage.edit({
							content: `${icons.warning} Which ammo do you want to use with your ${getItemDisplay(weaponItemRow.item)}?`,
							components: [{
								type: ComponentType.ACTION_ROW,
								components
							}]
						})

						while (!ammo) {
							const ammoChoice = (await this.app.componentCollector.awaitClicks(botMessage.id, i => i.user.id === playerID, 61000))[0]
							const ammoItemRow = playerInventory.items.find(i => i.row.id.toString() === ammoChoice.values[0])

							await ammoChoice.acknowledge()

							if (!ammoItemRow) {
								await botMessage.edit({
									content: `${icons.danger} Ammo not found in your inventory. Please select a different ammunition:`
								})
								continue
							}

							ammo = ammoItemRow as ItemWithRowOfType<Ammunition>
						}
					}
				}

				weapon = weaponItemRow as ItemWithRowOfType<Weapon>
			}

			components = [
				{
					type: ComponentType.SELECT,
					custom_id: 'limb',
					placeholder: 'Select a limb to target.',
					options: [
						{
							label: 'Head',
							value: 'head',
							description: 'Deals more damage. Higher chance of missing.',
							emoji: {
								name: getBodyPartEmoji('head')
							}
						},
						{
							label: 'Chest',
							value: 'chest',
							description: 'Deals base damage. Armor can reduce damage.',
							emoji: {
								name: getBodyPartEmoji('chest')
							}
						},
						{
							label: 'Arms',
							value: 'arm',
							description: 'Deals less damage. Armor does not protect arms.',
							emoji: {
								name: getBodyPartEmoji('arm')
							}
						},
						{
							label: 'Legs',
							value: 'leg',
							description: 'Deals less damage. Armor does not protect legs.',
							emoji: {
								name: getBodyPartEmoji('leg')
							}
						},
						{
							label: 'Don\'t target any limbs.',
							value: 'none',
							description: 'You\'re targeted limb is random but you will never miss.',
							emoji: {
								name: '🚫'
							}
						}
					]
				}
			]
			await botMessage.edit({
				content: `${getItemDisplay(weapon.item)} selected as your weapon! What limb do you want to target?`,
				components: [{
					type: ComponentType.ACTION_ROW,
					components
				}]
			})

			while (!limbTarget) {
				const limbChoice = (await this.app.componentCollector.awaitClicks(botMessage.id, i => i.user.id === playerID, 61000))[0]
				await limbChoice.acknowledge()

				if (limbChoice.values[0] === 'none') {
					break
				}

				limbTarget = limbChoice.values[0] as BodyPart
			}

			await botMessage.edit({
				content: `${icons.checkmark} ${getItemDisplay(weapon.item)} ${ammo ? `(ammo: ${getItemDisplay(ammo.item)})` : ''} selected as your weapon!`,
				components: [{
					type: ComponentType.ACTION_ROW,
					components: components.map(c => ({ ...c, disabled: true }))
				}]
			})
		}

		await Promise.race([choiceTimer, getChoices()])

		if (choiceTimeout) {
			clearTimeout(choiceTimeout)
		}

		if (!weapon) {
			throw new Error('No weapon selected.')
		}

		return {
			weapon,
			ammo,
			limbTarget
		}
	}

	async getStimChoice (ctx: ComponentContext, playerID: string): Promise<ItemWithRowOfType<StimulantMedical>> {
		const playerItemRows = await getUserBackpack(query, playerID)
		const playerInventory = getItems(playerItemRows)
		const components: ComponentSelectMenu[] = [
			{
				type: ComponentType.SELECT,
				custom_id: 'item',
				placeholder: 'Select a stimulant from your inventory to use.',
				options: [
					...(sortItemsByLevel(playerInventory.items, true).filter(i => i.item.type === 'Medical' && i.item.subtype === 'Stimulant')).slice(0, 25).map(i => {
						const item = i.item as StimulantMedical
						const iconID = i.item.icon.match(/:([0-9]*)>/)
						const effectsDisplay = []

						if (item.effects.accuracyBonus) {
							effectsDisplay.push(`Accuracy ${item.effects.accuracyBonus > 0 ? '+' : '-'}${Math.abs(item.effects.accuracyBonus)}%.`)
						}
						if (item.effects.damageBonus) {
							effectsDisplay.push(`Damage dealt ${item.effects.damageBonus > 0 ? '+' : '-'}${Math.abs(item.effects.damageBonus)}%.`)
						}
						if (item.effects.damageReduction) {
							effectsDisplay.push(`Damage taken ${item.effects.damageReduction > 0 ? '-' : '+'}${Math.abs(item.effects.damageReduction)}%.`)
						}

						return {
							label: `${i.item.name.replace(/_/g, ' ')} (ID: ${i.row.id})`,
							value: i.row.id.toString(),
							description: `${i.row.durability ? `${i.row.durability} uses left. ` : ''}${effectsDisplay.join(' ') || 'No viable effects for duels.'}`,
							emoji: iconID ? {
								id: iconID[1],
								name: i.item.name
							} : undefined
						}
					})
				]
			}
		]
		const botMessage = await ctx.sendFollowUp({
			ephemeral: true,
			content: 'What stimulant do you want to use? *You have 60 seconds to choose.*',
			components: [{
				type: ComponentType.ACTION_ROW,
				components
			}]
		})
		let healItem: ItemWithRowOfType<StimulantMedical> | undefined
		let choiceTimeout
		const choiceTimer = new Promise((resolve, reject) => {
			choiceTimeout = setTimeout(async () => {
				try {
					await botMessage.edit({
						content: `${icons.timer} You ran out of time to select an item. Your turn has been skipped.`,
						components: [{
							type: ComponentType.ACTION_ROW,
							components: components.map(c => ({ ...c, disabled: true }))
						}]
					})
				}
				catch (err) {
					logger.error(err)
				}

				reject(new Error('Ran out of time to make selection'))
			}, 60000)
		})

		const getChoices = async () => {
			while (!healItem) {
				const healChoice = (await this.app.componentCollector.awaitClicks(botMessage.id, i => i.user.id === playerID, 60000))[0]
				const healItemRow = playerInventory.items.find(i => i.row.id.toString() === healChoice.values[0])

				await healChoice.acknowledge()

				if (!healItemRow) {
					await botMessage.edit({
						content: `${icons.danger} Stimulant not found in your inventory. Please select another item:`
					})
					continue
				}

				healItem = healItemRow as ItemWithRowOfType<StimulantMedical>
			}
		}

		await Promise.race([choiceTimer, getChoices()])

		if (choiceTimeout) {
			clearTimeout(choiceTimeout)
		}

		if (!healItem) {
			throw new Error('No item selected.')
		}

		return healItem
	}

	async getHealChoice (ctx: ComponentContext, playerID: string): Promise<ItemWithRowOfType<HealingMedical>> {
		const playerItemRows = await getUserBackpack(query, playerID)
		const playerInventory = getItems(playerItemRows)
		const components: ComponentSelectMenu[] = [
			{
				type: ComponentType.SELECT,
				custom_id: 'item',
				placeholder: 'Select a medical item from your inventory to use.',
				options: [
					...(sortItemsByLevel(playerInventory.items, true).filter(i => i.item.type === 'Medical' && i.item.subtype === 'Healing')).slice(0, 25).map(i => {
						const iconID = i.item.icon.match(/:([0-9]*)>/)
						const itemDesc = i.item.type === 'Medical' && i.item.subtype === 'Healing' ?
							`Heals for ${i.item.healsFor} HP.` :
							''


						return {
							label: `${i.item.name.replace(/_/g, ' ')} (ID: ${i.row.id})`,
							value: i.row.id.toString(),
							description: `${i.row.durability ? `${i.row.durability} uses left. ` : ''}${itemDesc}`,
							emoji: iconID ? {
								id: iconID[1],
								name: i.item.name
							} : undefined
						}
					})
				]
			}
		]
		const botMessage = await ctx.sendFollowUp({
			ephemeral: true,
			content: 'What item do you want to heal with? *You have 60 seconds to choose.*',
			components: [{
				type: ComponentType.ACTION_ROW,
				components
			}]
		})
		let healItem: ItemWithRowOfType<HealingMedical> | undefined
		let choiceTimeout
		const choiceTimer = new Promise((resolve, reject) => {
			choiceTimeout = setTimeout(async () => {
				try {
					await botMessage.edit({
						content: `${icons.timer} You ran out of time to select an item. Your turn has been skipped.`,
						components: [{
							type: ComponentType.ACTION_ROW,
							components: components.map(c => ({ ...c, disabled: true }))
						}]
					})
				}
				catch (err) {
					logger.error(err)
				}

				reject(new Error('Ran out of time to make selection'))
			}, 60000)
		})

		const getChoices = async () => {
			while (!healItem) {
				const healChoice = (await this.app.componentCollector.awaitClicks(botMessage.id, i => i.user.id === playerID, 60000))[0]
				const healItemRow = playerInventory.items.find(i => i.row.id.toString() === healChoice.values[0])

				await healChoice.acknowledge()

				if (!healItemRow) {
					await botMessage.edit({
						content: `${icons.danger} Item not found in your inventory. Please select another item:`
					})
					continue
				}

				healItem = healItemRow as ItemWithRowOfType<HealingMedical>
			}
		}

		await Promise.race([choiceTimer, getChoices()])

		if (choiceTimeout) {
			clearTimeout(choiceTimeout)
		}

		if (!healItem) {
			throw new Error('No item selected.')
		}

		return healItem
	}

	getAttackString (weapon: MeleeWeapon | ThrowableWeapon, attackerName: string, victimName: string, limbsHit: { damage: { total: number, reduced: number }, limb: BodyPart }[], totalDamage: number): string
	getAttackString (weapon: RangedWeapon, attackerName: string, victimName: string, limbsHit: { damage: { total: number, reduced: number }, limb: BodyPart }[], totalDamage: number, ammo: Ammunition): string
	getAttackString (weapon: Weapon, attackerName: string, victimName: string, limbsHit: { damage: { total: number, reduced: number }, limb: BodyPart }[], totalDamage: number, ammo?: Ammunition): string {
		if (weapon.type === 'Ranged Weapon') {
			if (limbsHit.length > 1) {
				const limbsHitStrings = []

				for (const limbHit of limbsHit) {
					limbsHitStrings.push(limbHit.limb === 'head' ? `${getBodyPartEmoji(limbHit.limb)} ***HEAD*** for **${limbHit.damage.total}** damage` : `${getBodyPartEmoji(limbHit.limb)} **${limbHit.limb}** for **${limbHit.damage.total}** damage`)
				}

				return `${attackerName} shot ${victimName} in the ${combineArrayWithAnd(limbsHitStrings)} with their ${getItemDisplay(weapon)} (ammo: ${getItemDisplay(ammo!)}). **${totalDamage}** total damage dealt.\n`
			}

			return `${attackerName} shot ${victimName} in the ${getBodyPartEmoji(limbsHit[0].limb)} **${limbsHit[0].limb === 'head' ? '*HEAD*' : limbsHit[0].limb}** with their ${getItemDisplay(weapon)} (ammo: ${getItemDisplay(ammo!)}). **${totalDamage}** damage dealt.\n`
		}
		else if (weapon.type === 'Throwable Weapon' && weapon.subtype === 'Fragmentation Grenade') {
			if (limbsHit.length > 1) {
				const limbsHitStrings = []

				for (const limbHit of limbsHit) {
					limbsHitStrings.push(limbHit.limb === 'head' ? `${getBodyPartEmoji(limbHit.limb)} ***HEAD*** for **${limbHit.damage.total}** damage` : `${getBodyPartEmoji(limbHit.limb)} **${limbHit.limb}** for **${limbHit.damage.total}** damage`)
				}

				return `${attackerName} throws a ${getItemDisplay(weapon)} that explodes and hits ${victimName} in the ${combineArrayWithAnd(limbsHitStrings)}. **${totalDamage}** total damage dealt.\n`
			}

			return `${attackerName} throws a ${getItemDisplay(weapon)} that explodes and hits ${victimName} in the ${getBodyPartEmoji(limbsHit[0].limb)} **${limbsHit[0].limb === 'head' ? '*HEAD*' : limbsHit[0].limb}**. **${totalDamage}** damage dealt.\n`
		}
		else if (weapon.type === 'Throwable Weapon' && weapon.subtype === 'Incendiary Grenade') {
			if (limbsHit.length > 1) {
				const limbsHitStrings = []

				for (const limbHit of limbsHit) {
					limbsHitStrings.push(limbHit.limb === 'head' ? `${getBodyPartEmoji(limbHit.limb)} ***HEAD*** for **${limbHit.damage.total}** damage` : `${getBodyPartEmoji(limbHit.limb)} **${limbHit.limb}** for **${limbHit.damage.total}** damage`)
				}

				return `${attackerName} throws a ${getItemDisplay(weapon)} that bursts into flames and hits ${victimName} in the ${combineArrayWithAnd(limbsHitStrings)}. **${totalDamage}** total damage dealt.\n`
			}

			return `${attackerName} throws a ${getItemDisplay(weapon)} that bursts into flames and hits ${victimName} in the ${getBodyPartEmoji(limbsHit[0].limb)} **${limbsHit[0].limb === 'head' ? '*HEAD*' : limbsHit[0].limb}**. **${totalDamage}** damage dealt.\n`
		}

		// melee weapon
		if (limbsHit.length > 1) {
			const limbsHitStrings = []

			for (const limbHit of limbsHit) {
				limbsHitStrings.push(limbHit.limb === 'head' ? `${getBodyPartEmoji(limbHit.limb)} ***HEAD*** for **${limbHit.damage.total}** damage` : `${getBodyPartEmoji(limbHit.limb)} **${limbHit.limb}** for **${limbHit.damage.total}** damage`)
			}

			return `${attackerName} hit ${victimName} in the ${combineArrayWithAnd(limbsHitStrings)} with their ${getItemDisplay(weapon)}. **${totalDamage}** damage dealt.\n`
		}

		return `${attackerName} hit ${victimName} in the ${getBodyPartEmoji(limbsHit[0].limb)} **${limbsHit[0].limb === 'head' ? '*HEAD*' : limbsHit[0].limb}** with their ${getItemDisplay(weapon)}. **${totalDamage}** damage dealt.\n`
	}

	async getItemChoices (botMessage: Message, victimItems: ItemWithRow<BackpackItemRow>[]): Promise<ItemWithRow<BackpackItemRow>[]> {
		const itemChoices = (await this.app.componentCollector.awaitClicks(botMessage.id, i => true, 60000))[0]
		const itemsPicked = victimItems.filter(i => itemChoices.values.includes(i.row.id.toString()))

		try {
			await itemChoices.acknowledge()
		}
		catch (err) {
			logger.warn(err)
		}

		return itemsPicked
	}
}

export default DuelCommand
