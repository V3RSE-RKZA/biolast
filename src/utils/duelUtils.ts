import { ComponentContext, ComponentSelectMenu, ComponentType, Message } from 'slash-create'
import { ResolvedMember } from 'slash-create/lib/structures/resolvedMember'
import { accuracyToTargetLimbs, icons } from '../config'
import { Affliction } from '../resources/afflictions'
import { allItems } from '../resources/items'
import { Ammunition, Armor, Medical, Helmet, MeleeWeapon, RangedWeapon, Stimulant, ThrowableWeapon, Weapon } from '../types/Items'
import { BackpackItemRow, ItemRow, ItemWithRow } from '../types/mysql'
import ComponentCollector, { CollectorObject } from './ComponentCollector'
import { GRAY_BUTTON, RED_BUTTON } from './constants'
import { getUserBackpack } from './db/items'
import { query } from './db/mysql'
import { getUserRow } from './db/players'
import { getItemDisplay, getItemNameDisplay, getItems, sortItemsByAmmo, sortItemsByLevel } from './itemUtils'
import { logger } from './logger'
import { disableAllComponents } from './messageUtils'
import { addStatusEffects, getEffectsDescription } from './playerUtils'
import { combineArrayWithAnd, getBodyPartEmoji } from './stringUtils'

interface AttackChoice {
	choice: 'attack'
	weapon: ItemWithRow<BackpackItemRow, Weapon> | { item: Weapon, row: undefined }
	ammo?: ItemWithRow<BackpackItemRow, Ammunition>
	limbTarget?: BodyPart
	attackCtx?: ComponentContext
}
interface HealChoice {
	choice: 'use a medical item'
	itemRow: ItemWithRow<BackpackItemRow, Medical>
}
interface StimulantChoice {
	choice: 'use a stimulant'
	itemRow: ItemWithRow<BackpackItemRow, Stimulant>
}
interface FleeChoice {
	choice: 'try to flee'
}

export type PlayerChoice = (AttackChoice | HealChoice | StimulantChoice | FleeChoice) & { speed: number }

export type BodyPart = 'arm' | 'leg' | 'chest' | 'head'

export function isAttackChoice (choice: PlayerChoice): choice is AttackChoice & { speed: number } {
	return choice.choice === 'attack'
}
export function isHealChoice (choice: PlayerChoice): choice is HealChoice & { speed: number } {
	return choice.choice === 'use a medical item'
}
export function isStimulantChoice (choice: PlayerChoice): choice is StimulantChoice & { speed: number } {
	return choice.choice === 'use a stimulant'
}
export function isFleeChoice (choice: PlayerChoice): choice is FleeChoice & { speed: number } {
	return choice.choice === 'try to flee'
}

const maxStimulantsPerDuel = 1

/**
 * Gets a random body part:
 *
 * head - 10%
 *
 * arms/legs - 15%
 *
 * chest - 60%
 *
 * @param weaponAccuracy The weapons accuracy
 * @param choice The body part user is trying to target
 * @returns a random body part and whether or not the weapons accuracy influenced the result
 */
export function getBodyPartHit (weaponAccuracy: number, choice?: BodyPart): { result: BodyPart, accurate: boolean } {
	const random = Math.random()

	// if head was targeted, the chance of successful hit is divided by half
	if (choice === 'head' && random <= (weaponAccuracy / 100) / 2) {
		return {
			result: 'head',
			accurate: true
		}
	}
	else if (choice && random <= (weaponAccuracy / 100)) {
		return {
			result: choice,
			accurate: true
		}
	}

	if (random <= 0.1) {
		return {
			result: 'head',
			accurate: false
		}
	}
	else if (random <= 0.25) {
		return {
			result: 'arm',
			accurate: false
		}
	}
	else if (random <= 0.4) {
		return {
			result: 'leg',
			accurate: false
		}
	}

	return {
		result: 'chest',
		accurate: false
	}
}

