import { ThrowableWeapon } from '../../types/Items'

const throwablesObject = <T>(et: { [K in keyof T]: ThrowableWeapon & { name: K } }) => et

export const throwables = throwablesObject({
	F1_grenade: {
		type: 'Throwable Weapon',
		subtype: 'Fragmentation Grenade',
		name: 'F1_grenade',
		icon: ' <:f1_grenade:933851376738500640>',
		aliases: ['f1', 'grenade'],
		sellPrice: 476,
		durability: 1,
		slotsUsed: 1,
		accuracy: 50,
		damage: 54,
		penetration: 1.7,
		itemLevel: 8,
		spreadsDamageToLimbs: 3,
		speed: 6,
		artist: '719365897458024558'
	},
	M67_grenade: {
		type: 'Throwable Weapon',
		subtype: 'Fragmentation Grenade',
		name: 'M67_grenade',
		icon: '<:m67_grenade:933857769990287380>',
		aliases: ['m67'],
		sellPrice: 2025,
		durability: 1,
		slotsUsed: 1,
		accuracy: 74,
		damage: 57,
		penetration: 3.1,
		itemLevel: 12,
		spreadsDamageToLimbs: 3,
		speed: 5,
		artist: '719365897458024558'
	},
	molotov_cocktail: {
		type: 'Throwable Weapon',
		subtype: 'Incendiary Grenade',
		name: 'molotov_cocktail',
		icon: '<:molotov_cocktail:933852261782782002>',
		description: 'Improvised incendiary grenade.',
		aliases: ['molotov', 'cocktail', 'molly'],
		sellPrice: 1205,
		durability: 1,
		slotsUsed: 1,
		accuracy: 74,
		damage: 35,
		penetration: 2.5,
		itemLevel: 9,
		spreadsDamageToLimbs: 2,
		speed: 4,
		artist: '699166377705078794'
	}
})
