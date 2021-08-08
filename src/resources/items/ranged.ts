import { RangedWeapon } from '../../types/Items'

const rangedObject = <T>(et: { [K in keyof T]: RangedWeapon & { name: K } }) => et

export const items = rangedObject({
	'aks-74u': {
		type: 'Ranged Weapon',
		name: 'aks-74u',
		icon: '<:U_rifle:869647344344387624>',
		aliases: ['aks', 'ak-74'],
		sellPrice: 10000,
		durability: 12,
		slotsUsed: 2,
		fireRate: 60,
		accuracy: 40
	},
	'glock-17': {
		type: 'Ranged Weapon',
		name: 'glock-17',
		icon: '<:U_weapon:601366669272678411>',
		aliases: ['glock'],
		sellPrice: 10000,
		durability: 10,
		slotsUsed: 2,
		fireRate: 60,
		accuracy: 30
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
		accuracy: 10
	},
	'makeshift_rifle': {
		type: 'Ranged Weapon',
		name: 'makeshift_rifle',
		icon: '<:U_rifle:869647344344387624>',
		aliases: ['makeshift', 'rifle'],
		description: 'I\'d be more worried about the person firing this weapon than the target.',
		sellPrice: 800,
		durability: 6,
		slotsUsed: 2,
		fireRate: 80,
		accuracy: 14
	}
})
