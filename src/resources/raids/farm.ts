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
				cooldown: 1 * 10,
				requiresKey: items.truck_key,
				keyIsOptional: true,

				// this is the special loot user will receive if they have a key:
				special: {
					items: [items.apple],
					xp: 12
				}
			}
		},
		{
			type: 'LootChannel',
			name: 'cellar',
			display: 'Cellar',
			scavange: {
				common: {
					items: [items.bandage, items.wooden_bat],
					xp: 5
				},
				uncommon: {
					items: [items.ifak_medkit, items.metal_bat],
					xp: 15
				},
				rare: {
					items: [items.sledgehammer, items['9mm_fmj_bullet']],
					xp: 20
				},
				rolls: 2,
				cooldown: 1 * 10,
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
					items: [items.pitchfork, items.warehouse_key],
					xp: 10
				},
				rare: {
					items: [items.makeshift_shotgun, items.makeshift_shell, items.fire_axe],
					xp: 20
				},
				rolls: 2,
				cooldown: 1 * 10
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
				time: 30
			}
		},
		{
			type: 'LootChannel',
			name: 'warehouse',
			display: 'Warehouse',
			scavange: {
				common: {
					items: [items.apple, items.wooden_helmet],
					xp: 5
				},
				uncommon: {
					items: [items.wooden_armor, items.knife],
					xp: 10
				},
				rare: {
					items: [items.chainsaw, items.ifak_medkit, items.truck_key],
					xp: 20
				},
				rolls: 2,
				cooldown: 1 * 10,
				requiresKey: items.warehouse_key,
				keyIsOptional: false
			}
		},
		{
			type: 'LootChannel',
			name: 'farmhouse',
			display: 'Farmhouse',
			npcSpawns: {
				npcs: [npcs.dave],
				cooldownMin: 30 * 60,
				cooldownMax: 60 * 60
			}
		},
		{
			type: 'EvacChannel',
			name: 'highway-evac',
			display: 'Highway',
			evac: {
				time: 15,
				requiresKey: items.truck_key
			}
		},
		{
			type: 'LootChannel',
			name: 'bedroom',
			display: 'bedroom',
			scavange: {
				common: {
					items: [items.truck_key, items.warehouse_key, items['.22lr_bullet']],
					xp: 10
				},
				uncommon: {
					items: [items.ifak_medkit, items['glock-17']],
					xp: 15
				},
				rare: {
					items: [items.bobwhite_g2, items['20_gauge_shell']],
					xp: 25
				},
				rolls: 4,
				cooldown: 1 * 10,
				requiresKey: items.gunsafe_code,
				keyIsOptional: false
			}
		}
	]
}
