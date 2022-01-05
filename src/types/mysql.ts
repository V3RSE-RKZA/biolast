import { QueryOptions } from 'mysql'
import { QuestType } from './Quests'
import { Item } from './Items'

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
	locationLevel: number

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
}

export interface BackpackItemRow extends ItemRow {
	/**
	 * Whether the user currently has this item equipped
	 */
	equipped: 0 | 1
}

export interface GroundItemRow extends ItemRow {
	/**
	 * The date this item was added to ground
	 */
	createdAt: Date
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

export interface NPCRow {
	channelId: string
	createdAt: Date
	id: string
	health: number
}

export interface QuestRow {
	id: number
	userId: string
	questType: QuestType
	questId: string
	progress: number
	progressGoal: number
	itemReward?: string
	xpReward?: number
	moneyReward?: number
	sideQuest: 0 | 1
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
