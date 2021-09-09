import { Key } from '../../types/Items'

const keysObject = <T>(et: { [K in keyof T]: Key & { name: K } }) => et

export const items = keysObject({
	shed_key: {
		type: 'Key',
		name: 'shed_key',
		durability: 3,
		aliases: [],
		icon: '<:U_key:870786870852874260>',
		slotsUsed: 3,
		itemLevel: 1
	},
	warehouse_key: {
		type: 'Key',
		name: 'warehouse_key',
		durability: 3,
		aliases: ['wh_key', 'warehouse'],
		icon: '<:U_key:870786870852874260>',
		slotsUsed: 3,
		itemLevel: 3
	},
	truck_key: {
		type: 'Key',
		name: 'truck_key',
		durability: 1,
		aliases: ['truck'],
		icon: '<:U_key:870786870852874260>',
		slotsUsed: 2,
		itemLevel: 3
	}
})
