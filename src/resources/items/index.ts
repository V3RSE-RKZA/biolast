import { items as ranged } from './ranged'
import { items as melee } from './melee'
import { items as armor } from './armor'
import { items as helmets } from './helmets'
import { items as ammunition } from './ammunition'
import { items as medical } from './medical'
import { Item } from '../../types/Items'

export const items = {
	...ranged,
	...melee,
	...armor,
	...helmets,
	...ammunition,
	...medical
}

export const allItems: Item[] = [
	...Object.values(ranged),
	...Object.values(melee),
	...Object.values(armor),
	...Object.values(helmets),
	...Object.values(ammunition),
	...Object.values(medical)
]
