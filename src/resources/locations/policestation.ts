import { Location } from '../../types/Locations'
import { NPC } from '../../types/NPCs'
import { items } from '../items'

/*
	npcs that appear in this location
*/
// TODO this bloated walker appears in The Farm with same stats, change this to something stronger
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
	boss: false,
	respawnTime: 60 * 2
}
const mediumRaider: NPC = {
	type: 'raider',
	display: 'Raider',
	health: 60,
	damage: 35,
	drops: {
		common: [items['9mm_FMJ_bullet']],
		uncommon: [items.ifak_medkit, items['anti-biotics']],
		rare: [items['9mm_RIP_bullet'], items.duffle_bag],
		rolls: 1
	},
	weapon: items['glock-17'],
	ammo: items['9mm_HP_bullet'],
	quotes: [
		'~*You hear footsteps nearby*~'
	],
	armor: items.wooden_armor,
	helmet: items.wooden_helmet,
	xp: 125,
	boss: false,
	respawnTime: 60 * 2
}
const psychoRaider: NPC = {
	type: 'raider',
	display: 'Psycho',
	health: 40,
	damage: 30,
	drops: {
		common: [items.knife],
		uncommon: [items.fire_axe, items.splint],
		rare: [items.hypo_stim, items.duffle_bag],
		rolls: 1
	},
	weapon: items.chainsaw,
	quotes: [
		'~*You hear footsteps nearby*~',
		'~*You hear someone cackling maniacally*~'
	],
	helmet: items.psycho_mask,
	xp: 125,
	boss: false,
	respawnTime: 60 * 2
}
const mediumCrawler: NPC = {
	type: 'walker',
	display: 'Crawler',
	health: 40,
	damage: 50,
	drops: {
		common: [items.compression_bandage],
		uncommon: [items['9mm_FMJ_bullet']],
		rare: [items.walker_goop],
		rolls: 1
	},
	quotes: [
		'~*You hear a deep growl close by*~'
	],
	xp: 60,
	chanceToBite: 25,
	attackPenetration: 1.9,
	boss: false,
	respawnTime: 60 * 2
}
const gameNGoRaider: NPC = {
	type: 'raider',
	display: 'Raider',
	health: 60,
	damage: 35,
	drops: {
		common: [items['9mm_FMJ_bullet']],
		uncommon: [items.ifak_medkit, items['anti-biotics'], items.splint],
		rare: [items['9mm_RIP_bullet'], items.escape_from_fristoe],
		rolls: 1
	},
	weapon: items['glock-17'],
	ammo: items['9mm_HP_bullet'],
	quotes: [
		'~*You hear footsteps nearby*~'
	],
	armor: items.wooden_armor,
	helmet: items.wooden_helmet,
	xp: 125,
	boss: false,
	respawnTime: 60 * 2
}
const securityOfficerWalker: NPC = {
	type: 'walker',
	display: 'Walker Security Officer',
	health: 60,
	damage: 30,
	drops: {
		common: [items.police_baton],
		uncommon: [items['9mm_FMJ_bullet'], items.duffle_bag, items.walker_goop],
		rare: [items['glock-17'], items.security_key],
		rolls: 1
	},
	quotes: [
		'~*You hear footsteps nearby*~',
		'~*You hear a deep growl close by*~'
	],
	armor: items.aramid_armor,
	xp: 80,
	chanceToBite: 10,
	attackPenetration: 1.5,
	boss: false,
	respawnTime: 60 * 2
}

export const station: Location = {
	display: 'The Police Station',
	icon: '🚓',
	locationLevel: 4,
	boss: securityOfficerWalker,
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
			},
			scavengeCooldown: 60
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
			npcSpawns: [bloatedWalker],
			scavengeCooldown: 60
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
			npcSpawns: [mediumRaider, psychoRaider],
			scavengeCooldown: 60
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
			keyIsOptional: false,
			scavengeCooldown: 60
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
			npcSpawns: [mediumCrawler],
			scavengeCooldown: 60
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
			keyIsOptional: false,
			scavengeCooldown: 60
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
			npcSpawns: [gameNGoRaider, psychoRaider],
			scavengeCooldown: 60
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
			keyIsOptional: false,
			scavengeCooldown: 60
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
			npcSpawns: [securityOfficerWalker],
			scavengeCooldown: 60
		}
	]
}
