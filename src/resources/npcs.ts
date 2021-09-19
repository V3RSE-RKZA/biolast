import { Ammunition, Armor, Helmet, Item, MeleeWeapon, RangedWeapon } from '../types/Items'
import { items } from './items'

type NPCType = 'walker' | 'raider' | 'boss'

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

interface RangedBoss extends NPCBase {
	type: 'boss'
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
interface MeleeBoss extends NPCBase {
	type: 'boss'
	subtype: 'melee'

	/**
	 * The weapon item this raider uses
	 */
	weapon: MeleeWeapon
}

type Raider = RangedRaider | MeleeRaider
type Boss = RangedBoss | MeleeBoss

export type NPC = Raider | Walker | Boss

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
			uncommon: [items.makeshift_pistol_bullet, items.small_pouch, items.walker_goop],
			rare: [items['9mm_fmj_bullet']],
			rolls: 1
		},
		quotes: [
			'~*You hear footsteps nearby*~',
			'~*You hear a deep growl close by*~'
		],
		xp: 20
	},
	cain: {
		type: 'boss',
		subtype: 'ranged',
		id: 'cain',
		display: 'Cain, The Gravekeeper',
		icon: '',
		health: 125,
		damage: 30,
		drops: {
			common: [items.bandage],
			uncommon: [items.ifak_medkit],
			rare: [items.sledgehammer, items.bone_armor],
			rolls: 1
		},
		weapon: items['glock-17'],
		ammo: items['9mm_fmj_bullet'],
		quotes: [
			'~*You hear footsteps nearby*~'
		],
		armor: items.wooden_armor,
		helmet: items.wooden_helmet,
		xp: 50
	},
	raider_weak: {
		type: 'raider',
		subtype: 'ranged',
		id: 'raider_weak',
		display: 'Raider',
		icon: '',
		health: 30,
		damage: 25,
		drops: {
			common: [items.bandage],
			uncommon: [items.ifak_medkit],
			rare: [items['5.45x39_fmj_bullet'], items['9mm_fmj_bullet']],
			rolls: 1
		},
		weapon: items.luger,
		ammo: items['.22lr_bullet'],
		quotes: [
			'~*You hear footsteps nearby*~'
		],
		armor: items.cloth_armor,
		helmet: items.cloth_helmet,
		xp: 40
	},
	bloated_walker: {
		type: 'walker',
		id: 'bloated_walker',
		display: 'Bloated Walker',
		icon: '🧟‍♂️',
		health: 50,
		damage: 35,
		drops: {
			common: [items.pitchfork, items.walker_goop],
			uncommon: [items.apple],
			rare: [items.fire_axe],
			rolls: 1
		},
		quotes: [
			'~*You hear footsteps nearby*~',
			'~*You hear a deep growl close by*~'
		],
		xp: 50
	},
	dave: {
		type: 'boss',
		subtype: 'ranged',
		id: 'dave',
		display: 'Dave, The Redneck',
		icon: '👨‍🌾',
		health: 185,
		damage: 20,
		drops: {
			common: [items.pitchfork],
			uncommon: [items.sauce_pan, items.ifak_medkit],
			rare: [items.sledgehammer, items.gunsafe_code],
			rolls: 1
		},
		weapon: items['aks-74u'],
		ammo: items['5.45x39_fmj_bullet'],
		quotes: [
			'~*You hear the giggles and crackles of a man...*~'
		],
		armor: items.cloth_armor,
		helmet: items.sauce_pan,
		xp: 75
	}
})

export const allNPCs = Object.values(npcs)
