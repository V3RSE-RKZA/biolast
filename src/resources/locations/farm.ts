import { Location } from '../../types/Locations'
import { NPC } from '../../types/NPCs'
import { items } from '../items'

/*
	npcs that appear in this location
*/
// TODO change this raider weak to something stronger to emphasize this disparity between this location and suburbs
const raiderWeak: NPC = {
	type: 'raider',
	display: 'Raider',
	health: 30,
	damage: 25,
	drops: {
		common: [items.bandage],
		uncommon: [items.ifak_medkit, items['anti-biotics'], items.splint],
		rare: [items['5.45x39mm_FMJ_bullet'], items['9mm_FMJ_bullet'], items.small_pouch],
		rolls: 1
	},
	weapon: items.luger,
	ammo: items['.22LR_bullet'],
	quotes: [
		'~*You hear footsteps nearby*~'
	],
	armor: items.cloth_armor,
	helmet: items.cloth_helmet,
	xp: 40,
	boss: false
}
const feralAnimal: NPC = {
	type: 'walker',
	display: 'Feral Animal',
	health: 35,
	damage: 45,
	drops: {
		common: [items.apple, items.corn],
		uncommon: [items.apple],
		rare: [items.corn],
		rolls: 1
	},
	quotes: [
		'~*You hear hiss nearby*~',
		'~*You hear a deep growl close by*~'
	],
	xp: 35,
	chanceToBite: 30,
	attackPenetration: 1.6,
	boss: false
}
const bloatedWalker: NPC = {
	type: 'walker',
	display: 'Bloated Walker',
	health: 50,
	damage: 35,
	drops: {
		common: [items.pitchfork, items.walker_goop],
		uncommon: [items.apple],
		rare: [items.fire_axe],
		rolls: 1
	},
	quotes: [
		'~*You hear footsteps nearby*~',
		'~*You hear a deep growl close by*~'
	],
	xp: 50,
	chanceToBite: 15,
	attackPenetration: 1.3,
	boss: false
}
const daveTheRedneckBoss: NPC = {
	type: 'raider',
	display: 'Dave, The Redneck',
	health: 185,
	damage: 20,
	drops: {
		common: [items.pitchfork, items.daves_drug_key, items.P320],
		uncommon: [items.sauce_pan, items.paracetamol, items.farming_guide],
		rare: [items.sledgehammer, items.gunsafe_code],
		rolls: 2
	},
	weapon: items.saiga_MK,
	ammo: items['5.45x39mm_FMJ_bullet'],
	quotes: [
		'~*You hear the giggles and crackles of a man...*~',
		'~*Dave: Did I hear somebody?*~',
		'~*Dave: buUUUUuUrP*~',
		'~*Dave: What do you mean, zombies?*~',
		'~*Dave: Damn pterodactyls eating my crops again.*~'
	],
	armor: items.cloth_armor,
	helmet: items.sauce_pan,
	xp: 500,
	boss: true
}

export const farm: Location = {
	display: 'The Farm',
	icon: '🚜',
	locationLevel: 2,
	boss: daveTheRedneckBoss,
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
				npcs: [raiderWeak, feralAnimal]
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
				npcs: [bloatedWalker]
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
