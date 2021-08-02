import { items as ranged } from './ranged'
import { items as melee } from './melee'
import { items as armor } from './armor'
import { items as helmets } from './helmets'
import { items as ammunition } from './ammunition'
import { items as medical } from './medical'
import { items as keys } from './keys'
import { items as backpacks } from './backpacks'

export const items = {
	...ranged,
	...melee,
	...armor,
	...helmets,
	...ammunition,
	...medical,
	...keys,
	...backpacks
}

export const allItems = Object.values(items)