/**
 *
 * @param damage Raw damage to deal
 * @param penetration Weapon/ammo penetration
 * @param bodyPartHit The body part hit
 * @param victimArmor The armor victim is wearing
 * @param victimHelmet The helmet victim is wearing
 * @returns The damage after taking account the victims armor
 */
export function getAttackDamage (damage: number, penetration: number, bodyPartHit: BodyPart, victimArmor?: Armor, victimHelmet?: Helmet): { total: number, reduced: number } {
	if (damage < 1 || !Number.isInteger(damage)) {
		damage = Math.max(1, Math.round(damage))
	}

	if (bodyPartHit === 'chest') {
		// user penetrated armor, deal full damage
		if (!victimArmor || penetration >= victimArmor.level) {
			return {
				total: damage,
				reduced: 0
			}
		}

		// minimum 1 damage
		// armor level has the armor penetration difference added to it so theres a drastic damage adjustment the higher armor level victim is wearing
		const reductionMultiplier = Math.max(1, victimArmor.level - penetration)
		const adjusted = Math.max(1, Math.round((penetration / (victimArmor.level + ((victimArmor.level - penetration) ** reductionMultiplier))) * damage))

		return {
			total: adjusted,
			reduced: damage - adjusted
		}
	}
	else if (bodyPartHit === 'head') {
		// head shots deal 1.5x damage
		damage = Math.round(damage * 1.5)

		if (!victimHelmet || penetration >= victimHelmet.level) {
			return {
				total: damage,
				reduced: 0
			}
		}

		const reductionMultiplier = Math.max(1, victimHelmet.level - penetration)
		const adjusted = Math.max(1, Math.round((penetration / (victimHelmet.level + ((victimHelmet.level - penetration) ** reductionMultiplier))) * damage))

		return {
			total: adjusted,
			reduced: damage - adjusted
		}
	}

	// arm or leg hits deal 0.5x damage
	const adjusted = Math.max(1, Math.round(damage * 0.5))
	return {
		total: adjusted,
		reduced: damage - adjusted
	}
}

