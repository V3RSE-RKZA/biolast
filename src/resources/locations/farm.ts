import { Location } from '../../types/Locations'
import { NPC } from '../../types/NPCs'
import { items } from '../items'

/*
	npcs that appear in this location
*/
const raiderWeak: NPC = {
	type: 'raider',
	display: 'Raider',
	health: 25,
	damage: 25,
	drops: {
		common: [items.bandage],
		uncommon: [items.ifak_medkit, items['anti-biotics'], items.splint, items.cloth_backpack],
		rare: [items['9mm_FMJ_bullet']],
		rolls: 1
	},
	weapon: items.luger,
	ammo: items['.22LR_bullet'],
	armor: items.cloth_armor,
	helmet: items.cloth_helmet,
	xp: 40,
	boss: false,
	respawnTime: 60 * 2
}
const raiderHelmet: NPC = {
	type: 'raider',
	display: 'Raider',
	health: 30,
	damage: 15,
	drops: {
		common: [items.bandage],
		uncommon: [items.ifak_medkit, items['anti-biotics'], items.splint, items.cloth_backpack],
		rare: [items['9mm_FMJ_bullet']],
		rolls: 1
	},
	weapon: items.luger,
	ammo: items['.22LR_bullet'],
	armor: items.wooden_armor,
	xp: 40,
	boss: false,
	respawnTime: 60 * 2
}
const bloatedWalker: NPC = {
	type: 'walker',
	display: 'Bloated Walker',
	health: 50,
	damage: 35,
	drops: {
		common: [items.pitchfork],
		uncommon: [items.apple, items.corn],
		rare: [items.fire_axe],
		rolls: 1
	},
	xp: 50,
	chanceToBite: 15,
	attackPenetration: 1.3,
	boss: false,
	respawnTime: 60 * 2
}
const daveTheRedneckBoss: NPC = {
	type: 'raider',
	display: 'Dave, The Redneck',
	health: 185,
	damage: 20,
	drops: {
		common: [items.pitchfork, items.daves_drug_key, items.P320],
		uncommon: [items.paracetamol, items.farming_guide, items.sledgehammer],
		rare: [items.gunsafe_code],
		rolls: 2
	},
	weapon: items.saiga_MK,
	ammo: items['5.45x39mm_FMJ_bullet'],
	usesStimulants: [items.adrenaline],
	usesHeals: [items.compression_bandage],
	quotes: [
		'~*You hear giggles and crackles...*~',
		'~*Dave: Did I hear somebody?*~',
		'~*Dave: buUUUUuUrP*~',
		'~*Dave: What do you mean, zombies?*~',
		'~*Dave: Damn pterodactyls eating my crops again.*~'
	],
	armor: items.cloth_armor,
	helmet: items.sauce_pan,
	xp: 500,
	boss: true,
	respawnTime: 60 * 60
}

export const farm: Location = {
	display: 'The Farm',
	icon: '🚜',
	locationLevel: 2,
	boss: daveTheRedneckBoss,
	quests: [
		{
			type: 'Region',
			id: 'farm_goop_retrieve_2',
			questType: 'Retrieve Item',
			progressGoal: 2,
			item: items.walker_goop
		}
	],
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
			},
			scavengeCooldown: 60
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
			npc: bloatedWalker,
			scavengeCooldown: 60
		},
		{
			display: 'Barn',
			loot: {
				common: {
					items: [items.scythe, items.corn, items.splint],
					xp: 5
				},
				uncommon: {
					items: [items.pitchfork, items.farming_guide, items.fire_axe],
					xp: 10
				},
				rare: {
					items: [items['glock-17']],
					xp: 20
				},
				rolls: 2
			},
			npc: raiderWeak,
			scavengeCooldown: 60
		},
		{
			display: 'Warehouse',
			loot: {
				common: {
					items: [items.apple, items.compression_bandage],
					xp: 5
				},
				uncommon: {
					items: [items.wooden_armor, items.knife, items.cloth_backpack, items.wooden_helmet],
					xp: 10
				},
				rare: {
					items: [items.chainsaw],
					xp: 20
				},
				rolls: 2
			},
			npc: raiderHelmet,
			scavengeCooldown: 60
		},
		{
			display: 'Bedroom',
			loot: {
				common: {
					items: [items.compression_bandage, items['9mm_HP_bullet']],
					xp: 8
				},
				uncommon: {
					items: [items['9mm_RIP_bullet'], items['20-gauge_buckshot']],
					xp: 10
				},
				rare: {
					items: [items.bobwhite_g2, items['20-gauge_slug']],
					xp: 15
				},
				rolls: 4
			},
			requiresKey: [items.gunsafe_code],
			keyIsOptional: false,
			scavengeCooldown: 60
		},
		{
			display: 'Drug Room',
			loot: {
				common: {
					items: [items.compression_bandage, items.bandage],
					xp: 8
				},
				uncommon: {
					items: [items.adrenaline, items.morphine, items.adderall],
					xp: 10
				},
				rare: {
					items: [items.daves_concoction],
					xp: 15
				},
				rolls: 2
			},
			requiresKey: [items.daves_drug_key],
			keyIsOptional: false,
			scavengeCooldown: 60
		}
	]
}
