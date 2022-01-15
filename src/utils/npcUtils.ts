import { icons } from '../config'
import { Affliction, afflictions } from '../resources/afflictions'
import { NPC } from '../types/NPCs'
import { Ammunition, Medical, Item, MeleeWeapon, RangedWeapon, Stimulant, ThrowableWeapon, Weapon } from '../types/Items'
import { BackpackItemRow, ItemWithRow, Query, UserRow } from '../types/mysql'
import { deleteItem, lowerItemDurability } from './db/items'
import { increaseDeaths, lowerHealth, setFighting } from './db/players'
import { BodyPart, getAttackDamage, getAttackString, getBodyPartHit } from './duelUtils'
import { getEquips, getItemDisplay, getItems } from './itemUtils'
import { addStatusEffects, getEffectsDisplay } from './playerUtils'
import { combineArrayWithAnd, formatHealth, getAfflictionEmoji, getBodyPartEmoji, getRarityDisplay } from './stringUtils'
import { ResolvedMember } from 'slash-create/lib/structures/resolvedMember'

interface MobAttackChoice {
	choice: 'attack'
}
interface MobHealChoice {
	choice: 'use a medical item'
	item: Medical
}
interface MobStimulantChoice {
	choice: 'use a stimulant'
	item: Stimulant
}
export type MobChoice = (MobAttackChoice | MobHealChoice | MobStimulantChoice) & { speed: number }

/**
 * Used to get a random item from an NPCs item drop pool
 * @param npc The NPC to get item drop from
 * @returns A random item from possible item drops of NPC
 */
export function getMobDrop (npc: NPC): { item: Item, rarityDisplay: string } | undefined {
	const rand = Math.random()
	let randomItem
	let rarityDisplay

	if (rand < 0.60) {
		randomItem = npc.drops.common[Math.floor(Math.random() * npc.drops.common.length)]
		rarityDisplay = getRarityDisplay('Common')
	}
	else if (rand < 0.85) {
		randomItem = npc.drops.uncommon[Math.floor(Math.random() * npc.drops.uncommon.length)]
		rarityDisplay = getRarityDisplay('Uncommon')
	}
	else {
		randomItem = npc.drops.rare[Math.floor(Math.random() * npc.drops.rare.length)]
		rarityDisplay = getRarityDisplay('Rare')
	}

	return {
		item: randomItem,
		rarityDisplay
	}
}

export function getMobChoice (npc: NPC, npcStimulants: Stimulant[], currentHealth: number): MobChoice {
	const random = Math.random()

	if (npc.usesHeals && random <= 0.25 && currentHealth < npc.health) {
		const healingItem = npc.usesHeals[Math.floor(Math.random() * npc.usesHeals.length)]

		return {
			choice: 'use a medical item',
			speed: healingItem.speed,
			item: healingItem
		}
	}
	else if (npc.usesStimulants && random <= 0.4) {
		const stimItem = npc.usesStimulants[Math.floor(Math.random() * npc.usesStimulants.length)]

		if (!npcStimulants.includes(stimItem)) {
			return {
				choice: 'use a stimulant',
				speed: stimItem.speed,
				item: stimItem
			}
		}
	}

	return {
		choice: 'attack',
		speed: 'weapon' in npc ? npc.weapon.speed : 1
	}
}

/**
 * @param npc NPC to display
 * @param currentHealth Health the NPC has
 * @param options Options for the display
 * @param options.showHealth Show the NPCs health
 */
