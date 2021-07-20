import { RangedWeapon } from '../../types/Items'

const rangedObject = <T>(et: { [K in keyof T]: RangedWeapon & { name: K } }) => et

export const items = rangedObject({
	ak47: {
		type: 'Ranged Weapon',
		name: 'ak47',
		icon: '<:U_weapon:601366669272678411>',
		aliases: ['ak'],
		sellPrice: 10000,
		durability: 7,
		slotsUsed: 2,
		fireRate: 60,
		accuracy: 50
	}
})
