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
	raidLength: 15 * 60,
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
					items: [items.knife],
					xp: 15
				},
				rare: {
					items: [items.metal_shank, items.aramid_armor],
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
			name: 'pathway-park',
			display: 'pathway-park',
			scavange: {
				common: {
					items: [items.bandage, items['9mm_FMJ_bullet']],
					xp: 10
				},
				uncommon: {
					items: [items['glock-17'], items.dome_depot_key, items.aramid_armor],
					xp: 15
				},
				rare: {
					items: [items['ak-47'], items['7.62x39mm_FMJ_bullet']],
					xp: 25
				},
				rolls: 2,
				cooldown: 1 * 10
			},
			npcSpawns: {
				npcs: [npcs.medium_raider, npcs.psycho_raider],
				cooldownMin: 2 * 60,
				cooldownMax: 4 * 60
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
					items: [items.chainsaw, items.metal_shank, items.aramid_armor],
					xp: 15
				},
				rare: {
					items: [items.duffle_bag, items.aramid_helmet],
					xp: 25
				},
				rolls: 2,
				cooldown: 1 * 10,
				requiresKey: [items.dome_depot_key, items.security_key],
				keyIsOptional: false
			}
		},
		{
			type: 'EvacChannel',
			name: 'parking-lot-evac',
			display: 'Parking Lot',
			evac: {
				time: 30
			}
		},
		{
			type: 'LootChannel',
			name: 'plaza',
			display: 'plaza',
			scavange: {
				common: {
					items: [items.sledgehammer, items.wooden_helmet],
					xp: 10
				},
				uncommon: {
					items: [items['anti-biotics'], items.florreds_pharmacy_key],
					xp: 15
				},
				rare: {
					items: [items.mp5, items.aramid_armor],
					xp: 25
				},
				rarest: {
					items: [items.aramid_helmet],
					xp: 35
				},
				rolls: 2,
				cooldown: 1 * 10
			},
			npcSpawns: {
				npcs: [npcs.crawler_medium],
				cooldownMin: 1 * 60,
				cooldownMax: 2 * 60
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
				requiresKey: [items.dereks_shop_key, items.security_key],
				keyIsOptional: false
			}
		},
		{
			type: 'LootChannel',
			name: 'game-n-go',
			display: 'Game N Go',
			scavange: {
				common: {
					items: [items.donut],
					xp: 10
				},
				uncommon: {
					items: [items.ifak_medkit],
					xp: 15
				},
				rare: {
					items: [items.paracetamol, items.tech_trash, items.morphine],
					xp: 25
				},
				rolls: 2,
				cooldown: 1 * 50
			},
			npcSpawns: {
				npcs: [npcs.game_raider, npcs.psycho_raider],
				cooldownMin: 3 * 60,
				cooldownMax: 4 * 60
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
				rolls: 2,
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
					items: [items.ifak_medkit, items.compression_bandage],
					xp: 10
				},
				uncommon: {
					items: [items['anti-biotics'], items.splint, items.adrenaline_stimulant, items.adderall],
					xp: 15
				},
				rare: {
					items: [items.paracetamol, items.morphine, items.duffle_bag],
					xp: 25
				},
				rolls: 2,
				cooldown: 1 * 10,
				requiresKey: [items.florreds_pharmacy_key, items.security_key],
				keyIsOptional: false
			}
		},
		{
			type: 'LootChannel',
			name: 'security-room',
			display: 'Security Room',
			scavange: {
				common: {
					items: [items.donut],
					xp: 10
				},
				uncommon: {
					items: [items.ifak_medkit],
					xp: 15
				},
				rare: {
					items: [items.paracetamol, items.tech_trash, items.security_key],
					xp: 25
				},
				rolls: 2,
				cooldown: 1 * 50
			},
			npcSpawns: {
				npcs: [npcs.walker_security_officer],
				cooldownMin: 2 * 60,
				cooldownMax: 3 * 60
			}
		},
		{
			type: 'EvacChannel',
			name: 'roof-helipad',
			display: 'Roof Helipad',
			evac: {
				time: 15
			},
			npcSpawns: {
				npcs: [npcs.medium_raider],
				cooldownMin: 5 * 60,
				cooldownMax: 10 * 60
			}
		},

		{
			type: 'LootChannel',
			name: 'mall-fountain',
			display: 'Mall Fountain',
			npcSpawns: {
				npcs: [npcs.the_many],
				cooldownMin: 60 * 60,
				cooldownMax: 90 * 60
			}
		}
	]
}
