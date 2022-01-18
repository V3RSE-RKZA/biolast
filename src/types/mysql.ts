import { QueryOptions } from 'mysql'
import { QuestType } from './Quests'
import { Item } from './Items'
import { ItemSkin } from '../resources/skins'
import { LocationLevel } from './Locations'

export type Query = (sql: string | QueryOptions, args?: any[]) => Promise<any>

export interface Transaction {
	query: Query
	commit(): Promise<string>
}

export interface UserRow {
	userId: string
	createdAt: Date
	money: number
	health: number
	maxHealth: number
	stashSlots: number
	level: number
	xp: number

	/**
	 * How many items this user has bought from the shop (resets every day)
	 */
	shopSales: number

	/**
	 * Number of player kills this user has
	 */
	kills: number

	npcKills: number
	bossKills: number
	deaths: number
	questsCompleted: number
	fighting: 0 | 1

	/**
	 * The max location level this user has achieved,
	 * allows them to travel to locations of equal or lower locationLevel
	 */
	locationLevel: LocationLevel

	/**
	 * The id of the location user is currently located at
	 */
	currentLocation: string
}

export interface Cooldown {
	id: string
	createdAt: Date
	type: string
	length: number
}

export interface ActiveRaid {
	userId: string
	guildId: string
	startedAt: Date
	length: number
	invite: string
}

export interface ItemRow {
	id: number
	item: string
	durability?: number
	displayName?: string

	/**
	 * The date the item was originally created at
	 */
	itemCreatedAt: Date

	/**
	 * The name of the skin equipped to this item
	 */
	skin?: string
}

export interface BackpackItemRow extends ItemRow {
	/**
	 * Whether the user currently has this item equipped
	 */
	equipped: 0 | 1
}

export interface ShopItemRow extends ItemRow {
	/**
	 * The date this item was added to shop
	 */
	createdAt: Date
	price: number
}

export interface AttachmentItemRow extends ItemRow {
	/**
	 * The id of the weapon this item is attached to
	 */
	weaponId: number
}

export type ItemWithRow<T extends ItemRow, I extends Item = Item> = { item: I, row: T }

export interface SkinRow {
	id: number
	userId: string
	skin: string

	/**
	 * The date the skin was originally created at
	 */
	skinCreatedAt: Date
}

export type SkinWithRow = { skin: ItemSkin, row: SkinRow }

export interface QuestRow {
	userId: string
	questType: QuestType
	questId: string
	progress: number
	progressGoal: number
	xpReward: number
	itemReward?: string
	moneyReward?: number
	createdAt: Date
}

export interface CompanionRow {
	ownerId: string
	type: string
	name?: string
	xp: number
	level: number
	stress: number
	hunger: number
	fetches: number
	fetching: 0 | 1
	createdAt: Date
}