export function getMobDisplay (npc: NPC, currentHealth: number, options: Partial<{ showHealth: boolean }> = {}): string[] {
	const { showHealth = true } = options
	const npcDescription = showHealth ? [
		`__**Health**__\n**${currentHealth} / ${npc.health}** HP\n${formatHealth(currentHealth, npc.health)}`
	] : []
	const npcPenetration = 'ammo' in npc ?
		npc.ammo.penetration :
		'weapon' in npc ?
			npc.weapon.penetration :
			npc.attackPenetration

	npcDescription.push('\n__**Gear**__')

	if ('weapon' in npc) {
		npcDescription.push(`**Weapon**: ${getItemDisplay(npc.weapon)}`)
	}
	else {
		npcDescription.push('**Weapon**: None')
	}

	if ('ammo' in npc) {
		npcDescription.push(`**Ammo**: ${getItemDisplay(npc.ammo)}`)
	}

	npcDescription.push(
		`**Helmet**: ${npc.helmet ? getItemDisplay(npc.helmet) : 'None'}`,
		`**Body Armor**: ${npc.armor ? getItemDisplay(npc.armor) : 'None'}`,
		`**Damage**: ${npc.damage}`,
		`**Armor Penetration**: ${npcPenetration}`
	)

	return npcDescription
}

export function getMobAttackString (npc: NPC, victimName: string, limbsHit: { damage: { total: number, reduced: number }, limb: BodyPart }[], totalDamage: number): string
export function getMobAttackString (npc: NPC, victimName: string, limbsHit: { damage: { total: number, reduced: number }, limb: BodyPart }[], totalDamage: number, weapon: MeleeWeapon | ThrowableWeapon): string
export function getMobAttackString (npc: NPC, victimName: string, limbsHit: { damage: { total: number, reduced: number }, limb: BodyPart }[], totalDamage: number, weapon: RangedWeapon, ammo: Ammunition): string
export function getMobAttackString (npc: NPC, victimName: string, limbsHit: { damage: { total: number, reduced: number }, limb: BodyPart }[], totalDamage: number, weapon?: Weapon, ammo?: Ammunition): string {
	const npcDisplay = npc.boss ? `**${npc.display}**` : `The **${npc.display.toLowerCase()}**`

	if (weapon && npc.type !== 'walker') {
		if (weapon.type === 'Ranged Weapon') {
			return getAttackString(weapon, npcDisplay, victimName, limbsHit, totalDamage, ammo!)
		}

		return getAttackString(weapon, npcDisplay, victimName, limbsHit, totalDamage)
	}

	if (limbsHit.length > 1) {
		const limbsHitStrings = []

		for (const limbHit of limbsHit) {
			limbsHitStrings.push(limbHit.limb === 'head' ? `${getBodyPartEmoji(limbHit.limb)} ***HEAD*** for **${limbHit.damage.total}** damage` : `${getBodyPartEmoji(limbHit.limb)} **${limbHit.limb}** for **${limbHit.damage.total}** damage`)
		}

		return `${npcDisplay} took a swipe at ${victimName}'s ${combineArrayWithAnd(limbsHitStrings)}. **${totalDamage}** damage dealt.\n`
	}

	return `${npcDisplay} took a swipe at ${victimName}'s ${getBodyPartEmoji(limbsHit[0].limb)} **${limbsHit[0].limb === 'head' ? '*HEAD*' : limbsHit[0].limb}**. **${totalDamage}** damage dealt.\n`
}

/**
 * Simulates an NPCs attack on a player
 * @param transactionQuery The transaction query, used to keep all queries inside a transaction. THIS FUNCTION DOES NOT COMMIT THE TRANSACTION, DO THAT AFTER YOU CALL THIS FUNCTION
 * @param member The slash-create member object of the player getting attacked
 * @param userRow The user row of player getting attacked
 * @param userBackpack The backpack of player getting attacked
 * @param npc The NPC attacking
 * @param playerStimulants
 * @param playerAfflictions
 * @param npcStimulants
 * @param npcAfflictions
 * @returns Object containing the attack messages, how much damage the NPC dealt, and how many items were removed from the user during the attack (such as their armor or helmet)
 */
