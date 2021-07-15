import { Query, ItemRow, BackpackItemRow, GroundItemRow } from '../../types/mysql'
import { OkPacket } from 'mysql'

/**
 * @param query Query to use
 * @param userID ID of user to get items of
 * @param forUpdate Whether this is used in an SQL transaction
 * @returns Users items
 */
export async function getUserBackpack (query: Query, userID: string, forUpdate = false): Promise<BackpackItemRow[]> {
	return query(`SELECT items.id, items.item, backpack_items.equipped, items.durability FROM backpack_items INNER JOIN items ON items.id = backpack_items.itemId WHERE userId = ?${forUpdate ? ' FOR UPDATE' : ''}`, [userID])
}

/**
 * @param query Query to use
 * @param userID ID of user to get items of
 * @param forUpdate Whether this is used in an SQL transaction
 * @returns Users items
 */
export async function getUserStash (query: Query, userID: string, forUpdate = false): Promise<ItemRow[]> {
	return query(`SELECT items.id, items.item, items.durability FROM stash_items INNER JOIN items ON items.id = stash_items.itemId WHERE userId = ?${forUpdate ? ' FOR UPDATE' : ''}`, [userID])
}

/**
 * @param query Query to use
 * @param channelID ID of channel to get items in
 * @param forUpdate Whether this is used in an SQL transaction
 * @returns Items dropped on ground in channel
 */
export async function getGroundItems (query: Query, channelID: string, forUpdate = false): Promise<GroundItemRow[]> {
	return query(`SELECT items.id, items.item, items.durability, ground_items.createdAt FROM ground_items INNER JOIN items ON items.id = ground_items.itemId WHERE channelId = ?${forUpdate ? ' FOR UPDATE' : ''}`, [channelID])
}

/**
 * Adds item to users backpack
 * @param query Query to use
 * @param userID ID of user to add item to
 * @param itemID ID of the item, you can get the id by using the insertId from createItem()
 */
export async function addItemToBackpack (query: Query, userID: string, itemID: number): Promise<void> {
	await query('INSERT INTO backpack_items (itemId, userId) VALUES (?, ?)', [itemID, userID])
}

/**
 * Removes item from users backpack
 * @param query Query to use
 * @param itemID ID of the item
 */
export async function removeItemFromBackpack (query: Query, itemID: number): Promise<void> {
	await query('DELETE FROM backpack_items WHERE itemId = ?', [itemID])
}

/**
 * Adds item to users stash
 * @param query Query to use
 * @param userID ID of user to add item to
 * @param itemID ID of the item, you can get the id by using the insertId from createItem()
 */
export async function addItemToStash (query: Query, userID: string, itemID: number): Promise<void> {
	await query('INSERT INTO stash_items (itemId, userId) VALUES (?, ?)', [itemID, userID])
}

/**
 * Marks item as equipped
 * @param query Query to use
 * @param itemID ID of the item to set as equipped
 */
export async function equipItem (query: Query, itemID: number): Promise<void> {
	await query('UPDATE backpack_items SET equipped = 1 WHERE itemId = ?', [itemID])
}

/**
 * Marks item as not equipped
 * @param query Query to use
 * @param itemID ID of the item to set as not equipped
 */
export async function unequipItem (query: Query, itemID: number): Promise<void> {
	await query('UPDATE backpack_items SET equipped = 0 WHERE itemId = ?', [itemID])
}

/**
 * Removes item from users stash
 * @param query Query to use
 * @param itemID ID of the item
 */
export async function removeItemFromStash (query: Query, itemID: number): Promise<void> {
	await query('DELETE FROM stash_items WHERE itemId = ?', [itemID])
}

/**
 * Drops item on ground, items on the ground will be deleted after 15 minutes
 * @param query Query to use
 * @param userID ID of channel to drop item in
 * @param itemID ID of the item, you can get the id by using the insertId from createItem()
 */
export async function dropItemToGround (query: Query, channelID: string, itemID: number): Promise<void> {
	await query('INSERT INTO ground_items (itemId, channelId) VALUES (?, ?)', [itemID, channelID])
}

/**
 * Removes item from ground (so if it was picked up)
 * @param query Query to use
 * @param itemID ID of the item
 */
export async function removeItemFromGround (query: Query, itemID: number): Promise<void> {
	await query('DELETE FROM ground_items WHERE itemId = ?', [itemID])
}

export async function lowerItemDurability (query: Query, itemID: number, amount = 1): Promise<void> {
	await query('UPDATE items SET durability = durability - ? WHERE id = ?', [amount, itemID])
}

export async function createItem (query: Query, name: string, durability?: number): Promise<OkPacket> {
	return query('INSERT INTO items (item, durability) VALUES (?, ?)', [name, durability])
}

export async function deleteItem (query: Query, itemID: number): Promise<void> {
	await query('DELETE FROM items WHERE id = ?', [itemID])
}
