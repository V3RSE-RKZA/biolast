import { Ammunition } from '../../types/Items'
import { ranged } from './ranged'

const ammoObject = <T>(et: { [K in keyof T]: Ammunition & { name: K } }) => et

export const ammunition = ammoObject({
	'5.45x39_fmj_bullet': {
		type: 'Ammunition',
		name: '5.45x39_fmj_bullet',
		icon: '<:U_ammo:601366669318815745>',
		aliases: ['545', '545_rifle', '545x39', '545_fmj', '545_bullet', '5.45x39_fmj'],
		description: 'Full metal jacket 5.45x39mm ammunition for Kalashnikov rifles.',
		damage: 31,
		penetration: 2.2,
		ammoFor: [ranged['aks-74u']],
		sellPrice: 342,
		slotsUsed: 1,
		itemLevel: 7
	},
	'9mm_FMJ_bullet': {
		type: 'Ammunition',
		name: '9mm_FMJ_bullet',
		icon: '<:U_ammo:601366669318815745>',
		aliases: ['9x19', '9mm', '9mm_fmj'],
		description: 'Full metal jacket ammunition for 9mm weapons.',
		damage: 20,
		penetration: 2,
		ammoFor: [ranged['glock-17']],
		sellPrice: 158,
		slotsUsed: 1,
		itemLevel: 5
	},
	'9mm_hp_bullet': {
		type: 'Ammunition',
		name: '9mm_hp_bullet',
		icon: '<:U_ammo:601366669318815745>',
		aliases: ['9x19_hp', '9mm_hp'],
		description: 'Hollow point ammunition for 9mm weapons. Hollow point bullets expand when they hit their target, causing more damage.',
		damage: 30,
		penetration: 1.9,
		ammoFor: [ranged['glock-17']],
		sellPrice: 302,
		slotsUsed: 1,
		itemLevel: 8
	},
	'.22lr_bullet': {
		type: 'Ammunition',
		name: '.22lr_bullet',
		icon: '<:U_ammo:601366669318815745>',
		aliases: ['.22', '.22lr', 'rimfire', '.22_rimfire', '.22_bullet'],
		description: 'Small bullet used for .22 caliber weapons.',
		damage: 20,
		penetration: 1.5,
		ammoFor: [ranged.luger],
		sellPrice: 51,
		slotsUsed: 1,
		itemLevel: 3
	},
	'makeshift_pistol_bullet': {
		type: 'Ammunition',
		name: 'makeshift_pistol_bullet',
		icon: '<:U_ammo:601366669318815745>',
		aliases: ['makeshift_ammo', 'pistol_ammo', 'pistol_bullet'],
		description: 'A used pistol cartridge filled with homemade powder and a new bullet.',
		damage: 10,
		penetration: 0.9,
		ammoFor: [ranged.makeshift_pistol],
		sellPrice: 8,
		slotsUsed: 1,
		itemLevel: 1
	},
	'makeshift_rifle_bullet': {
		type: 'Ammunition',
		name: 'makeshift_rifle_bullet',
		icon: '<:U_ammo:601366669318815745>',
		aliases: ['rifle_ammo', 'rifle_bullet'],
		description: 'A used rifle cartridge filled with homemade powder and a new bullet.',
		damage: 15,
		penetration: 1.4,
		ammoFor: [ranged.makeshift_rifle],
		sellPrice: 32,
		slotsUsed: 1,
		itemLevel: 3
	},
	'makeshift_shell': {
		type: 'Ammunition',
		name: 'makeshift_shell',
		icon: '<:U_ammo:601366669318815745>',
		aliases: ['shell'],
		description: 'A handmade shotgun shell filled with cheap gunpowder and pellets.',
		damage: 13,
		penetration: 1.5,
		ammoFor: [ranged.makeshift_shotgun],
		sellPrice: 34,
		slotsUsed: 1,
		itemLevel: 3
	},
	'.303_fmj_bullet': {
		type: 'Ammunition',
		name: '.303_fmj_bullet',
		icon: '<:U_ammo:601366669318815745>',
		aliases: ['.303', '.303_fmj', '.303_bullet'],
		description: 'Full metal jacket ammo for a lee-enfield.',
		damage: 45,
		penetration: 3,
		ammoFor: [ranged['lee-enfield']],
		sellPrice: 502,
		slotsUsed: 1,
		itemLevel: 6
	},
	'20_gauge_shell': {
		type: 'Ammunition',
		name: '20_gauge_shell',
		icon: '<:U_ammo:601366669318815745>',
		aliases: ['20g_shell', '20g_shotgun'],
		description: 'The 20-gauge shell, also known as 20-bore, is a shell that is smaller in caliber than a 12-gauge.',
		damage: 50,
		penetration: 2.5,
		ammoFor: [ranged.bobwhite_g2],
		sellPrice: 415,
		slotsUsed: 1,
		itemLevel: 8
	}
})
