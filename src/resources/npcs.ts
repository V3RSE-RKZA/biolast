import { Ammunition, Armor, Helmet, Item, MeleeWeapon, RangedWeapon } from '../types/Items'
import { items } from './items'

type NPCType = 'walker' | 'raider'

interface NPCBase {
	type: NPCType
	id: string
	display: string
	health: number
	damage: number
	icon: string
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
	 * Helmet npc is wearing
	 */
	helmet?: Helmet

	/**
	 * Armor npc is wearing
	 */
	armor?: Armor
}

interface Walker extends NPCBase {
	type: 'walker'
}

interface RangedRaider extends NPCBase {
	type: 'raider'
	subtype: 'ranged'

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
	subtype: 'melee'

	/**
	 * The weapon item this raider uses
	 */
	weapon: MeleeWeapon
}

type Raider = RangedRaider | MeleeRaider

export type NPC = Raider | Walker

const npcsObject = <T>(et: { [K in keyof T]: NPC & { id: K } }) => et

export const npcs = npcsObject({
	walker_weak: {
		type: 'walker',
		id: 'walker_weak',
		display: 'Walker',
		icon: '',
		health: 30,
		damage: 25,
		drops: {
			common: [items.ak47],
			uncommon: [items.paca_armor],
			rare: [items['7.62x51']],
			rolls: 1
		},
		quotes: [
			'~*You hear footsteps nearby*~',
			'~*You hear a deep growl close by*~'
		]
	},
	raider: {
		type: 'raider',
		subtype: 'ranged',
		id: 'raider',
		display: 'Raider',
		icon: '',
		health: 30,
		damage: 25,
		drops: {
			common: [items.ak47],
			uncommon: [items.paca_armor],
			rare: [items['7.62x51']],
			rolls: 1
		},
		weapon: items.ak47,
		ammo: items['7.62x51'],
		quotes: [
			'~*You hear footsteps nearby*~'
		],
		armor: items.paca_armor,
		helmet: items.paca_helmet
	}
})

export const allNPCs = Object.values(npcs)
