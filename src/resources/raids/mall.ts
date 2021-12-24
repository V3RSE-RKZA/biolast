import { Location } from '../../types/Locations'
import { items } from '../items'
import { npcs } from '../npcs'

export const mall: Location = {
	id: 'mall',
	display: 'The Mall',
	requirements: {
		minLevel: 8
	},
	areas: [
		{
			name: 'antique-store',
			display: 'Antique Store',
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
					items: [items.antique_vase, items.small_pouch],
					xp: 25
				},
				rolls: 1
			}
		},
		{
			name: 'food-court',
			display: 'Food Court',
			loot: {
				common: {
					items: [items.pizza_slice, items.pretzel, items.fork],
					xp: 10
				},
				uncommon: {
					items: [items.knife, items.small_pouch],
					xp: 15
				},
				rare: {
					items: [items.metal_shank, items.aramid_armor],
					xp: 25
				},
				rolls: 1
			},
			npcSpawns: {
				chance: 50,
				npcs: [npcs.bloated_walker]
			}
		},
		{
			name: 'pathway-park',
			display: 'pathway-park',
			loot: {
				common: {
					items: [items.bandage, items['9mm_FMJ_bullet']],
					xp: 10
				},
				uncommon: {
					items: [items['glock-17'], items.dome_depot_key, items.aramid_armor, items.cloth_backpack],
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
			name: 'dome-depot',
			display: 'Dome Depot',
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
			name: 'plaza',
			display: 'plaza',
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
				chance: 50,
				npcs: [npcs.crawler_medium]
			}
		},
		{
			name: 'dereks-hunting-shop',
			display: 'Dereks Hunting Shop',
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
			name: 'game-n-go',
			display: 'Game N Go',
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
			name: 'staff-break-room',
			display: 'Staff Break Room',
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
				chance: 80,
				npcs: [npcs.derek]
			}
		},
		{
			name: 'florreds-pharmacy',
			display: 'Florreds Pharmacy',
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
			name: 'security-room',
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
				chance: 50,
				npcs: [npcs.walker_security_officer]
			}
		}
	]
}
