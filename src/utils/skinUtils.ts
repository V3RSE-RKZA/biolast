import { ItemSkin, skins } from '../resources/skins'
import { SkinRow, SkinWithRow } from '../types/mysql'

/**
 * Returns skin data for given sql rows of skins
 * @param skinRows Rows of skins
 * @returns The skinRows along with the skin data
 */
export function getSkins (skinRows: SkinRow[]): SkinWithRow[] {
	const itemSkins = []

	for (const row of skinRows) {
		const skin = skins.find(s => s.name === row.skin)
		if (skin) {
			itemSkins.push({ skin, row })
		}
	}

	return itemSkins
}

/**
 * @param skinRows Rows of skins
 * @returns An object containing the amount of a skin user owns
 */
export function getSkinAmounts (skinRows: SkinRow[]): { [key: string]: number } {
	const skinData = getSkins(skinRows)

	return skinData.reduce<{ [key: string]: number }>((prev, curr) => {
		prev[curr.skin.name] = (prev[curr.skin.name] || 0) + 1
		return prev
	}, {})
}

/**
 * Get the string form of a skin
 * @param skin Skin to display as string
 */
export function getSkinDisplay (skin: ItemSkin): string {
	return `${skin.icon}\`${skin.name}\``
}
