import { raidGuilds } from '../../config'
import { Location } from '../../types/Raids'
import { items } from '../items'
import { npcs } from '../npcs'

export const farm: Location = {
	id: 'farm',
	display: 'The Farm',
	guilds: raidGuilds.farmGuilds,
	requirements: {
		minLevel: 3,
		maxLevel: 10
	},
	raidLength: 20 * 60,
	playerLimit: 15,
	channels: [
		{
			type: 'LootChannel',
			name: 'fields',
			display: 'Fields',
			scavange: {
				common: {
					items: [items.scythe],
					xp: 5
				},
				uncommon: {
					items: [items.corn],
					xp: 10
				},
				rare: {
					items: [items.pitchfork],
					xp: 20
				},
				rolls: 1,
				cooldown: 1 * 30
			}
		},
		{
			type: 'LootChannel',
			name: 'cellar',
			display: 'Cellar',
			scavange: {
				common: {
					items: [items.shed_key, items.wooden_bat],
					xp: 5
				},
				uncommon: {
					items: [items.ifak_medkit, items.metal_bat],
					xp: 15
				},
				rare: {
					items: [items['glock-17'], items['9mm_fmj']],
					xp: 20
				},
				rolls: 2,
				cooldown: 1 * 30,
				requiresKey: items.shed_key,
				keyIsOptional: false
			},
			npcSpawns: {
				npcs: [npcs.raider],
				cooldownMin: 3 * 60,
				cooldownMax: 5 * 60
			}
		},
		{
			type: 'LootChannel',
			name: 'barn',
			display: 'Barn',
			scavange: {
				common: {
					items: [items.scythe, items.corn],
					xp: 5
				},
				uncommon: {
					items: [items.pitchfork, items.shed_key],
					xp: 10
				},
				rare: {
					items: [items.makeshift_shotgun, items.makeshift_shell, items.fire_axe],
					xp: 20
				},
				rolls: 2,
				cooldown: 1 * 30
			},
			npcSpawns: {
				npcs: [npcs.bloated_walker],
				cooldownMin: 75,
				cooldownMax: 2 * 75
			}
		},
		{
			type: 'EvacChannel',
			name: 'corn-maze-evac',
			display: 'Corn Maze',
			evac: {
				time: 15,
				requiresKey: items.shed_key
			}
		},
		{
			type: 'LootChannel',
			name: 'tool-shed',
			display: 'Tool Shed',
			scavange: {
				common: {
					items: [items.wooden_armor, items.wooden_helmet],
					xp: 5
				},
				uncommon: {
					items: [items.knife, items.ifak_medkit],
					xp: 10
				},
				rare: {
					items: [items.knife, items.ifak_medkit, items.wooden_armor],
					xp: 20
				},
				rolls: 2,
				cooldown: 1 * 30,
				requiresKey: items.shed_key,
				keyIsOptional: false
			}
		},
		{
			type: 'LootChannel',
			name: 'farmhouse',
			display: 'Farmhouse',
			npcSpawns: {
				npcs: [npcs.cain],
				cooldownMin: 30 * 60,
				cooldownMax: 60 * 60
			}
		},
		{
			type: 'EvacChannel',
			name: 'highway-evac',
			display: 'Highway',
			scavange: {
				common: {
					items: [items.wooden_armor, items.wooden_helmet],
					xp: 5
				},
				uncommon: {
					items: [items.knife, items.ifak_medkit],
					xp: 10
				},
				rare: {
					items: [items.knife, items.ifak_medkit, items.wooden_armor],
					xp: 20
				},
				rolls: 2,
				cooldown: 1 * 30,
				requiresKey: items.shed_key,
				keyIsOptional: true,

				// this is the special loot user will receive if they have a key:
				special: {
					items: [items.apple],
					xp: 12
				}
			},
			evac: {
				time: 30
			}
		}
	]
}
