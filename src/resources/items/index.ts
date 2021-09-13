import { ranged } from './ranged'
import { melee } from './melee'
import { armor } from './armor'
import { helmets } from './helmets'
import { ammunition } from './ammunition'
import { medical } from './medical'
import { keys } from './keys'
import { backpacks } from './backpacks'
import { quest } from './quest'

export const items = {
	...ranged,
	...melee,
	...armor,
	...helmets,
	...ammunition,
	...medical,
	...keys,
	...backpacks,
	...quest
}

export const allItems = Object.values(items)
