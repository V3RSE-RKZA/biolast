import { Ammunition } from '../../types/Items'
import { items as ranged } from './ranged'

const ammoObject = <T>(et: { [K in keyof T]: Ammunition & { name: K } }) => et

export const items = ammoObject({
	'5.45x39_fmj': {
		type: 'Ammunition',
		name: '5.45x39_fmj',
		icon: '<:U_ammo:601366669318815745>',
		aliases: ['545', '545_rifle', '545x39', '545_fmj', '545_bullet'],
		description: 'Full metal jacket 5.45x39mm ammunition for Kalashnikov rifles.',
		damage: 20,
		penetration: 2,
		ammoFor: [ranged['aks-74u']],
		sellPrice: 3000,
		slotsUsed: 1
	},
	'9mm_fmj': {
		type: 'Ammunition',
		name: '9mm_fmj',
		icon: '<:U_ammo:601366669318815745>',
		aliases: ['9x19', '9mm'],
		description: 'Full metal jacket ammunition for 9mm handguns.',
		damage: 20,
		penetration: 1.5,
		ammoFor: [ranged['glock-17']],
		sellPrice: 750,
		slotsUsed: 1
	},
	'makeshift_pistol_ammo': {
		type: 'Ammunition',
		name: 'makeshift_pistol_ammo',
		icon: '<:U_ammo:601366669318815745>',
		aliases: ['makeshift_ammo', 'pistol_ammo', 'pistol_bullet'],
		description: 'A used pistol cartridge filled with homemade powder and a new bullet.',
		damage: 10,
		penetration: 0.9,
		ammoFor: [ranged.makeshift_pistol],
		sellPrice: 250,
		slotsUsed: 1
	},
	'makeshift_rifle_ammo': {
		type: 'Ammunition',
		name: 'makeshift_rifle_ammo',
		icon: '<:U_ammo:601366669318815745>',
		aliases: ['rifle_ammo', 'rifle_bullet'],
		description: 'A used rifle cartridge filled with homemade powder and a new bullet.',
		damage: 15,
		penetration: 1.4,
		ammoFor: [ranged.makeshift_rifle],
		sellPrice: 450,
		slotsUsed: 1
	},
	'makeshift_shell': {
		type: 'Ammunition',
		name: 'makeshift_shell',
		icon: '<:U_ammo:601366669318815745>',
		aliases: ['shell', 'makeshift'],
		description: 'A handmade shotgun shell filled with cheap gunpowder and pellets.',
		damage: 13,
		penetration: 1.1,
		ammoFor: [ranged.makeshift_shotgun],
		sellPrice: 500,
		slotsUsed: 1
	},
	'.303_fmj': {
		type: 'Ammunition',
		name: '.303_fmj',
		icon: '<:U_ammo:601366669318815745>',
		aliases: ['.303'],
		description: 'Full metal jacket ammo for a lee-enfield.',
		damage: 45,
		penetration: 4.5,
		ammoFor: [ranged['lee-enfield']],
		sellPrice: 1100,
		slotsUsed: 1
	}
})
