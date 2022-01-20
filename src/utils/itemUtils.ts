import { ItemRow, BackpackItemRow, ItemWithRow } from '../types/mysql'
import { allItems } from '../resources/items'
import { baseBackpackLimit } from '../config'
import { Ammunition, Armor, Backpack, Helmet, Item } from '../types/Items'
import { skins } from '../resources/skins'

function instanceOfBackpackRow (itemRow: ItemRow | BackpackItemRow): itemRow is BackpackItemRow {
	return 'equipped' in itemRow
}

/**
 * Returns the amount of slots the items are taking up and the item data given rows of items
 * @param itemRows Rows of items, can be rows of shop items, stash items, or backpack items
 * @returns The itemRows along with the item data
 */
export function getItems<T extends ItemRow> (itemRows: T[]): { items: ItemWithRow<T>[], slotsUsed: number } {
	const inventory = []
	let slotsUsed = 0

	for (const row of itemRows) {
		let item = allItems.find(i => i.name === row.item)

		if (item) {
			const skin = row.skin && skins.find(s => s.name === row.skin)
			slotsUsed += item.slotsUsed

			if (skin) {
				item = Object.assign({}, item, { icon: skin.icon })
			}

			inventory.push({ row, item })
		}
	}

	return {
		items: inventory,
		slotsUsed: Math.round(slotsUsed * 10) / 10
	}
}

/**
 * Gets display name for item
 * @param item Item object
 * @param itemRow Row of the item
 * @param options Option for the display
 * @param options.showDisplayName Show the display name of this item
 */
export function getItemNameDisplay (item: Item, itemRow?: ItemRow, options: Partial<{ showDisplayName: boolean }> = {}): string {
	const { showDisplayName = true } = options

	return showDisplayName && itemRow?.displayName ? itemRow.displayName : item.name.replace(/_/g, ' ')
}

/**
 * Get the string form of an item
 * @param item Item to display as string
 * @param itemRow The row of the item
 * @param options Options for the display
 * @param options.showEquipped Show whether or not this item is equipped, defaults true
 * @param options.showID Show the ID of this item, defaults true
 * @param options.showDurability Show the durability of this item, defaults true
 * @param options.showDisplayName Shows the custom display name of this item, defaults true
 */
export function getItemDisplay (item: Item, itemRow?: ItemRow, options: Partial<{ showEquipped: boolean, showID: boolean, showDurability: boolean, showDisplayName: boolean }> = {}): string {
	const { showEquipped = true, showID = true, showDurability = true, showDisplayName = true } = options
	let icon = item.icon

	if (itemRow && itemRow.skin !== undefined) {
		const skin = skins.find(s => s.name === itemRow.skin)

		if (skin) {
			icon = skin.icon
		}
	}

	if (itemRow) {
		const attributes = []
		const display = `${icon}\`${getItemNameDisplay(item, itemRow, { showDisplayName })}\``

		if (showDurability && itemRow.durability) {
			attributes.push(`**${itemRow.durability}** uses left`)
		}

		if (showEquipped && instanceOfBackpackRow(itemRow) && itemRow.equipped) {
			attributes.push('🧤 equipped')
		}

		if (showID) {
			return `[\`${itemRow.id}\`] ${display}${attributes.length ? ` (${attributes.join(', ')})` : ''}`
		}

		return `${display}${attributes.length ? ` (${attributes.join(', ')})` : ''}`
	}

	return `${icon}\`${getItemNameDisplay(item)}\``
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
} {
	let backpack
	let helmet
	let armor

	for (const row of backpackRows) {
		const item = allItems.find(i => i.name === row.item)

		if (item && row.equipped) {
			switch (item.type) {
				case 'Backpack': backpack = { item, row }; break
				case 'Helmet': helmet = { item, row: row as BackpackItemRow & { durability: number } }; break
				case 'Body Armor': armor = { item, row: row as BackpackItemRow & { durability: number } }; break
			}
		}
	}

	return {
		backpack,
		helmet,
		armor
	}
}

/**
 * @param backpackRows The users backpack inventory
 * @param slotsNeeded How many slots are needed
 * @param slotsBonus Bonus slots to be counted towards inventory space (for things like stimulants that add temporary slot increase)
 * @returns Whether or not the backpack has room for the slots
 */
