import { MeleeWeapon } from '../../types/Items'

const meleeObject = <T>(et: { [K in keyof T]: MeleeWeapon & { name: K } }) => et

export const items = meleeObject({
	knife: {
		type: 'Melee Weapon',
		name: 'knife',
		icon: '<:U_weapon:601366669272678411>',
		aliases: [],
		sellPrice: 2000,
		durability: 3,
		slotsUsed: 1,
		fireRate: 10,
		accuracy: 35,
		damage: 30,
		penetration: 0.5
	}
})
