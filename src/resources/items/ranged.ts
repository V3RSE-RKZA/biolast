import { RangedWeapon } from '../../types/Items'

const rangedObject = <T>(et: { [K in keyof T]: RangedWeapon & { name: K } }) => et

export const items = rangedObject({
	'aks-74u': {
		type: 'Ranged Weapon',
		name: 'aks-74u',
		icon: '<:U_rifle:869647344344387624>',
		aliases: ['aks', 'ak-74'],
		sellPrice: 6000,
		durability: 12,
		slotsUsed: 3,
		fireRate: 40,
		accuracy: 35,
		itemLevel: 5
	},
	'glock-17': {
		type: 'Ranged Weapon',
		name: 'glock-17',
		icon: '<:U_weapon:601366669272678411>',
		aliases: ['glock'],
		sellPrice: 5000,
		durability: 10,
		slotsUsed: 2,
		fireRate: 35,
		accuracy: 30,
		itemLevel: 3
	},
	'makeshift_pistol': {
		type: 'Ranged Weapon',
		name: 'makeshift_pistol',
		icon: '<:U_weapon:601366669272678411>',
		aliases: ['makeshift', 'pistol'],
		description: 'Looks like it\'s being held together with some duct tape and glue.',
		sellPrice: 500,
		durability: 5,
		slotsUsed: 1,
		fireRate: 60,
		accuracy: 10,
		itemLevel: 1
	},
	'makeshift_rifle': {
		type: 'Ranged Weapon',
		name: 'makeshift_rifle',
		icon: '<:U_rifle:869647344344387624>',
		aliases: ['makeshift', 'rifle'],
		description: 'I\'d be more worried about the person firing this weapon than the target.',
		sellPrice: 700,
		durability: 6,
		slotsUsed: 2,
		fireRate: 45,
		accuracy: 14,
		itemLevel: 3
	},
	'makeshift_shotgun': {
		type: 'Ranged Weapon',
		name: 'makeshift_shotgun',
		icon: '<:U_weapon:601366669272678411>',
		aliases: ['shotgun', 'shotty'],
		description: 'A handmade shotgun that looks like it could break apart at any moment.',
		sellPrice: 850,
		durability: 3,
		slotsUsed: 2,
		fireRate: 60,
		accuracy: 20,
		itemLevel: 3
	},
	'lee-enfield': {
		type: 'Ranged Weapon',
		name: 'lee-enfield',
		icon: '<:U_rifle:869647344344387624> ',
		aliases: ['lee', 'enfield'],
		description: 'An ex-military sniper used in WWII.',
		sellPrice: 3500,
		durability: 9,
		slotsUsed: 3,
		fireRate: 120,
		accuracy: 30,
		itemLevel: 6
	},
	'bobwhite_g2': {
		type: 'Ranged Weapon',
		name: 'bobwhite_g2',
		icon: '<:U_weapon:601366669272678411>',
		aliases: ['coach', 'shotty', 'supreme'],
		description: 'A double barrel shotgun manufactured by E.R. Amantino in Veranópolis, Brazil.',
		sellPrice: 7500,
		durability: 8,
		slotsUsed: 3,
		fireRate: 80,
		accuracy: 40,
		itemLevel: 6
	}
})
