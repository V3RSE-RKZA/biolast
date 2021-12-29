import { ranged } from './ranged'
import { melee } from './melee'
import { armor } from './armor'
import { helmets } from './helmets'
import { ammunition } from './ammunition'
import { medical } from './medical'
import { keys } from './keys'
import { backpacks } from './backpacks'
import { collectible } from './collectible'
import { throwables } from './throwables'
import { food } from './food'
import { stimulants } from './stimulants'

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
	...throwables,
	...food,
	...stimulants
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
	...Object.values(throwables),
	...Object.values(food),
	...Object.values(stimulants)
]
