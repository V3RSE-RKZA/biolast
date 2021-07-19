import { Ammunition, Armor, Helmet, Item, Weapon } from '../types/Items'
import { items } from './items'

type NPCType = 'walker' | 'raider'

interface NPCBase {
	type: NPCType
	id: string
	display: string
	health: number
	damage: number
	icon: string
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
}

interface Walker extends NPCBase {
	type: 'walker'
}

interface Raider extends NPCBase {
	type: 'raider'

	/**
	 * The weapon item this raider uses
	 */
	weapon: Weapon

	/**
	 * The ammo if weapon is ranged
	 */
	ammo?: Ammunition

	/**
	 * Helmet raider is wearing
	 */
	helmet?: Helmet

	/**
	 * Armor raider is wearing
	 */
	armor?: Armor
}

export type NPC = Raider | Walker

const npcsObject = <T>(et: { [K in keyof T]: NPC & { id: K } }) => et

export const npcs = npcsObject({
	walker: {
		type: 'walker',
		id: 'walker',
		display: 'Walker',
		icon: '',
		health: 30,
		damage: 25,
		drops: {
			common: [items.ak47],
			uncommon: [items.paca_armor],
			rare: [items['7.62x51']],
			rolls: 1
		}
	},
	raider: {
		type: 'raider',
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
		ammo: items['7.62x51']
	}
})

export const allNPCs = Object.values(npcs)
