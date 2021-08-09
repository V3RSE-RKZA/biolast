import { MeleeWeapon } from '../../types/Items'

const meleeObject = <T>(et: { [K in keyof T]: MeleeWeapon & { name: K } }) => et

export const items = meleeObject({
	knife: {
		type: 'Melee Weapon',
		name: 'knife',
		icon: '<:U_melee:601366669251575857>',
		aliases: [],
		sellPrice: 2000,
		durability: 3,
		slotsUsed: 1,
		fireRate: 10,
		accuracy: 35,
		damage: 30,
		penetration: 0.9
	},
	wooden_bat: {
		type: 'Melee Weapon',
		name: 'wooden_bat',
		icon: '<:U_melee:601366669251575857>',
		aliases: ['bat'],
		sellPrice: 1000,
		durability: 3,
		slotsUsed: 1,
		fireRate: 10,
		accuracy: 30,
		damage: 20,
		penetration: 0.5
	},
	metal_bat: {
		type: 'Melee Weapon',
		name: 'metal_bat',
		icon: '<:U_melee:601366669251575857>',
		aliases: [],
		sellPrice: 1500,
		durability: 5,
		slotsUsed: 1,
		fireRate: 10,
		accuracy: 20,
		damage: 30,
		penetration: 0.8
	},
	metal_shank: {
		type: 'Melee Weapon',
		name: 'metal_shank',
		icon: '<:U_melee:601366669251575857>',
		aliases: ['shank'],
		sellPrice: 2750,
		durability: 7,
		slotsUsed: 1,
		fireRate: 15,
		accuracy: 25,
		damage: 35,
		penetration: 0.9
	}
})
