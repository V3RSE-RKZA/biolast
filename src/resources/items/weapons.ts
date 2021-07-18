import { Weapon } from '../../types/Items'

const weaponsObject = <T>(et: { [K in keyof T]: Weapon & { name: K } }) => et

export const items = weaponsObject({
	ak47: {
		type: 'Weapon',
		subtype: 'Ranged',
		name: 'ak47',
		icon: '<:U_weapon:601366669272678411>',
		aliases: ['ak'],
		sellPrice: 10000,
		durability: 7,
		slotsUsed: 2,
		fireRate: 60,
		accuracy: 80
	},
	knife: {
		type: 'Weapon',
		subtype: 'Melee',
		name: 'knife',
		icon: '<:U_weapon:601366669272678411>',
		aliases: [],
		sellPrice: 2000,
		durability: 3,
		slotsUsed: 1,
		fireRate: 10,
		accuracy: 35,
		damage: 30
	}
})
