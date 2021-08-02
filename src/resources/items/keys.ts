import { Key } from '../../types/Items'

const keysObject = <T>(et: { [K in keyof T]: Key & { name: K } }) => et

export const items = keysObject({
	shed_key: {
		type: 'Key',
		name: 'shed_key',
		durability: 3,
		aliases: [],
		icon: '<:U_key:870786870852874260>',
		slotsUsed: 1
	}
})
