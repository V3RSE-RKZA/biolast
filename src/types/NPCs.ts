import { Ammunition, Armor, Medical, Helmet, Item, MeleeWeapon, RangedWeapon, Stimulant, ThrowableWeapon } from './Items'

type NPCType = 'walker' | 'raider'

interface NPCBase {
	type: NPCType
	display: string
	health: number
	damage: number
	quotes: string[]
	drops: {
		/**
		 * Common item drops from this NPC
		 */
		common: Item[]

		uncommon: Item[]

		rare: Item[]

		/**
		 * How many times to roll these drops
		 */
		rolls: number
	}

	/**
	 * The stimulants this NPC uses, if any
	 */
	usesStimulants?: Stimulant[]
	/**
	 * The healing items this NPC uses, if any
	 */
	usesHeals?: Medical[]

	/**
	 * Helmet npc is wearing
	 */
	helmet?: Helmet

	/**
	 * Armor npc is wearing
	 */
	armor?: Armor

	/**
	 * The XP earned for killing this NPC
	 */
	xp: number

	/**
	 * Whether or not this NPC is a boss
	 */
	boss: boolean
}

interface Walker extends NPCBase {
	type: 'walker'
	/**
	 * Percent chance this walker will bite the user and apply the "Bitten" debuff (0 - 100%)
	 */
	chanceToBite: number
	/**
	 * the penetration this walker has with it's attacks
	 */
	attackPenetration: number
}

interface RangedRaider extends NPCBase {
	type: 'raider'

	/**
	 * The weapon item this raider uses
	 */
	weapon: RangedWeapon

	/**
	 * The ammo if weapon is ranged
	 */
	ammo: Ammunition
}
interface MeleeRaider extends NPCBase {
	type: 'raider'

	/**
	 * The weapon item this raider uses
	 */
	weapon: MeleeWeapon
}
interface ThrowerRaider extends NPCBase {
	type: 'raider'

	/**
	 * The weapon item this raider uses
	 */
	weapon: ThrowableWeapon
}

type Raider = RangedRaider | MeleeRaider | ThrowerRaider
export type NPC = Raider | Walker
