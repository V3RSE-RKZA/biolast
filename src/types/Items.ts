interface BaseItem {
	type: 'Weapon' | 'Helmet' | 'Armor' | 'Ammunition' | 'Medical' | 'Backpack' | 'Key'
	name: string
	aliases: string[]
	icon: string
	description?: string
	sellPrice?: number
	buyPrice?: number
	durability?: number
	slotsUsed: number
}

type ArmorLevel = 1 | 2 | 3 | 4

export interface RangedWeapon extends BaseItem {
	type: 'Weapon'

	/**
	 * Ranged requires ammo to be used
	 */
	subtype: 'Ranged'

	/**
	 * How often can this weapon be used (cooldown in seconds)
	 */
	fireRate: number

	/**
	 * The percent chance for this weapon to hit target (0% - 100%)
	 */
	accuracy: number

	/**
	 * How many times this weapon can be used to attack
	 */
	durability: number
}

export interface MeleeWeapon extends BaseItem {
	type: 'Weapon'

	/**
	 * Melee means weapon does not require ammo
	 */
	subtype: 'Melee'

	/**
	 * How often can this weapon be used (cooldown in seconds)
	 */
	fireRate: number

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
}

export type Weapon = RangedWeapon | MeleeWeapon

export interface Armor extends BaseItem {
	type: 'Armor'

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
	 * Names of the weapons this ammo works for
	 */
	ammoFor: string[]
}

export interface Medical extends BaseItem {
	type: 'Medical'

	/**
	 * Amount this medical item will heal player for
	 */
	healsFor: number

	/**
	 * How long will this prevent user from healing again (cooldown in seconds)
	 */
	healRate: number
}

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

export type Item = Weapon | Helmet | Armor | Ammunition | Medical | Backpack | Key
