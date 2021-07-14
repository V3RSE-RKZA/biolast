import { ItemRow, BackpackItemRow } from '../types/mysql'
import { Item, items, Backpack, Helmet, Armor, Weapon, Ammunition } from '../resources/items'
import { baseBackpackLimit } from '../config'

/**
 * Returns the amount of slots the items are taking up and the item data given rows of items
 * @param itemRows Rows of items, can be rows of ground items, stash items, or backpack items
 * @returns The itemRows along with the item data
 */
export function getItems (itemRows: ItemRow[]): { items: { row: ItemRow, item: Item }[], slotsUsed: number } {
	const inventory = []
	let slotsUsed = 0

	for (const row of itemRows) {
		const item = items.find(i => i.name === row.item)

		if (item) {
			slotsUsed += item.slotsUsed
			inventory.push({ row, item })
		}
	}

	return {
		items: inventory,
		slotsUsed
	}
}

/**
 *
 * @param backpackRows
 * @returns The backpack, helmet, armor, and weapon user has equipped
 */
export function getEquips (backpackRows: BackpackItemRow[]): {
	backpack?: { item: Backpack, row: BackpackItemRow }
	helmet?: { item: Helmet, row: BackpackItemRow & { durability: number } }
	armor?: { item: Armor, row: BackpackItemRow & { durability: number } }
	weapon?: { item: Weapon, row: BackpackItemRow & { durability: number } }
} {
	let backpack
	let helmet
	let armor
	let weapon

	for (const row of backpackRows) {
		const item = items.find(i => i.name === row.item)

		if (item && row.equipped) {
			switch (item.type) {
				case 'Backpack': backpack = { item, row }; break
				case 'Helmet': helmet = { item, row: row as BackpackItemRow & { durability: number } }; break
				case 'Armor': armor = { item, row: row as BackpackItemRow & { durability: number } }; break
				case 'Weapon': weapon = { item, row: row as BackpackItemRow & { durability: number } }; break
			}
		}
	}

	return {
		backpack,
		helmet,
		armor,
		weapon
	}
}

export function getBackpackLimit (backpack?: Backpack): number {
	return backpack ? backpack.slots + baseBackpackLimit : baseBackpackLimit
}

/**
 *
 * @param ammos Array of ammo to sort
 * @returns Array of ammo sorted from highest damage to lowest
 */
export function sortAmmoByDamage (ammos: Ammunition[]): Ammunition[] {
	return ammos.sort((a, b) => b.damage - a.damage)
}
