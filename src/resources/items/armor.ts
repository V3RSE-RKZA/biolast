import { Armor, Helmet } from '../../types/Items'

const armorObject = <T>(et: { [K in keyof T]: Armor | Helmet }) => et

export const items = armorObject({
	paca_armor: {
		type: 'Armor',
		name: 'paca_armor',
		icon: '<:U_shield:601366669474136074>',
		aliases: ['paca'],
		sellPrice: 2000,
		durability: 3,
		level: 4,
		slotsUsed: 2
	}
})