export function backpackHasSpace (backpackRows: BackpackItemRow[], slotsNeeded: number, slotsBonus?: number): boolean {
	const userBackpackData = getItems(backpackRows)
	const equips = getEquips(backpackRows)

	return slotsNeeded === 0 ?
		userBackpackData.slotsUsed + slotsNeeded < getBackpackLimit(equips.backpack?.item, slotsBonus) :
		userBackpackData.slotsUsed + slotsNeeded <= getBackpackLimit(equips.backpack?.item, slotsBonus)
}

/**
 * @param backpack The backpack item user has equipped
 * @param slotsBonus Bonus slots to be counted towards inventory space (for things like stimulants that add temporary slot increase)
 * @returns Number of inventory slots
 */
export function getBackpackLimit (backpack?: Backpack, slotsBonus?: number): number {
	return (backpack ? backpack.slots + baseBackpackLimit : baseBackpackLimit) + (slotsBonus || 0)
}

/**
 * @param item Item to get price of
 * @param itemRow Row of the item (durability can affect the item price)
 * @returns Value of item
 */
export function getItemPrice (item: Item, itemRow: ItemRow): number {
	if (!item.sellPrice) {
		return 0
	}
	else if (item.durability && itemRow.durability) {
		return Math.floor((itemRow.durability / item.durability) * item.sellPrice)
	}

	return item.sellPrice
}

/**
 *
 * @param ammos Array of ammo to sort
 * @returns Array of ammo sorted from highest damage to lowest
 */
export function sortAmmoByDamage (ammos: Ammunition[]): Ammunition[] {
	return ammos.sort((a, b) => b.damage - a.damage)
}

// why is it typed like this??? so I can sort an array of just items or an array of items + item rows
/**
 * Sorts an array of items from highest durability to lowest, or by name if durability is the same
 * @param arr Array of items or items with rows, if its an array of items with rows, containsRows must be true
 * @param containsRows Whether or not the function is sorting items with rows
 */
export function sortItemsByDurability (arr: Item[], containsRows?: false): Item[]
export function sortItemsByDurability<T extends ItemRow> (arr: ItemWithRow<T>[], containsRows: true): ItemWithRow<T>[]
export function sortItemsByDurability (arr: (Item | ItemWithRow<ItemRow>)[], containsRows?: boolean): (Item | ItemWithRow<ItemRow>)[] {
	if (containsRows) {
		return (arr as ItemWithRow<ItemRow>[]).sort((a, b) => {
			const aDurability = a.row.durability || 0
			const bDurability = b.row.durability || 0

			if (bDurability < aDurability) {
				return -1
			}
			else if (bDurability > aDurability) {
				return 1
			}
			else if (b.item.name > a.item.name) {
				return -1
			}
			else if (b.item.name < a.item.name) {
				return 1
			}

			// durability is same, item name is same
			return 0
		})
	}

	return (arr as Item[]).sort((a, b) => {
		const aDurability = a.durability || 0
		const bDurability = b.durability || 0

		if (bDurability < aDurability) {
			return -1
		}
		else if (bDurability > aDurability) {
			return 1
		}
		else if (b.name > a.name) {
			return -1
		}
		else if (b.name < a.name) {
			return 1
		}

		// durability is same, item name is same
		return 0
	})
}

/**
 * Sorts an array of items from ammo with highest armor penetration to ammo with lowest penetration, if penetration is same then it sorts from highest damage to least damage
 * @param arr Array of items or items with rows, if its an array of items with rows, containsRows must be true
 * @param containsRows Whether or not the function is sorting items with rows
 */
export function sortItemsByAmmo (arr: Item[], containsRows?: false): Item[]
export function sortItemsByAmmo<T extends ItemRow> (arr: ItemWithRow<T>[], containsRows: true): ItemWithRow<T>[]
export function sortItemsByAmmo (arr: (Item | ItemWithRow<ItemRow>)[], containsRows?: boolean): (Item | ItemWithRow<ItemRow>)[] {
	if (containsRows) {
		return (arr as ItemWithRow<ItemRow>[]).sort((a, b) => {
			let aPenetration = 0
			let aDamage = 0
			let bPenetration = 0
			let bDamage = 0

			if (a.item.type === 'Ammunition') {
				aPenetration = a.item.penetration
				aDamage = a.item.damage
			}
			if (b.item.type === 'Ammunition') {
				bPenetration = b.item.penetration
				bDamage = b.item.damage
			}

			if (bPenetration < aPenetration) {
				return -1
			}
			else if (bPenetration > aPenetration) {
				return 1
			}
			else if (bDamage < aDamage) {
				return -1
			}
			else if (bDamage > aDamage) {
				return 1
			}

			// items are both not ammunition
			return 0
		})
	}

	return (arr as Item[]).sort((a, b) => {
		let aItemLevel = 0
		let bItemLevel = 0

		if (a.type === 'Ammunition') {
			aItemLevel = a.itemLevel
		}
		if (b.type === 'Ammunition') {
			bItemLevel = b.itemLevel
		}

		if (bItemLevel < aItemLevel) {
			return -1
		}
		else if (bItemLevel > aItemLevel) {
			return 1
		}

		// items are both not ammunition
		return 0
	})
}

