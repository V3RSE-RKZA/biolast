import { MeleeWeapon } from '../../types/Items'

const meleeObject = <T>(et: { [K in keyof T]: MeleeWeapon & { name: K } }) => et

export const items = meleeObject({
	knife: {
		type: 'Melee Weapon',
		name: 'knife',
		icon: '<:U_melee:601366669251575857>',
		aliases: [],
		sellPrice: 1000,
		durability: 3,
		slotsUsed: 1,
		fireRate: 10,
		accuracy: 35,
		damage: 22,
		penetration: 0.9
	},
	wooden_bat: {
		type: 'Melee Weapon',
		name: 'wooden_bat',
		icon: '<:U_melee:601366669251575857>',
		aliases: ['bat'],
		sellPrice: 500,
		durability: 3,
		slotsUsed: 1,
		fireRate: 15,
		accuracy: 20,
		damage: 13,
		penetration: 0.5
	},
	metal_bat: {
		type: 'Melee Weapon',
		name: 'metal_bat',
		icon: '<:U_melee:601366669251575857>',
		aliases: [],
		sellPrice: 700,
		durability: 6,
		slotsUsed: 1,
		fireRate: 15,
		accuracy: 20,
		damage: 13,
		penetration: 0.8
	},
	metal_shank: {
		type: 'Melee Weapon',
		name: 'metal_shank',
		icon: '<:U_melee:601366669251575857>',
		aliases: ['shank'],
		sellPrice: 1375,
		durability: 7,
		slotsUsed: 1,
		fireRate: 15,
		accuracy: 25,
		damage: 20,
		penetration: 2.0
	},
	sledgehammer: {
		type: 'Melee Weapon',
		name: 'sledgehammer',
		icon: '<:U_melee:601366669251575857>',
		aliases: ['sledge'],
		sellPrice: 1750,
		durability: 6,
		slotsUsed: 3,
		fireRate: 35,
		accuracy: 10,
		damage: 30,
		penetration: 0.75
	},
	claymore: {
		type: 'Melee Weapon',
		name: 'claymore',
		icon: '<:U_melee:601366669251575857>',
		aliases: [],
		sellPrice: 1050,
		durability: 6,
		slotsUsed: 1,
		fireRate: 20,
		accuracy: 25,
		damage: 30,
		penetration: 0.7
	}
})
