import { Query, ItemRow, BackpackItemRow, ShopItemRow, AttachmentItemRow } from '../../types/mysql'
import { OkPacket } from 'mysql'

/**
 * @param query Query to use
 * @param itemID ID of item to get row of
 * @returns Item row of item with ID
 */
export async function getItemByID (query: Query, itemID: string): Promise<ItemRow | undefined> {
	return (await query('SELECT items.id, items.skin, items.item, items.durability, items.displayName, items.itemCreatedAt FROM items WHERE id = ?', [itemID]))[0]
}

/**
 * @param query Query to use
 * @param userID ID of user to get items of
 * @param forUpdate Whether this is used in an SQL transaction
 * @returns Users items
 */
export async function getUserBackpack (query: Query, userID: string, forUpdate = false): Promise<BackpackItemRow[]> {
	return query(`SELECT items.id, items.skin, items.item, backpack_items.equipped, items.durability, items.displayName, items.itemCreatedAt FROM backpack_items INNER JOIN items ON items.id = backpack_items.itemId WHERE userId = ?${forUpdate ? ' FOR UPDATE' : ''}`, [userID])
}

/**
 * @param query Query to use
 * @param userID ID of user to get items of
 * @param forUpdate Whether this is used in an SQL transaction
 * @returns Users items
 */
export async function getUserStash (query: Query, userID: string, forUpdate = false): Promise<ItemRow[]> {
	return query(`SELECT items.id, items.skin, items.item, items.durability, items.displayName, items.itemCreatedAt FROM stash_items INNER JOIN items ON items.id = stash_items.itemId WHERE userId = ?${forUpdate ? ' FOR UPDATE' : ''}`, [userID])
}

/**
 * Retrieves attachments belonging to a provided list of items
 * @param query Query to use
 * @param items Items to find attachments for
 * @param forUpdate Whether this is used in an SQL transaction
 * @returns Attachments belonging to the items
 */
export async function getAttachments (query: Query, items: ItemRow[], forUpdate = false): Promise<AttachmentItemRow[]> {
	return query(`SELECT items.id, items.skin, items.item, items.durability, items.displayName, attachment_items.weaponId, items.itemCreatedAt FROM attachment_items INNER JOIN items ON items.id = attachment_items.itemId WHERE attachment_items.weaponId IN (${items.map(i => i.id).join(', ') || '\'\''})${forUpdate ? ' FOR UPDATE' : ''}`)
}

/**
 * Retrieves 50 items available for sale at the shop (ordered by newest to oldest)
 * @param query Query to use
 * @returns Available shop items
 */
export async function getAllShopItems (query: Query): Promise<ShopItemRow[]> {
	return query('SELECT items.id, items.skin, items.item, items.durability, items.displayName, shop_items.createdAt, shop_items.price, items.itemCreatedAt FROM shop_items INNER JOIN items ON items.id = shop_items.itemId ORDER BY shop_items.createdAt DESC LIMIT 50')
}

/**
 * Retrieve a shop item (to make sure it exists in the shop)
 * @param query Query to use
 * @param itemID ID of the item
 * @param forUpdate Whether this is used in an SQL transaction
 * @returns A shop item
 */
export async function getShopItem (query: Query, itemID: number, forUpdate = false): Promise<ShopItemRow | undefined> {
	return (await query(`SELECT items.id, items.skin, items.item, items.durability, items.displayName, shop_items.createdAt, shop_items.price FROM shop_items INNER JOIN items ON items.id = shop_items.itemId WHERE items.id = ?${forUpdate ? ' FOR UPDATE' : ''}`, [itemID]))[0]
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
export async function removeAllItemsFromBackpack (query: Query, userID: string): Promise<void> {
	await query('DELETE items FROM items INNER JOIN backpack_items ON items.id = backpack_items.itemId WHERE userId = ?', [userID])
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
 * Adds attachment to weapon
 * @param query Query to use
 * @param weaponID ID of weapon to add item to
 * @param itemID ID of the item, you can get the id by using createItem()
 */
export async function addAttachmentToWeapon (query: Query, weaponID: string, itemID: number): Promise<void> {
	await query('INSERT INTO attachment_items (itemId, weaponID) VALUES (?, ?)', [itemID, weaponID])
}

/**
 * Removes attachment from weapon
 * @param query Query to use
 * @param itemID ID of the attachment
 */
export async function removeAttachment (query: Query, itemID: number): Promise<void> {
	await query('DELETE FROM attachment_items WHERE itemId = ?', [itemID])
}

/**
 * Sets an items durability
 * @param query Query to use
 * @param itemID ID of the item
 * @param durability Durability to set item to
 */
export async function setDurability (query: Query, itemID: number, durability: number): Promise<void> {
	await query('UPDATE items SET durability = ? WHERE id = ?', [durability, itemID])
}

/**
 * Sets an items skin
 * @param query Query to use
 * @param itemID ID of the item
 * @param skin Name of the skin
 */
export async function setSkin (query: Query, itemID: number, skin: string): Promise<void> {
	await query('UPDATE items SET skin = ? WHERE id = ?', [skin, itemID])
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

/**
 * @param query Query to use
 * @param itemID ID of the item
 * @param amount Amount to set items durability to
 */
export async function setItemDurability (query: Query, itemID: number, amount: number): Promise<void> {
	await query('UPDATE items SET durability = ? WHERE id = ?', [amount, itemID])
}

/**
 * Create an item and returns the SQL row of it
 * @param query Query to use
 * @param name name of the item
 * @param options Options for the item
 * @param options.durability The number of uses item has (ie. if its a weapon it could only be used to attack this many times)
 * @param options.displayName Display name of item when shown on bot (shows this instead of the item name)
 * @returns Item SQL row
 */
export async function createItem (query: Query, name: string, options: Partial<{ durability: number, displayName: string }> = {}): Promise<ItemRow> {
	const packet: OkPacket = await query('INSERT INTO items (item, durability, displayName) VALUES (?, ?, ?)', [name, options.durability, options.displayName])

	return {
		id: packet.insertId,
		item: name,
		durability: options.durability,
		displayName: options.displayName,
		itemCreatedAt: new Date()
	}
}

export async function deleteItem (query: Query, itemID: number): Promise<void> {
	await query('DELETE FROM items WHERE id = ?', [itemID])
}
