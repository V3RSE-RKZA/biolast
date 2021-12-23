interface BaseItem {
	type: 'Ranged Weapon' | 'Melee Weapon' | 'Helmet' | 'Body Armor' | 'Ammunition' | 'Medical' | 'Backpack' | 'Key' | 'Collectible' | 'Throwable Weapon' | 'Food'
	name: string
	aliases: string[]
	icon: string
	description?: string
	sellPrice?: number
	buyPrice?: number
	durability?: number
	slotsUsed: number

	/**
	 * The recommended level for this item. Used as level required to buy this item from the shop (helps prevent new players from buying and using end game items)
	 */
	itemLevel: number
}

type ArmorLevel = 1 | 2 | 3 | 4 | 5

export interface RangedWeapon extends BaseItem {
	type: 'Ranged Weapon'

	/**
	 * The percent chance for this weapon to hit target (0% - 100%)
	 */
	accuracy: number

	/**
	 * How many times this weapon can be used to attack
	 */
	durability: number

	/**
	 * How fast this weapon attacks in duels (player who uses item with higher speed goes first)
	 */
	speed: number
}

export interface MeleeWeapon extends BaseItem {
	type: 'Melee Weapon'

	/**
	 * The amount of damage this melee weapon deals when used
	 */
	damage: number

	/**
	 * The percent chance for this weapon to hit target (0% - 100%)
	 */
	accuracy: number

	/**
	 * How many times this weapon can be used to attack
	 */
	durability: number

	/**
	 * The armor penetration this weapon has, can be a float between 0 - whatever. If this number is greater than the victims armor level, this weapon will deal full damage.
	 * Otherwise, the damage will be reduced based on the difference between this number and the victims armor level.
	 */
	penetration: number

	/**
	 * How fast this weapon attacks in duels (player who uses item with higher speed goes first)
	 */
	speed: number
}

export interface ThrowableWeapon extends BaseItem {
	type: 'Throwable Weapon'
	subtype: 'Fragmentation Grenade' | 'Incendiary Grenade'

	/**
	 * The amount of damage this melee weapon deals when used
	 */
	damage: number

	/**
	 * The percent chance for this weapon to hit target (0% - 100%)
	 */
	accuracy: number

	/**
	 * How many limbs should the damage be spread out to
	 */
	spreadsDamageToLimbs?: 2 | 3 | 4

	/**
	 * The armor penetration this throwable has, can be a float between 0 - whatever. If this number is greater than the victims armor level, this will deal full damage.
	 * Otherwise, the damage will be reduced based on the difference between this number and the victims armor level.
	 */
	penetration: number

	/**
	 * How fast this weapon attacks in duels (player who uses item with higher speed goes first)
	 */
	speed: number
}

export type Weapon = RangedWeapon | MeleeWeapon | ThrowableWeapon

export interface Armor extends BaseItem {
	type: 'Body Armor'

	/**
	 * How many times this armor can be shot before it breaks
	 */
	durability: number

	/**
	 * The protection level of this armor: 1 = crap, 2 = protects against pistols, 3 = pretty good, 4 = protects against rifles
	 */
	level: ArmorLevel
}

export interface Helmet extends BaseItem {
	type: 'Helmet'

	/**
	 * How many times this armor can be shot before it breaks
	 */
	durability: number

	/**
	 * The protection level of this armor: 1 = crap, 2 = protects against pistols, 3 = pretty good, 4 = protects against rifles
	 */
	level: ArmorLevel
}

export interface Ammunition extends BaseItem {
	type: 'Ammunition'

	/**
	 * Damage expected from this round if shot at the targets CHEST, head shots will do 1.5x damage, arms and legs do 0.5x damage
	 */
	damage: number

	/**
	 * The armor penetration this ammo has, can be a float between 0 - whatever. If this number is greater than the victims armor level, this ammo will deal full damage.
	 * Otherwise, the damage of this bullet will be reduced based on the difference between this number and the victims armor level.
	 */
	penetration: number

	/**
	 * Weapons this ammo works for
	 */
	ammoFor: RangedWeapon[]

	/**
	 * How many limbs should the damage be spread out to
	 */
	spreadsDamageToLimbs?: 2 | 3 | 4
}

export interface HealingMedical extends BaseItem {
	type: 'Medical'
	subtype: 'Healing'

	/**
	 * How many times this item can be used to heal before it breaks
	 */
	durability: number

	/**
	 * Amount this medical item will heal player for
	 */
	healsFor: number

	/**
	 * How fast this weapon attacks in duels (player who uses item with higher speed goes first)
	 */
	speed: number

	/**
	 * Whether or not this medical item cures the "Bitten" debuff
	 */
	curesBitten: boolean

	/**
	 * Whether or not this medical item cures the "Broken Arm" debuff
	 */
	curesBrokenArm: boolean

	/**
	 * Whether or not this medical item cures the "Burning" debuff
	 */
	curesBurning: boolean
}

export interface Food extends BaseItem {
	type: 'Food'

	/**
	 * How many times this item can be used to feed companions
	 */
	durability: number

	/**
	 * How much this item lowers companion hunger by
	 */
	reducesHunger: number
}

/**
 * Status effects that can be applied to a user (such as the effects from using stimulants or afflictions like Burning)
 */
export interface StatusEffects {
	/**
	 * Percent damage bonus (10 would be 10% damage bonus)
	 */
	damageBonus: number
	/**
	 * Percent accuracy bonus (10 would be 10% accuracy bonus)
	 */
	accuracyBonus: number
	/**
	 * Percent damage reduction from attacks (10 would be 10% reduction)
	 */
	damageReduction: number
}
export interface StimulantMedical extends BaseItem {
	type: 'Medical'
	subtype: 'Stimulant'

	/**
	 * The effects this item gives when used
	 */
	effects: StatusEffects

	/**
	 * How fast this weapon attacks in duels (player who uses item with higher speed goes first)
	 */
	speed: number

	/**
	 * How many times this item can be used to heal before it breaks
	 */
	durability: number
}

export type Medical = HealingMedical | StimulantMedical

export interface Backpack extends BaseItem {
	type: 'Backpack'

	/**
	 * How many slots will this backpack add to the users inventory? Higher = player can hold more items
	 */
	slots: number
}

export interface Key extends BaseItem {
	type: 'Key'

	/**
	 * How many times this key can be used before it breaks
	 */
	durability: number
}

export interface Collectible extends BaseItem {
	type: 'Collectible'
}

export type Item = Weapon | Helmet | Armor | Ammunition | Medical | Backpack | Key | Collectible | Food
