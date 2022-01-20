import { Key } from '../../types/Items'

const keysObject = <T>(et: { [K in keyof T]: Key & { name: K } }) => et

export const keys = keysObject({
	shed_key: {
		type: 'Key',
		name: 'shed_key',
		durability: 2,
		aliases: [],
		icon: '<:shed_key:933852925518815232>',
		slotsUsed: 2,
		itemLevel: 1,
		artist: '719365897458024558'
	},
	gunsafe_code: {
		type: 'Key',
		name: 'gunsafe_code',
		durability: 1,
		aliases: ['gunsafe'],
		icon: '<:U_key:870786870852874260>',
		slotsUsed: 1,
		itemLevel: 8
	},
	daves_drug_key: {
		type: 'Key',
		name: 'daves_drug_key',
		durability: 1,
		aliases: ['drug_key', 'daves_key'],
		icon: '<:daves_drug_key:933852925514633296>',
		slotsUsed: 1,
		itemLevel: 8,
		artist: '719365897458024558'
	},
	dereks_shop_key: {
		type: 'Key',
		name: 'dereks_shop_key',
		durability: 2,
		aliases: ['dereks_key'],
		icon: '<:dereks_shop_key:933852925489479710>',
		slotsUsed: 2,
		itemLevel: 10,
		artist: '719365897458024558'
	},
	florreds_pharmacy_key: {
		type: 'Key',
		name: 'florreds_pharmacy_key',
		durability: 2,
		aliases: ['florreds_key', 'pharmacy_key'],
		icon: '<:florreds_pharmacy_key:933852925158129685>',
		slotsUsed: 2,
		itemLevel: 10,
		artist: '719365897458024558'
	}
})
