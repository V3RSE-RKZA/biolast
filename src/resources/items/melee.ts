import { MeleeWeapon } from '../../types/Items'

const meleeObject = <T>(et: { [K in keyof T]: MeleeWeapon & { name: K } }) => et

export const melee = meleeObject({
	knife: {
		type: 'Melee Weapon',
		name: 'knife',
		icon: '<:U_melee:601366669251575857>',
		aliases: [],
		sellPrice: 132,
		durability: 2,
		slotsUsed: 1,
		fireRate: 8,
		accuracy: 80,
		damage: 8,
		penetration: 0.95,
		itemLevel: 2
	},
	wooden_bat: {
		type: 'Melee Weapon',
		name: 'wooden_bat',
		icon: '<:U_melee:601366669251575857>',
		aliases: ['bat'],
		sellPrice: 16,
		durability: 2,
		slotsUsed: 1,
		fireRate: 15,
		accuracy: 75,
		damage: 13,
		penetration: 0.5,
		itemLevel: 1
	},
	metal_bat: {
		type: 'Melee Weapon',
		name: 'metal_bat',
		icon: '<:U_melee:601366669251575857>',
		aliases: [],
		sellPrice: 74,
		durability: 4,
		slotsUsed: 1,
		fireRate: 15,
		accuracy: 75,
		damage: 13,
		penetration: 0.8,
		itemLevel: 3
	},
	metal_shank: {
		type: 'Melee Weapon',
		name: 'metal_shank',
		icon: '<:U_melee:601366669251575857>',
		aliases: ['shank'],
		sellPrice: 218,
		durability: 7,
		slotsUsed: 1,
		fireRate: 10,
		accuracy: 25,
		damage: 65,
		penetration: 1.9,
		itemLevel: 10
	},
	sledgehammer: {
		type: 'Melee Weapon',
		name: 'sledgehammer',
		icon: '<:U_melee:601366669251575857>',
		aliases: ['sledge'],
		sellPrice: 206,
		durability: 5,
		slotsUsed: 3,
		fireRate: 35,
		accuracy: 65,
		damage: 30,
		penetration: 0.75,
		itemLevel: 3
	},
	scythe: {
		type: 'Melee Weapon',
		name: 'scythe',
		icon: '<:U_melee:601366669251575857>',
		aliases: [],
		sellPrice: 63,
		durability: 2,
		slotsUsed: 2,
		fireRate: 30,
		accuracy: 70,
		damage: 20,
		penetration: 0.5,
		itemLevel: 2
	},
	pitchfork: {
		type: 'Melee Weapon',
		name: 'pitchfork',
		icon: '<:U_melee:601366669251575857>',
		aliases: ['pitch'],
		sellPrice: 88,
		durability: 3,
		slotsUsed: 2,
		fireRate: 25,
		accuracy: 65,
		damage: 15,
		penetration: 1.0,
		itemLevel: 3
	},
	fire_axe: {
		type: 'Melee Weapon',
		name: 'fire_axe',
		icon: '<:U_melee:601366669251575857>',
		aliases: ['axe'],
		sellPrice: 177,
		durability: 4,
		slotsUsed: 2,
		fireRate: 20,
		accuracy: 75,
		damage: 20,
		penetration: 1.2,
		itemLevel: 4
	},
	chainsaw: {
		type: 'Melee Weapon',
		name: 'chainsaw',
		icon: '<:U_melee:601366669251575857>',
		aliases: ['saw', 'chain'],
		sellPrice: 274,
		durability: 4,
		slotsUsed: 3,
		fireRate: 30,
		accuracy: 70,
		damage: 30,
		penetration: 1.45,
		itemLevel: 7
	},
	replica_katana: {
		type: 'Melee Weapon',
		name: 'replica_katana',
		icon: '<:U_melee:601366669251575857>',
		aliases: ['katana'],
		sellPrice: 88,
		durability: 2,
		slotsUsed: 1,
		fireRate: 25,
		accuracy: 70,
		damage: 25,
		penetration: 0.95,
		itemLevel: 8
	}
})