export function getAttackString (weapon: ItemWithRow<ItemRow | undefined, MeleeWeapon | ThrowableWeapon>, attackerName: string, victimName: string, limbsHit: { damage: { total: number, reduced: number }, limb: BodyPart }[], totalDamage: number): string
export function getAttackString (weapon: ItemWithRow<ItemRow | undefined, RangedWeapon>, attackerName: string, victimName: string, limbsHit: { damage: { total: number, reduced: number }, limb: BodyPart }[], totalDamage: number, ammo: Ammunition): string
export function getAttackString (weapon: ItemWithRow<ItemRow | undefined, Weapon>, attackerName: string, victimName: string, limbsHit: { damage: { total: number, reduced: number }, limb: BodyPart }[], totalDamage: number, ammo?: Ammunition): string {
	if (weapon.item.type === 'Ranged Weapon') {
		if (limbsHit.length > 1) {
			const limbsHitStrings = []

			for (const limbHit of limbsHit) {
				limbsHitStrings.push(limbHit.limb === 'head' ? `${getBodyPartEmoji(limbHit.limb)} ***HEAD*** for **${limbHit.damage.total}** damage` : `${getBodyPartEmoji(limbHit.limb)} **${limbHit.limb}** for **${limbHit.damage.total}** damage`)
			}

			return `${attackerName} shot ${victimName} in the ${combineArrayWithAnd(limbsHitStrings)} with their ${getItemDisplay(weapon.item, weapon.row, { showDurability: false })} (ammo: ${getItemDisplay(ammo!)}). **${totalDamage}** total damage dealt.\n`
		}

		return `${attackerName} shot ${victimName} in the ${getBodyPartEmoji(limbsHit[0].limb)} **${limbsHit[0].limb === 'head' ? '*HEAD*' : limbsHit[0].limb}** with their ${getItemDisplay(weapon.item, weapon.row, { showDurability: false })} (ammo: ${getItemDisplay(ammo!)}). **${totalDamage}** damage dealt.\n`
	}
	else if (weapon.item.type === 'Throwable Weapon' && weapon.item.subtype === 'Fragmentation Grenade') {
		if (limbsHit.length > 1) {
			const limbsHitStrings = []

			for (const limbHit of limbsHit) {
				limbsHitStrings.push(limbHit.limb === 'head' ? `${getBodyPartEmoji(limbHit.limb)} ***HEAD*** for **${limbHit.damage.total}** damage` : `${getBodyPartEmoji(limbHit.limb)} **${limbHit.limb}** for **${limbHit.damage.total}** damage`)
			}

			return `${attackerName} throws a ${getItemDisplay(weapon.item, weapon.row)} that explodes and hits ${victimName} in the ${combineArrayWithAnd(limbsHitStrings)}. **${totalDamage}** total damage dealt.\n`
		}

		return `${attackerName} throws a ${getItemDisplay(weapon.item, weapon.row)} that explodes and hits ${victimName} in the ${getBodyPartEmoji(limbsHit[0].limb)} **${limbsHit[0].limb === 'head' ? '*HEAD*' : limbsHit[0].limb}**. **${totalDamage}** damage dealt.\n`
	}
	else if (weapon.item.type === 'Throwable Weapon' && weapon.item.subtype === 'Incendiary Grenade') {
		if (limbsHit.length > 1) {
			const limbsHitStrings = []

			for (const limbHit of limbsHit) {
				limbsHitStrings.push(limbHit.limb === 'head' ? `${getBodyPartEmoji(limbHit.limb)} ***HEAD*** for **${limbHit.damage.total}** damage` : `${getBodyPartEmoji(limbHit.limb)} **${limbHit.limb}** for **${limbHit.damage.total}** damage`)
			}

			return `${attackerName} throws a ${getItemDisplay(weapon.item, weapon.row)} that bursts into flames and hits ${victimName} in the ${combineArrayWithAnd(limbsHitStrings)}. **${totalDamage}** total damage dealt.\n`
		}

		return `${attackerName} throws a ${getItemDisplay(weapon.item, weapon.row)} that bursts into flames and hits ${victimName} in the ${getBodyPartEmoji(limbsHit[0].limb)} **${limbsHit[0].limb === 'head' ? '*HEAD*' : limbsHit[0].limb}**. **${totalDamage}** damage dealt.\n`
	}

	// melee weapon
	if (limbsHit.length > 1) {
		const limbsHitStrings = []

		for (const limbHit of limbsHit) {
			limbsHitStrings.push(limbHit.limb === 'head' ? `${getBodyPartEmoji(limbHit.limb)} ***HEAD*** for **${limbHit.damage.total}** damage` : `${getBodyPartEmoji(limbHit.limb)} **${limbHit.limb}** for **${limbHit.damage.total}** damage`)
		}

		return `${attackerName} hit ${victimName} in the ${combineArrayWithAnd(limbsHitStrings)} with their ${getItemDisplay(weapon.item, weapon.row)}. **${totalDamage}** damage dealt.\n`
	}

	return `${attackerName} hit ${victimName} in the ${getBodyPartEmoji(limbsHit[0].limb)} **${limbsHit[0].limb === 'head' ? '*HEAD*' : limbsHit[0].limb}** with their ${getItemDisplay(weapon.item, weapon.row)}. **${totalDamage}** damage dealt.\n`
}

