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
			name: 'barn',
			display: 'Barn',
			scavange: {
				common: {
					items: [items.scythe],
					xp: 5
				},
				uncommon: {
					items: [items.bandage, items.makeshift_pistol_ammo],
					xp: 10
				},
				rare: {
					items: [items.metal_bat, items.makeshift_pistol],
					xp: 20
				},
				rolls: 1,
				cooldown: 1 * 30
			}
		},
		{
			type: 'LootChannel',
			name: 'red-house',
			display: 'Red House',
			scavange: {
				common: {
					items: [items.makeshift_pistol, items.makeshift_pistol_ammo],
					xp: 5
				},
				uncommon: {
					items: [items.makeshift_rifle, items.makeshift_rifle_ammo],
					xp: 10
				},
				rare: {
					items: [items['glock-17'], items['9mm_fmj'], items.sledgehammer],
					xp: 20
				},
				rolls: 2,
				cooldown: 1 * 30
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
				cooldown: 1 * 30
			},
			npcSpawns: {
				npcs: [npcs.raider],
				cooldownMin: 3 * 60,
				cooldownMax: 5 * 60
			}
		},
		{
			type: 'EvacChannel',
			name: 'woods-evac',
			display: 'Woods',
			evac: {
				time: 15,
				requiresKey: items.shed_key
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
					items: [items.knife, items.wooden_helmet],
					xp: 10
				},
				rare: {
					items: [items.knife, items.ifak_medkit, items.wooden_armor],
					xp: 20
				},
				rolls: 2,
				cooldown: 1 * 30,
				requiresKey: items.shed_key
			}
		},
		{
			type: 'LootChannel',
			name: 'graveyard',
			display: 'Graveyard',
			npcSpawns: {
				npcs: [npcs.cain],
				cooldownMin: 30 * 60,
				cooldownMax: 60 * 60
			}
		},
		{
			type: 'EvacChannel',
			name: 'corn-maze-evac',
			display: 'Corn Maze',
			evac: {
				time: 30
			}
		}
	]
}
