import { ExplosiveWeapon } from '../../types/Items'

const explosivesObject = <T>(et: { [K in keyof T]: ExplosiveWeapon & { name: K } }) => et

export const explosives = explosivesObject({
	grenade: {
		type: 'Explosive Weapon',
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
