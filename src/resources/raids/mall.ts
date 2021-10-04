import { raidGuilds } from '../../config'
import { Location } from '../../types/Raids'
import { items } from '../items'
import { npcs } from '../npcs'

export const mall: Location = {
	id: 'mall',
	display: 'The Mall',
	guilds: raidGuilds.mallGuilds,
	requirements: {
		minLevel: 8,
		maxLevel: 15
	},
	raidLength: 20 * 60,
	playerLimit: 15,
	channels: [
		{
			type: 'LootChannel',
			name: 'antique-store',
			display: 'Antique Store',
			scavange: {
				common: {
					items: [items.replica_katana],
					xp: 10
				},
				uncommon: {
					items: [items.bandage, items.splint, items.wooden_armor, items.wooden_helmet],
					xp: 15
				},
				rare: {
					items: [items.antique_vase],
					xp: 25
				},
				rolls: 1,
				cooldown: 1 * 10
			}
		},
		{
			type: 'LootChannel',
			name: 'food-court',
			display: 'Food Court',
			scavange: {
				common: {
					items: [items.pizza_slice, items.pretzel, items.fork],
					xp: 10
				},
				uncommon: {
					items: [items.knife, items.aramid_armor],
					xp: 15
				},
				rare: {
					items: [items.metal_shank],
					xp: 25
				},
				rolls: 1,
				cooldown: 1 * 10
			},
			npcSpawns: {
				npcs: [npcs.bloated_walker],
				cooldownMin: 1 * 60,
				cooldownMax: 3 * 60
			}
		},
		{
			type: 'LootChannel',
			name: 'dome-depot',
			display: 'Dome Depot',
			scavange: {
				common: {
					items: [items.sledgehammer, items.fire_axe, items.wooden_armor, items.wooden_helmet],
					xp: 10
				},
				uncommon: {
					items: [items.chainsaw, items.metal_shank],
					xp: 15
				},
				rare: {
					items: [items.aramid_armor, items.aramid_helmet],
					xp: 25
				},
				rolls: 1,
				cooldown: 1 * 10
			},
			npcSpawns: {
				npcs: [npcs.raider_medium],
				cooldownMin: 3 * 60,
				cooldownMax: 5 * 60
			}
		},
		{
			type: 'LootChannel',
			name: 'dereks-hunting-shop',
			display: 'Dereks Hunting Shop',
			scavange: {
				common: {
					items: [items['aks-74u'], items['FN_Five-seveN'], items.SS195LF_bullet],
					xp: 10
				},
				uncommon: {
					items: [items['9mm_RIP_bullet'], items['12-gauge_buckshot'], items.mossberg_500, items['9mm_AP_bullet']],
					xp: 15
				},
				rare: {
					items: [items['5.45x39mm_7N24_bullet'], items.steel_armor, items.SS190_bullet],
					xp: 25
				},
				rolls: 3,
				cooldown: 2 * 60,
				requiresKey: items.dereks_shop_key,
				keyIsOptional: false
			}
		},
		{
			type: 'LootChannel',
			name: 'staff-break-room',
			display: 'Staff Break Room',
			scavange: {
				common: {
					items: [items.splint, items.compression_bandage, items.ifak_medkit],
					xp: 10
				},
				uncommon: {
					items: [items.duffle_bag],
					xp: 15
				},
				rare: {
					items: [items.hyfin_chest_seal],
					xp: 25
				},
				rolls: 1,
				cooldown: 1 * 10
			},
			npcSpawns: {
				npcs: [npcs.derek],
				cooldownMin: 20 * 60,
				cooldownMax: 40 * 60
			}
		},
		{
			type: 'LootChannel',
			name: 'florreds-pharmacy',
			display: 'Florreds Pharmacy',
			scavange: {
				common: {
					items: [items.ifak_medkit, items.pretzel],
					xp: 10
				},
				uncommon: {
					items: [items['anti-biotics'], items.splint],
					xp: 15
				},
				rare: {
					items: [items.paracetamol, items.adrenaline_stimulant, items.adderall, items.morphine],
					xp: 25
				},
				rolls: 1,
				cooldown: 1 * 10
			},
			npcSpawns: {
				npcs: [npcs.raider_medium],
				cooldownMin: 3 * 60,
				cooldownMax: 5 * 60
			}
		}
	]
}
