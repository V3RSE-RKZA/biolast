import { QueryOptions } from 'mysql'

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
	stashSlots: number
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
}

export interface ItemRow {
	id: number
	item: string
	durability?: number
}

export interface BackpackItemRow extends ItemRow {
	equipped: 0 | 1
}

export interface GroundItemRow extends ItemRow {
	createdAt: Date
}
