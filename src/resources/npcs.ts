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

	/**
	 * The XP earned for killing this NPC
	 */
	xp: number
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
		icon: '🧟‍♂️',
		health: 30,
		damage: 25,
		drops: {
			common: [items.bandage],
			uncommon: [items.makeshift_pistol_ammo],
			rare: [items['9mm_fmj']],
			rolls: 1
		},
		quotes: [
			'~*You hear footsteps nearby*~',
			'~*You hear a deep growl close by*~'
		],
		xp: 20
	},
	cain: {
		type: 'raider',
		subtype: 'ranged',
		id: 'cain',
		display: 'Cain, The Gravekeeper',
		icon: '',
		health: 125,
		damage: 30,
		drops: {
			common: [items.bandage],
			uncommon: [items['glock-17'], items.ifak_medkit],
			rare: [items.sledgehammer],
			rolls: 1
		},
		weapon: items['aks-74u'],
		ammo: items['5.45x39_fmj'],
		quotes: [
			'~*You hear footsteps nearby*~'
		],
		armor: items.paca_armor,
		helmet: items.wooden_helmet,
		xp: 50
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
			common: [items.bandage],
			uncommon: [items.ifak_medkit],
			rare: [items['5.45x39_fmj']],
			rolls: 1
		},
		weapon: items['glock-17'],
		ammo: items['9mm_fmj'],
		quotes: [
			'~*You hear footsteps nearby*~'
		],
		armor: items.cloth_armor,
		helmet: items.cloth_helmet,
		xp: 40
	}
})

export const allNPCs = Object.values(npcs)
