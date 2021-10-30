import { ThrowableWeapon } from '../../types/Items'

const throwablesObject = <T>(et: { [K in keyof T]: ThrowableWeapon & { name: K } }) => et

export const throwables = throwablesObject({
	grenade: {
		type: 'Throwable Weapon',
		subtype: 'Fragmentation Grenade',
		name: 'grenade',
		icon: '<:U_melee:601366669251575857>',
		aliases: [],
		sellPrice: 476,
		durability: 1,
		slotsUsed: 1,
		fireRate: 30,
		accuracy: 50,
		damage: 54,
		penetration: 1.7,
		itemLevel: 8,
		spreadsDamageToLimbs: 3
	}
})
