import { ItemRow, BackpackItemRow } from '../types/mysql'
import { allItems } from '../resources/items'
import { baseBackpackLimit } from '../config'
import { Ammunition, Armor, Backpack, Helmet, Item, Weapon } from '../types/Items'

type ItemWithRow<T extends ItemRow> = { item: Item, row: T }

/**
 * Returns the amount of slots the items are taking up and the item data given rows of items
 * @param itemRows Rows of items, can be rows of ground items, stash items, or backpack items
 * @returns The itemRows along with the item data
 */
export function getItems<T extends ItemRow>(itemRows: T[]): { items: ItemWithRow<T>[], slotsUsed: number } {
	const inventory = []
	let slotsUsed = 0

	for (const row of itemRows) {
		const item = allItems.find(i => i.name === row.item)

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
 * Get the string form of an item
 * @param item Item to display as string
 * @param itemRow The row of the item
 */
export function getItemDisplay (item: Item, itemRow?: ItemRow): string {
	if (itemRow) {
		if (item.type === 'Weapon' && itemRow.durability) {
			const durability = itemRow.durability / item.durability

			if (durability >= 0.8) {
				return `*Pristine* ${item.icon}\`${item.name}\` (ID: \`${itemRow.id}\`)`
			}
			else if (durability >= 0.6) {
				return `*Used* ${item.icon}\`${item.name}\` (ID: \`${itemRow.id}\`)`
			}
			else if (durability >= 0.4) {
				return `*Shoddy* ${item.icon}\`${item.name}\` (ID: \`${itemRow.id}\`)`
			}

			return `*Damaged* ${item.icon}\`${item.name}\` (ID: \`${itemRow.id}\`)`
		}

		return `${item.icon}\`${item.name}\` (ID: \`${itemRow.id}\`${itemRow.durability ? `, **${itemRow.durability}** uses left` : ''})`
	}

	return `${item.icon}\`${item.name}\``
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
		const item = allItems.find(i => i.name === row.item)

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

/**
 * @param backpackRows The users backpack inventory
 * @param slotsNeeded How many slots are needed
 * @returns Whether or not the backpack has room for the slots
 */
export function backpackHasSpace (backpackRows: BackpackItemRow[], slotsNeeded: number): boolean {
	const userBackpackData = getItems(backpackRows)
	const equips = getEquips(backpackRows)

	return userBackpackData.slotsUsed + slotsNeeded <= getBackpackLimit(equips.backpack?.item)
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

// why is it typed like this??? so I can sort an array of just items or an array of items + item rows
/**
 * Sorts an array of items from highest durability to lowest, or by name if durability is the same
 * @param arr Array of items or items with rows, if its an array of items with rows, containsRows must be true
 * @param containsRows Whether or not the function is sorting items with rows
 */
export function sortItemsByDurability(arr: Item[], containsRows?: false): Item[]
export function sortItemsByDurability<T extends ItemRow>(arr: ItemWithRow<T>[], containsRows: true): ItemWithRow<T>[]
export function sortItemsByDurability(arr: (Item | ItemWithRow<ItemRow>)[], containsRows?: boolean): (Item | ItemWithRow<ItemRow>)[] {
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
export function sortItemsByAmmo(arr: Item[], containsRows?: false): Item[]
export function sortItemsByAmmo<T extends ItemRow>(arr: ItemWithRow<T>[], containsRows: true): ItemWithRow<T>[]
export function sortItemsByAmmo(arr: (Item | ItemWithRow<ItemRow>)[], containsRows?: boolean): (Item | ItemWithRow<ItemRow>)[] {
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
		let aPenetration = 0
		let aDamage = 0
		let bPenetration = 0
		let bDamage = 0

		if (a.type === 'Ammunition') {
			aPenetration = a.penetration
			aDamage = a.damage
		}
		if (b.type === 'Ammunition') {
			bPenetration = b.penetration
			bDamage = b.damage
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

/**
 * Sorts an array of items from by name their name a-z
 * @param arr Array of items or items with rows, if its an array of items with rows, containsRows must be true
 * @param containsRows Whether or not the function is sorting items with rows
 */
export function sortItemsByName(arr: Item[], containsRows?: false): Item[]
export function sortItemsByName<T extends ItemRow>(arr: ItemWithRow<T>[], containsRows: true): ItemWithRow<T>[]
export function sortItemsByName(arr: (Item | ItemWithRow<ItemRow>)[], containsRows?: boolean): (Item | ItemWithRow<ItemRow>)[] {
	if (containsRows) {
		return (arr as ItemWithRow<ItemRow>[]).sort((a, b) => a.item.name.localeCompare(b.item.name))
	}

	return (arr as Item[]).sort((a, b) => a.name.localeCompare(b.name))
}
