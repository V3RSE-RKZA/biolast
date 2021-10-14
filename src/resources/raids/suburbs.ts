import { raidGuilds } from '../../config'
import { Location } from '../../types/Raids'
import { items } from '../items'
import { npcs } from '../npcs'

export const suburbs: Location = {
	id: 'suburbs',
	display: 'The Suburbs',
	guilds: raidGuilds.suburbsGuilds,
	requirements: {
		minLevel: 1,
		maxLevel: 10
	},
	raidLength: 10 * 60,
	playerLimit: 10,
	channels: [
		{
			type: 'LootChannel',
			name: 'backstreets',
			display: 'Backstreets',
			scavange: {
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
				rolls: 1,
				cooldown: 1 * 10
			}
		},
		{
			type: 'LootChannel',
			name: 'red-house',
			display: 'Red House',
			topic: 'It\'s quiet in here...',
			scavange: {
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
				rolls: 2,
				cooldown: 1 * 10
			},
			npcSpawns: {
				npcs: [npcs.walker_weak],
				cooldownMin: 60,
				cooldownMax: 2 * 60
			}
		},
		{
			type: 'LootChannel',
			name: 'apartments',
			display: 'Apartments',
			topic: 'Who knows what lies down these dark halls.',
			scavange: {
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
				rolls: 2,
				cooldown: 1 * 30
			},
			npcSpawns: {
				npcs: [npcs.raider_weak],
				cooldownMin: 3 * 60,
				cooldownMax: 5 * 60
			}
		},

		{
			type: 'EvacChannel',
			name: 'woods-evac',
			display: 'Woods',
			topic: 'Not much noise coming from these woods. This could be a good place to escape the area.',
			evac: {
				time: 15
			},
			npcSpawns: {
				cooldownMin: 5 * 60,
				cooldownMax: 10 * 60,
				npcs: [npcs.raider_weak]
			}
		},
		{
			type: 'LootChannel',
			name: 'backyard-shed',
			display: 'Backyard Shed',
			scavange: {
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
				rolls: 2,
				cooldown: 1 * 10,
				requiresKey: [items.shed_key],
				keyIsOptional: false
			}
		},
		{
			type: 'LootChannel',
			name: 'park',
			display: 'Park',
			scavange: {
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
				rolls: 1,
				cooldown: 1 * 30
			}
		},
		{
			type: 'LootChannel',
			name: 'cedar-lake',
			display: 'Cedar Lake',
			scavange: {
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
				rolls: 2,
				cooldown: 1 * 30
			},
			npcSpawns: {
				cooldownMin: 1 * 60,
				cooldownMax: 2 * 60,
				npcs: [npcs.crawler_weak]
			}
		},
		{
			type: 'LootChannel',
			name: 'graveyard',
			display: 'Graveyard',
			topic: 'Is there someone else here?',
			npcSpawns: {
				npcs: [npcs.cain],
				cooldownMin: 30 * 60,
				cooldownMax: 60 * 60
			}
		},
		{
			type: 'EvacChannel',
			name: 'sewers-evac',
			display: 'Sewers',
			evac: {
				time: 30
			}
		}
	]
}
