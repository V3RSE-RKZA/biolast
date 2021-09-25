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
				cooldown: 1 * 10
			},
			npcSpawns: {
				cooldownMin: 3 * 60,
				cooldownMax: 5 * 60,
				npcs: [npcs.feral_animal]
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
					items: [items.ifak_medkit, items.metal_bat, items.splint],
					xp: 15
				},
				rare: {
					items: [items.sledgehammer, items['9mm_FMJ_bullet']],
					xp: 20
				},
				rolls: 2,
				cooldown: 1 * 10
			},
			npcSpawns: {
				npcs: [npcs.raider_weak],
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
					items: [items.scythe, items.corn, items.splint],
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
					items: [items.wooden_armor, items.knife, items.cloth_backpack],
					xp: 10
				},
				rare: {
					items: [items.chainsaw, items.compression_bandage, items.truck_key],
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
					items: [items.truck_key, items.warehouse_key, items.compression_bandage, items['.22LR_bullet']],
					xp: 8
				},
				uncommon: {
					items: [items['glock-17'], items['9mm_HP_bullet'], items['20_gauge_buckshot']],
					xp: 10
				},
				rare: {
					items: [items.bobwhite_g2, items['20_gauge_slug']],
					xp: 15
				},
				rolls: 4,
				cooldown: 10 * 60,
				requiresKey: items.gunsafe_code,
				keyIsOptional: false
			}
		},
		{
			type: 'LootChannel',
			name: 'drug-room',
			display: 'Drug Room',
			topic: 'Dave might have had an addiction.',
			scavange: {
				common: {
					items: [items.compression_bandage, items.bandage],
					xp: 8
				},
				uncommon: {
					items: [items.adrenaline_stimulant, items.morphine],
					xp: 10
				},
				rare: {
					items: [items.daves_concoction, items.adderall],
					xp: 15
				},
				rolls: 2,
				cooldown: 2 * 60,
				requiresKey: items.daves_drug_key,
				keyIsOptional: false
			}
		}
	]
}
