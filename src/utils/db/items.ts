import { Query, ItemRow, BackpackItemRow, GroundItemRow, ShopItemRow } from '../../types/mysql'
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
 * Retrieves 50 items available for sale at the shop (ordered by newest to oldest)
 * @param query Query to use
 * @returns Available shop items
 */
export async function getAllShopItems (query: Query): Promise<ShopItemRow[]> {
	return query('SELECT items.id, items.item, items.durability, shop_items.createdAt, shop_items.price FROM shop_items INNER JOIN items ON items.id = shop_items.itemId ORDER BY shop_items.createdAt DESC LIMIT 50')
}

/**
 * Retrieve a shop item (to make sure it exists in the shop)
 * @param query Query to use
 * @param itemID ID of the item
 * @param forUpdate Whether this is used in an SQL transaction
 * @returns A shop item
 */
export async function getShopItem (query: Query, itemID: number, forUpdate = false): Promise<ShopItemRow | undefined> {
	return (await query(`SELECT items.id, items.item, items.durability, shop_items.createdAt, shop_items.price FROM shop_items INNER JOIN items ON items.id = shop_items.itemId WHERE items.id = ?${forUpdate ? ' FOR UPDATE' : ''}`, [itemID]))[0]
}

/**
 * Adds item to users backpack
 * @param query Query to use
 * @param userID ID of user to add item to
 * @param itemID ID of the item, you can get the id by using createItem()
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
 * @param itemID ID of the item, you can get the id by using createItem()
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
 * Removes all items from a users backpack
 * @param query Query to use
 * @param userID ID of the user
 */
export async function removeItemsFromBackpack (query: Query, userID: string): Promise<void> {
	await query('DELETE items FROM items INNER JOIN backpack_items ON items.id = backpack_items.itemId WHERE userId = ?', [userID])
}

/**
 * Drops item on ground, items on the ground will be deleted after 20 minutes
 * @param query Query to use
 * @param channelID ID of channel to drop item in
 * @param itemID ID of the item, you can get the id by using createItem()
 */
export async function dropItemToGround (query: Query, channelID: string, itemID: number): Promise<void> {
	await query('INSERT INTO ground_items (itemId, channelId) VALUES (?, ?)', [itemID, channelID])
}

/**
 * Adds item to the shop, shop items are removed after 1 day
 * @param query Query to use
 * @param itemID ID of the item, you can get the id by using createItem()
 * @param price Price item should be sold for
 */
export async function addItemToShop (query: Query, itemID: number, price: number): Promise<void> {
	await query('INSERT INTO shop_items (itemId, price) VALUES (?, ?)', [itemID, price])
}

/**
 * Removes item from ground (so if it was picked up)
 * @param query Query to use
 * @param itemID ID of the item
 */
export async function removeItemFromGround (query: Query, itemID: number): Promise<void> {
	await query('DELETE FROM ground_items WHERE itemId = ?', [itemID])
}

/**
 * Removes item from shop (if it was purchased)
 * @param query Query to use
 * @param itemID ID of the item
 */
export async function removeItemFromShop (query: Query, itemID: number): Promise<void> {
	await query('DELETE FROM shop_items WHERE itemId = ?', [itemID])
}

export async function lowerItemDurability (query: Query, itemID: number, amount = 1): Promise<void> {
	await query('UPDATE items SET durability = durability - ? WHERE id = ?', [amount, itemID])
}

export async function createItem (query: Query, name: string, durability?: number): Promise<ItemRow> {
	const packet: OkPacket = await query('INSERT INTO items (item, durability) VALUES (?, ?)', [name, durability])

	return {
		id: packet.insertId,
		item: name,
		durability
	}
}

export async function deleteItem (query: Query, itemID: number): Promise<void> {
	await query('DELETE FROM items WHERE id = ?', [itemID])
}
