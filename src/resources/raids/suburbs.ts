import { Location } from '../../types/Locations'
import { items } from '../items'
import { npcs } from '../npcs'

export const suburbs: Location = {
	id: 'suburbs',
	display: 'The Suburbs',
	requirements: {
		minLevel: 1
	},
	areas: [
		{
			name: 'backstreets',
			display: 'Backstreets',
			loot: {
				common: {
					items: [items.wooden_bat],
					xp: 5
				},
				uncommon: {
					items: [items.bandage, items.splint, items.makeshift_pistol_bullet],
					xp: 10
				},
				rare: {
					items: [items.metal_bat, items.makeshift_pistol],
					xp: 20
				},
				rolls: 1
			}
		},
		{
			name: 'red-house',
			display: 'Red House',
			loot: {
				common: {
					items: [items.makeshift_pistol, items.makeshift_pistol_bullet],
					xp: 5
				},
				uncommon: {
					items: [items.makeshift_rifle, items.makeshift_rifle_bullet],
					xp: 10
				},
				rare: {
					items: [items.luger, items['.22LR_bullet'], items.sledgehammer, items.shed_key],
					xp: 20
				},
				rolls: 2
			},
			npcSpawns: {
				chance: 30,
				npcs: [npcs.walker_weak]
			}
		},
		{
			name: 'apartments',
			display: 'Apartments',
			loot: {
				common: {
					items: [items.shed_key, items.wooden_bat, items.bandage],
					xp: 5
				},
				uncommon: {
					items: [items.metal_bat],
					xp: 15
				},
				rare: {
					items: [items.luger, items['.22LR_bullet']],
					xp: 20
				},
				rolls: 2
			},
			npcSpawns: {
				chance: 40,
				npcs: [npcs.raider_weak]
			}
		},
		{
			name: 'backyard-shed',
			display: 'Backyard Shed',
			loot: {
				common: {
					items: [items.cloth_armor, items.cloth_helmet],
					xp: 5
				},
				uncommon: {
					items: [items.small_pouch, items.wooden_helmet],
					xp: 10
				},
				rare: {
					items: [items.knife, items.ifak_medkit, items.wooden_armor],
					xp: 20
				},
				rolls: 2
			},
			requiresKey: [items.shed_key],
			keyIsOptional: false
		},
		{
			name: 'park',
			display: 'Park',
			loot: {
				common: {
					items: [items.wooden_bat],
					xp: 5
				},
				uncommon: {
					items: [items.metal_bat, items.bandage],
					xp: 10
				},
				rare: {
					items: [items.wooden_helmet, items.metal_bat],
					xp: 20
				},
				rolls: 1
			}
		},
		{
			name: 'cedar-lake',
			display: 'Cedar Lake',
			loot: {
				common: {
					items: [items.makeshift_rifle, items.makeshift_rifle_bullet, items['.22LR_bullet']],
					xp: 5
				},
				uncommon: {
					items: [items['anti-biotics'], items.splint, items['9mm_FMJ_bullet']],
					xp: 10
				},
				rare: {
					items: [items['glock-17'], items.P320, items.wooden_helmet, items.wooden_armor],
					xp: 20
				},
				rolls: 2
			},
			npcSpawns: {
				chance: 40,
				npcs: [npcs.crawler_weak]
			}
		}
	]
}
