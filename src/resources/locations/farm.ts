import { Location } from '../../types/Locations'
import { items } from '../items'
import { npcs } from '../npcs'

export const farm: Location = {
	id: 'farm',
	display: 'The Farm',
	requirements: {
		minLevel: 3
	},
	areas: [
		{
			display: 'Fields',
			loot: {
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
				rolls: 1
			}
		},
		{
			display: 'Cellar',
			loot: {
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
				rolls: 2
			},
			npcSpawns: {
				chance: 50,
				npcs: [npcs.raider_weak, npcs.feral_animal]
			}
		},
		{
			display: 'Barn',
			loot: {
				common: {
					items: [items.scythe, items.corn, items.splint, items.farming_guide],
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
				rolls: 2
			},
			npcSpawns: {
				chance: 50,
				npcs: [npcs.bloated_walker]
			}
		},
		{
			display: 'Warehouse',
			loot: {
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
				rolls: 2
			},
			requiresKey: [items.warehouse_key],
			keyIsOptional: false
		},
		{
			display: 'Bedroom',
			loot: {
				common: {
					items: [items.truck_key, items.warehouse_key, items.compression_bandage, items['9mm_HP_bullet']],
					xp: 8
				},
				uncommon: {
					items: [items['glock-17'], items['9mm_RIP_bullet'], items['20-gauge_buckshot']],
					xp: 10
				},
				rare: {
					items: [items.bobwhite_g2, items['20-gauge_slug']],
					xp: 15
				},
				rolls: 4
			},
			requiresKey: [items.gunsafe_code],
			keyIsOptional: false
		},
		{
			display: 'Drug Room',
			loot: {
				common: {
					items: [items.compression_bandage, items.bandage],
					xp: 8
				},
				uncommon: {
					items: [items.adrenaline, items.morphine],
					xp: 10
				},
				rare: {
					items: [items.daves_concoction, items.adderall],
					xp: 15
				},
				rolls: 2
			},
			requiresKey: [items.daves_drug_key],
			keyIsOptional: false
		}
	]
}