export async function attackPlayer (
	transactionQuery: Query,
	member: ResolvedMember,
	userRow: UserRow,
	userBackpack: BackpackItemRow[],
	npc: NPC,
	playerStimulants: Stimulant[],
	playerAfflictions: Affliction[],
	npcStimulants: Stimulant[],
	npcAfflictions: Affliction[]
): Promise<{ messages: string[], damage: number, lostItems: ItemWithRow<BackpackItemRow>[] }> {
	const messages = []
	const userBackpackData = getItems(userBackpack)
	const userEquips = getEquips(userBackpack)
	const playerEffects = addStatusEffects(playerStimulants, playerAfflictions)
	const npcEffects = addStatusEffects(npcStimulants, npcAfflictions)
	const stimulantDamageMulti = (1 + (npcEffects.damageBonus / 100) - ((playerEffects.damageTaken * -1) / 100))
	const limbsHit = []
	const bodyPartHit = getBodyPartHit(50)
	const removedItems: number[] = []
	let totalDamage
	let npcAttackPenetration
	let victimLoot: ItemWithRow<BackpackItemRow>[] = []

	if (npc.type === 'raider') {
		if ('ammo' in npc) {
			// raider is using ranged weapon
			npcAttackPenetration = npc.ammo.penetration

			if (npc.ammo.spreadsDamageToLimbs) {
				limbsHit.push({
					damage: getAttackDamage((npc.damage * stimulantDamageMulti) / npc.ammo.spreadsDamageToLimbs, npc.ammo.penetration, bodyPartHit.result, userEquips.armor?.item, userEquips.helmet?.item),
					limb: bodyPartHit.result
				})

				for (let i = 0; i < npc.ammo.spreadsDamageToLimbs - 1; i++) {
					let limb = getBodyPartHit(npc.weapon.accuracy)

					// make sure no duplicate limbs are hit
					while (limbsHit.find(l => l.limb === limb.result)) {
						limb = getBodyPartHit(npc.weapon.accuracy)
					}

					limbsHit.push({
						damage: getAttackDamage((npc.damage * stimulantDamageMulti) / npc.ammo.spreadsDamageToLimbs, npc.ammo.penetration, limb.result, userEquips.armor?.item, userEquips.helmet?.item),
						limb: limb.result
					})
				}
			}
			else {
				limbsHit.push({
					damage: getAttackDamage((npc.damage * stimulantDamageMulti), npc.ammo.penetration, bodyPartHit.result, userEquips.armor?.item, userEquips.helmet?.item),
					limb: bodyPartHit.result
				})
			}

			totalDamage = limbsHit.reduce((prev, curr) => prev + curr.damage.total, 0)

			messages.push(getMobAttackString(npc, `<@${member.id}>`, limbsHit, totalDamage, npc.weapon, npc.ammo))
		}
		else {
			npcAttackPenetration = npc.weapon.penetration

			if (npc.weapon.type === 'Throwable Weapon' && npc.weapon.spreadsDamageToLimbs) {
				limbsHit.push({
					damage: getAttackDamage((npc.damage * stimulantDamageMulti) / npc.weapon.spreadsDamageToLimbs, npc.weapon.penetration, bodyPartHit.result, userEquips.armor?.item, userEquips.helmet?.item),
					limb: bodyPartHit.result
				})

				for (let i = 0; i < npc.weapon.spreadsDamageToLimbs - 1; i++) {
					let limb = getBodyPartHit(npc.weapon.accuracy)

					// make sure no duplicate limbs are hit
					while (limbsHit.find(l => l.limb === limb.result)) {
						limb = getBodyPartHit(npc.weapon.accuracy)
					}

					limbsHit.push({
						damage: getAttackDamage((npc.damage * stimulantDamageMulti) / npc.weapon.spreadsDamageToLimbs, npc.weapon.penetration, limb.result, userEquips.armor?.item, userEquips.helmet?.item),
						limb: limb.result
					})
				}
			}
			else {
				limbsHit.push({
					damage: getAttackDamage((npc.damage * stimulantDamageMulti), npcAttackPenetration, bodyPartHit.result, userEquips.armor?.item, userEquips.helmet?.item),
					limb: bodyPartHit.result
				})
			}

			totalDamage = limbsHit.reduce((prev, curr) => prev + curr.damage.total, 0)

			messages.push(getMobAttackString(npc, `<@${member.id}>`, limbsHit, totalDamage, npc.weapon))

			if (npc.weapon.type === 'Throwable Weapon' && npc.weapon.subtype === 'Incendiary Grenade' && !playerAfflictions.includes(afflictions.Burning)) {
				messages.push(`${icons.postive_effect_debuff} **${member.displayName}** is ${getAfflictionEmoji('Burning')} Burning! (${combineArrayWithAnd(getEffectsDisplay(afflictions.Burning.effects))})`)

				playerAfflictions.push(afflictions.Burning)
			}
		}
	}
	else {
		// walker doesn't use a weapon, instead just swipes at user
		npcAttackPenetration = npc.attackPenetration
		limbsHit.push({
			damage: getAttackDamage((npc.damage * stimulantDamageMulti), npcAttackPenetration, bodyPartHit.result, userEquips.armor?.item, userEquips.helmet?.item),
			limb: bodyPartHit.result
		})
		totalDamage = limbsHit[0].damage.total

		messages.push(getMobAttackString(npc, `<@${member.id}>`, limbsHit, totalDamage))

		if (Math.random() <= (npc.chanceToBite / 100) && !playerAfflictions.includes(afflictions.Bitten)) {
			messages.push(`${icons.postive_effect_debuff} **${member.displayName}** was ${getAfflictionEmoji('Bitten')} Bitten! (${combineArrayWithAnd(getEffectsDisplay(afflictions.Bitten.effects))})`)

			playerAfflictions.push(afflictions.Bitten)
		}
	}

	for (const result of limbsHit) {
		if (result.limb === 'head' && userEquips.helmet) {
			messages.push(`**${member.displayName}**'s helmet (${getItemDisplay(userEquips.helmet.item)}) reduced the damage by **${result.damage.reduced}**.`)

			if (userEquips.helmet.row.durability - 1 <= 0) {
				messages.push(`**${member.displayName}**'s ${getItemDisplay(userEquips.helmet.item)} broke from this attack!`)

				await deleteItem(transactionQuery, userEquips.helmet.row.id)
				removedItems.push(userEquips.helmet.row.id)
			}
			else {
				await lowerItemDurability(transactionQuery, userEquips.helmet.row.id, 1)
			}
		}
		else if (result.limb === 'chest' && userEquips.armor) {
			messages.push(`**${member.displayName}**'s armor (${getItemDisplay(userEquips.armor.item)}) reduced the damage by **${result.damage.reduced}**.`)

			if (userEquips.armor.row.durability - 1 <= 0) {
				messages.push(`**${member.displayName}**'s ${getItemDisplay(userEquips.armor.item)} broke from this attack!`)

				await deleteItem(transactionQuery, userEquips.armor.row.id)
				removedItems.push(userEquips.armor.row.id)
			}
			else {
				await lowerItemDurability(transactionQuery, userEquips.armor.row.id, 1)
			}
		}
		else if (result.limb === 'arm' && Math.random() <= 0.2 && !playerAfflictions.includes(afflictions['Broken Arm'])) {
			messages.push(`${icons.postive_effect_debuff} **${member.displayName}**'s ${getAfflictionEmoji('Broken Arm')} arm was broken! (${combineArrayWithAnd(getEffectsDisplay(afflictions['Broken Arm'].effects))})`)

			playerAfflictions.push(afflictions['Broken Arm'])
		}
	}

	if (userRow.health - totalDamage <= 0) {
		// have to filter out the removed armor/helmet to prevent sql reference errors
		victimLoot = userBackpackData.items.filter(i => !removedItems.includes(i.row.id))

		for (const victimItem of victimLoot) {
			await deleteItem(transactionQuery, victimItem.row.id)
		}

		await increaseDeaths(transactionQuery, member.id, 1)
		await setFighting(transactionQuery, member.id, false)

		messages.push(`☠️ **${member.displayName}** DIED and lost **${victimLoot.length}** items.`)
	}
	else {
		await lowerHealth(transactionQuery, member.id, totalDamage)

		messages.push(`**${member.displayName}** is left with ${formatHealth(userRow.health - totalDamage, userRow.maxHealth)} **${userRow.health - totalDamage}** health.`)
	}

	return {
		messages,
		damage: totalDamage,
		lostItems: victimLoot
	}
}
