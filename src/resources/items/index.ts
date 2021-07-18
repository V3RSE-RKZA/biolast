import { items as weapons } from './weapons'
import { items as armor } from './armor'
import { items as ammunition } from './ammunition'
import { items as medical } from './medical'
import { Item } from '../../types/Items'

export const items = {
	...weapons,
	...armor,
	...ammunition,
	...medical
}

export const allItems: Item[] = [
	...Object.values(weapons),
	...Object.values(armor),
	...Object.values(ammunition),
	...Object.values(medical)
]
