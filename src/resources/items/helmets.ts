import { Helmet } from '../../types/Items'

const helmetObject = <T>(et: { [K in keyof T]: (Helmet) & { name: K } }) => et

export const items = helmetObject({
	paca_helmet: {
		type: 'Helmet',
		name: 'paca_helmet',
		icon: '<:U_shield:601366669474136074>',
		aliases: ['helmet'],
		sellPrice: 2000,
		durability: 3,
		level: 4,
		slotsUsed: 2
	}
})