/**
 * Sorts an array of items by their name a-z
 * @param arr Array of items or items with rows, if its an array of items with rows, containsRows must be true
 * @param containsRows Whether or not the function is sorting items with rows
 */
export function sortItemsByName (arr: Item[], containsRows?: false): Item[]
export function sortItemsByName<T extends ItemRow> (arr: ItemWithRow<T>[], containsRows: true): ItemWithRow<T>[]
export function sortItemsByName (arr: (Item | ItemWithRow<ItemRow>)[], containsRows?: boolean): (Item | ItemWithRow<ItemRow>)[] {
	if (containsRows) {
		return (arr as ItemWithRow<ItemRow>[]).sort((a, b) => a.item.name.localeCompare(b.item.name))
	}

	return (arr as Item[]).sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Sorts an array of items by their value DESCENDING
 * @param arr Array of items or items with rows, if its an array of items with rows, containsRows must be true
 * @param containsRows Whether or not the function is sorting items with rows
 */
export function sortItemsByValue (arr: Item[], containsRows?: false): Item[]
export function sortItemsByValue<T extends ItemRow> (arr: ItemWithRow<T>[], containsRows: true): ItemWithRow<T>[]
export function sortItemsByValue (arr: (Item | ItemWithRow<ItemRow>)[], containsRows?: boolean): (Item | ItemWithRow<ItemRow>)[] {
	if (containsRows) {
		return (arr as ItemWithRow<ItemRow>[]).sort((a, b) => getItemPrice(b.item, b.row) - getItemPrice(a.item, a.row))
	}

	return (arr as Item[]).sort((a, b) => (b.sellPrice || 0) - (a.sellPrice || 0))
}


/**
 * Sorts an array of items by their type
 * @param arr Array of items or items with rows, if its an array of items with rows, containsRows must be true
 * @param containsRows Whether or not the function is sorting items with rows
 */
export function sortItemsByType (arr: Item[], containsRows?: false): Item[]
export function sortItemsByType<T extends ItemRow> (arr: ItemWithRow<T>[], containsRows: true): ItemWithRow<T>[]
export function sortItemsByType (arr: (Item | ItemWithRow<ItemRow>)[], containsRows?: boolean): (Item | ItemWithRow<ItemRow>)[] {
	if (containsRows) {
		return (arr as ItemWithRow<ItemRow>[]).sort((a, b) => {
			if (a.item.type === b.item.type) {
				return a.item.name.localeCompare(b.item.name)
			}

			return a.item.type.localeCompare(b.item.type)
		})
	}

	return (arr as Item[]).sort((a, b) => {
		if (a.type === b.type) {
			return a.name.localeCompare(b.name)
		}

		return a.type.localeCompare(b.type)
	})
}

/**
 * Sorts an array of items by their item level
 * @param arr Array of items or items with rows, if its an array of items with rows, containsRows must be true
 * @param containsRows Whether or not the function is sorting items with rows
 * @param descending Whether the items should be sorted by level descending or not, default true
 */
export function sortItemsByLevel (arr: Item[], containsRows?: false, descending?: boolean): Item[]
export function sortItemsByLevel<T extends ItemRow> (arr: ItemWithRow<T>[], containsRows: true, descending?: boolean): ItemWithRow<T>[]
export function sortItemsByLevel (arr: (Item | ItemWithRow<ItemRow>)[], containsRows?: boolean, descending = true): (Item | ItemWithRow<ItemRow>)[] {
	if (containsRows) {
		return (arr as ItemWithRow<ItemRow>[]).sort((a, b) => {
			if (a.item.itemLevel === b.item.itemLevel) {
				return a.item.name.localeCompare(b.item.name)
			}

			return descending ? b.item.itemLevel - a.item.itemLevel : a.item.itemLevel - b.item.itemLevel
		})
	}

	return (arr as Item[]).sort((a, b) => {
		if (a.itemLevel === b.itemLevel) {
			return a.name.localeCompare(b.name)
		}

		return descending ? b.itemLevel - a.itemLevel : a.itemLevel - b.itemLevel
	})
}
