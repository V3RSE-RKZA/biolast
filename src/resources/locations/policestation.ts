import { Location } from '../../types/Locations'
import { items } from '../items'
import { npcs } from '../npcs'

export const station: Location = {
	id: 'policestation',
	display: 'The Police Station',
	requirements: {
		minLevel: 15
	},
	areas: [
		{
			display: 'Parking Lot',
			loot: {
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
				rolls: 1
			}
		},
		{
			display: 'Evidence Locker',
			loot: {
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
				rolls: 1
			},
			npcSpawns: {
				chance: 30,
				npcs: [npcs.bloated_walker]
			}
		},
		{
			display: 'Pathway Park',
			loot: {
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
				rolls: 2
			},
			npcSpawns: {
				chance: 50,
				npcs: [npcs.medium_raider, npcs.psycho_raider]
			}
		},
		{
			display: 'Uniform Area',
			loot: {
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
				rolls: 2
			},
			requiresKey: [items.dome_depot_key, items.security_key],
			keyIsOptional: false
		},
		{
			display: 'District Office',
			loot: {
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
				rolls: 2
			},
			npcSpawns: {
				chance: 30,
				npcs: [npcs.crawler_medium]
			}
		},
		{
			display: 'Weapons and Ammunition Room',
			loot: {
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
				rolls: 3
			},
			requiresKey: [items.dereks_shop_key, items.security_key],
			keyIsOptional: false
		},
		{
			display: 'Jail Cell-1',
			loot: {
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
				rolls: 2
			},
			npcSpawns: {
				chance: 50,
				npcs: [npcs.game_raider, npcs.psycho_raider]
			}
		},
		{
			display: 'Jail Cell-2',
			loot: {
				common: {
					items: [items.ifak_medkit, items.compression_bandage],
					xp: 10
				},
				uncommon: {
					items: [items['anti-biotics'], items.splint, items.adrenaline, items.adderall],
					xp: 15
				},
				rare: {
					items: [items.paracetamol, items.morphine, items.duffle_bag],
					xp: 25
				},
				rolls: 2
			},
			requiresKey: [items.florreds_pharmacy_key, items.security_key],
			keyIsOptional: false
		},
		{
			display: 'Security Room',
			loot: {
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
				rolls: 2
			},
			npcSpawns: {
				chance: 40,
				npcs: [npcs.walker_security_officer]
			}
		}
	]
}
