import { Ammunition } from '../../types/Items'

const ammoObject = <T>(et: { [K in keyof T]: Ammunition & { name: K } }) => et

export const items = ammoObject({
	'7.62x54r_lps': {
		type: 'Ammunition',
		name: '7.62x54r_lps',
		icon: '<:U_ammo:601366669318815745>',
		aliases: ['762x54', 'lps_gzh'],
		damage: 50,
		penetration: 2.79,
		ammoFor: ['ak47'],
		sellPrice: 3000,
		slotsUsed: 1
	},
	'7.62x51': {
		type: 'Ammunition',
		name: '7.62x51',
		icon: '<:U_ammo:601366669318815745>',
		aliases: ['762x51', '7.62'],
		damage: 60,
		penetration: 2,
		ammoFor: ['ak47'],
		sellPrice: 3000,
		slotsUsed: 1
	}
})