export function awaitPlayerChoices (
	componentCollector: ComponentCollector,
	botMessage: Message,
	players: { member: ResolvedMember, stims: Stimulant[], afflictions: Affliction[] }[],
	turnNumber: number
): Promise<Map<string, PlayerChoice>> {
	return new Promise((resolve, reject) => {
		const turnCollector = componentCollector.createCollector(botMessage.id, i => players.some(p => p.member.id === i.user.id), 40000)
		const actionCollectors: CollectorObject[] = []
		const choices = new Map<string, PlayerChoice>()

		turnCollector.collector.on('collect', async actionCtx => {
			try {
				const playerChoice = choices.get(actionCtx.user.id)
				const otherPlayerIDs = players.filter(p => p.member.id !== actionCtx.user.id).map(p => p.member.id)

				if (playerChoice) {
					await actionCtx.send({
						ephemeral: true,
						content: `${icons.danger} You have already selected \`${playerChoice.choice}\` this turn. Currently waiting for ${combineArrayWithAnd(otherPlayerIDs.map(p => `<@${p}>`))} to select an action.`
					})
				}
				else if (actionCtx.customID === 'attack') {
					await actionCtx.acknowledge()

					const preSelectPlayerBackpackRows = await getUserBackpack(query, actionCtx.user.id)
					const preSelectPlayerInventory = getItems(preSelectPlayerBackpackRows)
					let components: ComponentSelectMenu[] = [
						{
							type: ComponentType.SELECT,
							custom_id: 'weapon',
							placeholder: 'Select a weapon from your inventory to use:',
							options: [
								...(sortItemsByLevel(preSelectPlayerInventory.items, true).filter(i => ['Melee Weapon', 'Ranged Weapon', 'Throwable Weapon'].includes(i.item.type))).slice(0, 24).map(i => {
									const iconID = i.item.icon.match(/:([0-9]*)>/)
									const weaponDesc = i.item.type === 'Throwable Weapon' && i.item.spreadsDamageToLimbs ?
										`${i.item.damage} (${Math.round(i.item.damage / i.item.spreadsDamageToLimbs)} x ${i.item.spreadsDamageToLimbs} limbs) damage. ${i.item.penetration.toFixed(1)} armor penetration.` :
										i.item.type === 'Melee Weapon' || i.item.type === 'Throwable Weapon' ?
											`${i.item.damage} damage. ${i.item.penetration.toFixed(1)} armor penetration.` :
											'Damage determined by ammunition.'


									return {
										label: `[${i.row.id}] ${getItemNameDisplay(i.item, i.row)}`,
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

					const attackMessage = await actionCtx.send({
						ephemeral: true,
						content: 'What weapon do you want to attack with?',
						components: [{
							type: ComponentType.ACTION_ROW,
							components
						}]
					}) as Message
					const attackCollector = componentCollector.createCollector(attackMessage.id, i => i.user.id === actionCtx.user.id, 60000)
					let weapon: ItemWithRow<BackpackItemRow, Weapon> | { item: Weapon, row?: undefined }
					let ammo: ItemWithRow<BackpackItemRow, Ammunition> | undefined
					let limbTarget: BodyPart | undefined

					actionCollectors.push(attackCollector)

					attackCollector.collector.on('collect', async attackCtx => {
						try {
							await attackCtx.acknowledge()

							if (choices.get(attackCtx.user.id)) {
								attackCollector.stopCollector('selected')

								await attackCtx.editOriginal({
									content: `${icons.timer} You have already chosen an action.`,
									components: [{
										type: ComponentType.ACTION_ROW,
										components: disableAllComponents(components)
									}]
								})
								return
							}
							else if (attackCtx.customID === 'weapon') {
								const weaponItemRow = preSelectPlayerInventory.items.find(i => i.row.id.toString() === attackCtx.values[0])
								const weaponItem = weaponItemRow?.item

								if (attackCtx.values[0] === 'fists') {
									weapon = {
										item: {
											type: 'Melee Weapon',
											name: 'fists',
											aliases: [],
											icon: '👊',
											slotsUsed: 0,
											itemLevel: 1,
											damage: 10,
											accuracy: 10,
											durability: 1,
											penetration: 0,
											speed: 0
										}
									}
								}
								else if (!weaponItemRow || !weaponItem) {
									await attackCtx.editOriginal({
										content: `${icons.danger} Weapon not found in your inventory. Please select another weapon:`
									})
									return
								}
								else {
									if (weaponItem.type === 'Ranged Weapon') {
										const userPossibleAmmo = preSelectPlayerInventory.items.filter((row, i) =>
											row.item.type === 'Ammunition' &&
											row.item.ammoFor.includes(weaponItem) &&
											preSelectPlayerInventory.items.map(r => r.item.name).indexOf(row.item.name) === i
										)

										if (!userPossibleAmmo.length) {
											await attackCtx.editOriginal({
												content: `${icons.danger} You don't have any ammo for your ${getItemDisplay(weaponItemRow.item, weaponItemRow.row, { showEquipped: false, showDurability: false })}.` +
													` You need one of the following ammunitions in your inventory:\n\n${allItems.filter(i => i.type === 'Ammunition' && i.ammoFor.includes(weaponItem)).map(i => getItemDisplay(i)).join(', ')}.` +
													'\n\nPlease select another weapon:'
											})
											return
										}
										else if (userPossibleAmmo.length === 1) {
											ammo = userPossibleAmmo[0] as ItemWithRow<BackpackItemRow, Ammunition>
										}
										else {
											// user must select ammo
											const ammoSortedByBest = sortItemsByAmmo(userPossibleAmmo, true)

											components = [{
												type: ComponentType.SELECT,
												custom_id: 'ammo',
												placeholder: 'Select an ammunition from your inventory to use:',
												options: ammoSortedByBest.map(i => {
													const ammoItem = i.item as Ammunition
													const iconID = i.item.icon.match(/:([0-9]*)>/)
													const ammoDesc = ammoItem.spreadsDamageToLimbs ?
														`${ammoItem.damage} (${Math.round(ammoItem.damage / ammoItem.spreadsDamageToLimbs)} x ${ammoItem.spreadsDamageToLimbs} limbs) damage. ${ammoItem.penetration.toFixed(1)} armor penetration.` :
														`${ammoItem.damage} damage. ${ammoItem.penetration.toFixed(1)} armor penetration.`

													return {
														label: getItemNameDisplay(i.item),
														value: i.row.id.toString(),
														description: ammoDesc,
														emoji: iconID ? {
															id: iconID[1],
															name: i.item.name
														} : undefined
													}
												})
											}]

											await attackCtx.editOriginal({
												content: `${icons.warning} Which ammo do you want to use with your ${getItemDisplay(weaponItemRow.item)}?`,
												components: [{
													type: ComponentType.ACTION_ROW,
													components
												}]
											})
										}
									}

									weapon = weaponItemRow as ItemWithRow<BackpackItemRow, Weapon>
								}
							}
							else if (attackCtx.customID === 'ammo') {
								const ammoItemRow = preSelectPlayerInventory.items.find(i => i.row.id.toString() === attackCtx.values[0])

								if (!ammoItemRow) {
									await attackCtx.editOriginal({
										content: `${icons.danger} Ammo not found in your inventory. Please select a different ammunition:`
									})
								}

								ammo = ammoItemRow as ItemWithRow<BackpackItemRow, Ammunition>
							}

							if (attackCtx.customID === 'limb') {
								if (attackCtx.values[0] !== 'none') {
									limbTarget = attackCtx.values[0] as BodyPart
								}

								attackCollector.stopCollector()
								await attackCtx.editOriginal({
									content: `${icons.checkmark} ${getItemDisplay(weapon!.item)} ${ammo ? `(ammo: ${getItemDisplay(ammo.item)})` : ''} selected as your weapon!`,
									components: [{
										type: ComponentType.ACTION_ROW,
										components: disableAllComponents(components)
									}]
								})
							}
							else if ((weapon && ammo) || (weapon && weapon.item.type !== 'Ranged Weapon')) {
								const playerInfo = players.find(p => p.member.id === actionCtx.user.id)
								const playerStimulants = playerInfo?.stims
								const playerAfflictions = playerInfo?.afflictions
								const stimulantEffects = addStatusEffects(playerStimulants || [], playerAfflictions)

								// check if the user has at least 50% accuracy (stimulants can boost accuracy, so add those too)
								if (Math.floor(weapon.item.accuracy + stimulantEffects.accuracyBonus) < accuracyToTargetLimbs) {
									// weapon is not accurate enough to target limbs
									attackCollector.stopCollector()
									await attackCtx.editOriginal({
										content: `${icons.checkmark} ${getItemDisplay(weapon!.item)} ${ammo ? `(ammo: ${getItemDisplay(ammo.item)})` : ''} selected as your weapon!` +
											` (You could not target a limb because you only have **${Math.floor(weapon.item.accuracy + stimulantEffects.accuracyBonus)}%** accuracy. **${accuracyToTargetLimbs}%** is needed to target limbs.)`,
										components: [{
											type: ComponentType.ACTION_ROW,
											components: disableAllComponents(components)
										}]
									})
									return
								}

								// weapon is accurate enough, allow player to select limb
								components = [
									{
										type: ComponentType.SELECT,
										custom_id: 'limb',
										placeholder: 'Select a limb to target:',
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

								await attackCtx.editOriginal({
									content: `${getItemDisplay(weapon.item)} selected as your weapon! What limb do you want to target?`,
									components: [{
										type: ComponentType.ACTION_ROW,
										components
									}]
								})
							}
						}
						catch (err) {
							logger.warn(err)
						}
					})

					attackCollector.collector.on('end', async msg => {
						try {
							if (msg === 'time' || msg === 'selected') {
								// unable to edit the ephemeral message here because there is no context to do so :(
								return
							}

							actionCollectors.splice(actionCollectors.indexOf(attackCollector), 1)

							choices.set(actionCtx.user.id, {
								choice: 'attack',
								weapon,
								ammo,
								limbTarget,
								speed: weapon.item.speed,
								attackCtx: actionCtx
							})

							// end turn if all players have finished actions
							if (otherPlayerIDs.every(p => choices.get(p))) {
								turnCollector.stopCollector()
							}
						}
						catch (err) {
							logger.error(err)
						}
					})
				}
				else if (actionCtx.customID === 'heal') {
					await actionCtx.acknowledge()

					const preHealPlayerData = (await getUserRow(query, actionCtx.user.id))!
					const preHealBackpackRows = await getUserBackpack(query, actionCtx.user.id)
					const preHealInventory = getItems(preHealBackpackRows)
					const possibleHealItems = preHealInventory.items.filter(i => i.item.type === 'Medical')
					const preHealMaxPossible = preHealPlayerData.maxHealth - preHealPlayerData.health

					if (!possibleHealItems.length) {
						await actionCtx.send({
							ephemeral: true,
							content: `${icons.danger} You don't have any healing items in your inventory. Please select a different action.`
						})
						return
					}
					else if (preHealMaxPossible <= 0) {
						await actionCtx.send({
							ephemeral: true,
							content: `${icons.danger} You are already at max health. Please select a different action.`
						})
						return
					}

					const components: ComponentSelectMenu[] = [
						{
							type: ComponentType.SELECT,
							custom_id: 'item',
							placeholder: 'Select a medical item from your inventory to use:',
							options: [
								...sortItemsByLevel(possibleHealItems, true).slice(0, 25).map(i => {
									const iconID = i.item.icon.match(/:([0-9]*)>/)
									const itemDesc = i.item.type === 'Medical' ?
										`Heals for ${i.item.healsFor} HP.` :
										''

									return {
										label: `[${i.row.id}] ${getItemNameDisplay(i.item, i.row)}`,
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
					const healMessage = await actionCtx.sendFollowUp({
						ephemeral: true,
						content: 'What item do you want to heal with?',
						components: [{
							type: ComponentType.ACTION_ROW,
							components
						}]
					})
					const healCollector = componentCollector.createCollector(healMessage.id, i => i.user.id === actionCtx.user.id, 60000)
					let healItem: ItemWithRow<BackpackItemRow, Medical>

					actionCollectors.push(healCollector)

					healCollector.collector.on('collect', async healCtx => {
						try {
							const healItemRow = preHealInventory.items.find(i => i.row.id.toString() === healCtx.values[0])

							await healCtx.acknowledge()

							if (choices.get(healCtx.user.id)) {
								healCollector.stopCollector('selected')

								await healCtx.editOriginal({
									content: `${icons.timer} You have already chosen an action.`,
									components: [{
										type: ComponentType.ACTION_ROW,
										components: disableAllComponents(components)
									}]
								})
								return
							}
							else if (!healItemRow) {
								await healCtx.editOriginal({
									content: `${icons.danger} Item not found in your inventory. Please select another item:`
								})
								return
							}

							healItem = healItemRow as ItemWithRow<BackpackItemRow, Medical>
							healCollector.stopCollector()

							await healCtx.editOriginal({
								content: `${icons.checkmark} ${getItemDisplay(healItemRow.item)} selected!`,
								components: [{
									type: ComponentType.ACTION_ROW,
									components: disableAllComponents(components)
								}]
							})
						}
						catch (err) {
							logger.warn(err)
						}
					})

					healCollector.collector.on('end', async msg => {
						try {
							actionCollectors.splice(actionCollectors.indexOf(healCollector), 1)

							if (msg === 'time' || msg === 'selected') {
								return
							}

							choices.set(actionCtx.user.id, {
								choice: 'use a medical item',
								itemRow: healItem,
								speed: healItem.item.speed
							})

							// end turn if all players have finished actions
							if (otherPlayerIDs.every(p => choices.get(p))) {
								turnCollector.stopCollector()
							}
						}
						catch (err) {
							logger.error(err)
						}
					})
				}
				else if (actionCtx.customID === 'stimulant') {
					await actionCtx.acknowledge()

					const preHealBackpackRows = await getUserBackpack(query, actionCtx.user.id)
					const preHealInventory = getItems(preHealBackpackRows)
					const playerStimulants = players.find(p => p.member.id === actionCtx.user.id)?.stims
					const playerStimItems = preHealInventory.items.filter(i => i.item.type === 'Stimulant')
					const possibleStimulants = playerStimItems.filter(i => !playerStimulants?.some(stim => stim.name === i.item.name))

					if (!playerStimItems.length || !playerStimulants) {
						await actionCtx.send({
							ephemeral: true,
							content: `${icons.danger} You don't have any stimulants in your inventory. Please select a different action.`
						})
						return
					}
					else if (!possibleStimulants.length) {
						// user has stimulants but they are already active, cannot inject the same stimulant twice
						await actionCtx.send({
							ephemeral: true,
							content: `${icons.danger} You don't have any stimulants that you can inject right now. Please select a different action.`
						})
						return
					}
					else if (playerStimulants.length >= maxStimulantsPerDuel) {
						// user has used max stimulants in this duel already
						await actionCtx.send({
							ephemeral: true,
							content: `${icons.danger} You can only inject up to **${maxStimulantsPerDuel}** stimulants per duel. Please select a different action.`
						})
						return
					}

					const components: ComponentSelectMenu[] = [
						{
							type: ComponentType.SELECT,
							custom_id: 'item',
							placeholder: 'Select a stimulant from your inventory to use:',
							options: [
								...sortItemsByLevel(playerStimItems, true).slice(0, 25).map(i => {
									const item = i.item as Stimulant
									const iconID = i.item.icon.match(/:([0-9]*)>/)
									const effectsDisplay = getEffectsDescription(item.effects)

									return {
										label: `[${i.row.id}] ${getItemNameDisplay(i.item, i.row)}`,
										value: i.row.id.toString(),
										description: `${i.row.durability ? `${i.row.durability} uses left. ` : ''}${effectsDisplay.join(', ') || 'No viable effects.'}`,
										emoji: iconID ? {
											id: iconID[1],
											name: i.item.name
										} : undefined
									}
								})
							]
						}
					]
					const stimMessage = await actionCtx.sendFollowUp({
						ephemeral: true,
						content: 'What stimulant do you want to use?',
						components: [{
							type: ComponentType.ACTION_ROW,
							components
						}]
					})
					const stimCollector = componentCollector.createCollector(stimMessage.id, i => i.user.id === actionCtx.user.id, 60000)
					let stimItem: ItemWithRow<BackpackItemRow, Stimulant>

					actionCollectors.push(stimCollector)

					stimCollector.collector.on('collect', async stimCtx => {
						try {
							const stimItemRow = preHealInventory.items.find(i => i.row.id.toString() === stimCtx.values[0])

							await stimCtx.acknowledge()

							if (choices.get(stimCtx.user.id)) {
								stimCollector.stopCollector('selected')

								await stimCtx.editOriginal({
									content: `${icons.timer} You have already chosen an action.`,
									components: [{
										type: ComponentType.ACTION_ROW,
										components: disableAllComponents(components)
									}]
								})
								return
							}
							else if (!stimItemRow) {
								await stimCtx.editOriginal({
									content: `${icons.danger} Item not found in your inventory. Please select another item:`
								})
								return
							}

							stimItem = stimItemRow as ItemWithRow<BackpackItemRow, Stimulant>
							stimCollector.stopCollector()

							await stimCtx.editOriginal({
								content: `${icons.checkmark} ${getItemDisplay(stimItemRow.item)} selected!`,
								components: [{
									type: ComponentType.ACTION_ROW,
									components: disableAllComponents(components)
								}]
							})
						}
						catch (err) {
							logger.warn(err)
						}
					})

					stimCollector.collector.on('end', async msg => {
						try {
							actionCollectors.splice(actionCollectors.indexOf(stimCollector), 1)

							if (msg === 'time' || msg === 'selected') {
								return
							}

							choices.set(actionCtx.user.id, {
								choice: 'use a stimulant',
								itemRow: stimItem,
								speed: stimItem.item.speed
							})

							// end turn if all players have finished actions
							if (otherPlayerIDs.every(p => choices.get(p))) {
								turnCollector.stopCollector()
							}
						}
						catch (err) {
							logger.error(err)
						}
					})
				}
				else if (actionCtx.customID === 'flee') {
					await actionCtx.acknowledge()

					choices.set(actionCtx.user.id, {
						choice: 'try to flee',
						speed: 1000
					})

					// end turn if all players have finished actions
					if (otherPlayerIDs.every(p => choices.get(p))) {
						turnCollector.stopCollector()
					}

					await actionCtx.send({
						ephemeral: true,
						content: `${icons.checkmark} Attempt to flee selected!`
					})
				}
			}
			catch (err) {
				logger.warn(err)
			}
		})

		turnCollector.collector.on('end', async msg => {
			// handle end of turn
			for (const actionCollector of actionCollectors) {
				// stop all sub-component collectors such as the weapon selection menu
				actionCollector.stopCollector('time')
			}

			try {
				await botMessage.edit({
					content: `${icons.timer} Turn #${turnNumber} selection has ended.`,
					components: [{
						type: ComponentType.ACTION_ROW,
						components: [GRAY_BUTTON('Attack', 'attack', true, '🗡️'), GRAY_BUTTON('Use Medical Item', 'heal', true, '🩹'), GRAY_BUTTON('Use Stimulant', 'stimulant', true, '💉'), RED_BUTTON('Try to Flee', 'flee', true)]
					}]
				})
			}
			catch (err) {
				logger.warn(err)
			}

			resolve(choices)
		})
	})
}
