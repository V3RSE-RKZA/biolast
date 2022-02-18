import { Collectible, Item } from '../types/Items'
import { items } from './items'

interface MoneyTrade {
	type: 'money'
	offer: {
		item: Item
		amount: number
	}
	price: number
}
interface CollectibleTrade {
	type: 'collectible'
	offer: {
		item: Item
		amount: number
	}
	price: Collectible
}

export type MerchantTrade = (MoneyTrade | CollectibleTrade) & {
	/**
	 * The region tier this trade unlocks at (1 = the suburbs), there could potentially be two regions for a locationLevel
	 */
	locationLevel: number
}

export const merchantTrades: MerchantTrade[] = [
	{
		type: 'money',
		offer: {
			item: items['glock-17'],
			amount: 1
		},
		price: 2000,
		locationLevel: 3
	},
	{
		type: 'money',
		offer: {
			item: items['9mm_HP_bullet'],
			amount: 2
		},
		price: 2000,
		locationLevel: 3
	},
	{
		type: 'money',
		offer: {
			item: items.bandage,
			amount: 1
		},
		price: 200,
		locationLevel: 1
	},
	{
		type: 'money',
		offer: {
			item: items.splint,
			amount: 1
		},
		price: 400,
		locationLevel: 1
	},
	{
		type: 'money',
		offer: {
			item: items['anti-biotics'],
			amount: 1
		},
		price: 1000,
		locationLevel: 2
	},
	{
		type: 'money',
		offer: {
			item: items['9mm_FMJ_bullet'],
			amount: 1
		},
		price: 3000,
		locationLevel: 4
	},
	{
		type: 'collectible',
		offer: {
			item: items.luger,
			amount: 1
		},
		price: items.walker_goop,
		locationLevel: 1
	},
	{
		type: 'collectible',
		offer: {
			item: items['.22LR_bullet'],
			amount: 1
		},
		price: items.walker_goop,
		locationLevel: 1
	},
	{
		type: 'collectible',
		offer: {
			item: items.wooden_helmet,
			amount: 1
		},
		price: items.farming_guide,
		locationLevel: 2
	},
	{
		type: 'collectible',
		offer: {
			item: items.wooden_armor,
			amount: 1
		},
		price: items.farming_guide,
		locationLevel: 2
	},
	{
		type: 'money',
		offer: {
			item: items.duffle_bag,
			amount: 1
		},
		price: 8500,
		locationLevel: 4
	},
	{
		type: 'collectible',
		offer: {
			item: items.aramid_armor,
			amount: 1
		},
		price: items.tech_trash,
		locationLevel: 4
	},
	{
		type: 'collectible',
		offer: {
			item: items.aramid_helmet,
			amount: 1
		},
		price: items.escape_from_fristoe,
		locationLevel: 4
	},
	{
		type: 'collectible',
		offer: {
			item: items.swat_armor,
			amount: 1
		},
		price: items.gold_watch,
		locationLevel: 5
	},
	{
		type: 'collectible',
		offer: {
			item: items.swat_helmet,
			amount: 1
		},
		price: items.gold_watch,
		locationLevel: 5
	},
	{
		type: 'money',
		offer: {
			item: items.suitcase,
			amount: 1
		},
		price: 50000,
		locationLevel: 5
	},
	{
		type: 'money',
		offer: {
			item: items.FN_P90,
			amount: 1
		},
		price: 25000,
		locationLevel: 5
	},
	{
		type: 'money',
		offer: {
			item: items.SS195LF_bullet,
			amount: 2
		},
		price: 10000,
		locationLevel: 5
	}
]
