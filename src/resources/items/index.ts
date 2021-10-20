import { ranged } from './ranged'
import { melee } from './melee'
import { armor } from './armor'
import { helmets } from './helmets'
import { ammunition } from './ammunition'
import { medical } from './medical'
import { keys } from './keys'
import { backpacks } from './backpacks'
import { collectible } from './collectible'
import { explosives } from './explosives'

export const items = {
	...ranged,
	...melee,
	...armor,
	...helmets,
	...ammunition,
	...medical,
	...keys,
	...backpacks,
	...collectible,
	...explosives
}

export const allItems = [
	...Object.values(ranged),
	...Object.values(melee),
	...Object.values(armor),
	...Object.values(helmets),
	...Object.values(ammunition),
	...Object.values(medical),
	...Object.values(keys),
	...Object.values(backpacks),
	...Object.values(collectible),
	...Object.values(explosives)
]
