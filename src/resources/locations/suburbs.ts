import { Location } from '../../types/Locations'
import { NPC } from '../../types/NPCs'
import { items } from '../items'

/*
	npcs that appear in this location
*/
const walkerWeak: NPC = {
	type: 'walker',
	display: 'Walker',
	health: 30,
	damage: 20,
	drops: {
		common: [items.bandage],
		uncommon: [items.makeshift_pistol_bullet, items.small_pouch, items.walker_goop],
		rare: [items['9mm_FMJ_bullet']],
		rolls: 1
	},
	xp: 20,
	chanceToBite: 15,
	attackPenetration: 0.6,
	boss: false,
	respawnTime: 60 * 2
}
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
	armor: items.cloth_armor,
	helmet: items.cloth_helmet,
	xp: 40,
	boss: false,
	respawnTime: 60 * 2
}
const crawlerWeak: NPC = {
	type: 'walker',
	display: 'Crawler',
	health: 20,
	damage: 35,
	drops: {
		common: [items.bandage],
		uncommon: [items.makeshift_pistol_bullet],
		rare: [items.walker_goop],
		rolls: 1
	},
	xp: 20,
	chanceToBite: 20,
	attackPenetration: 0.9,
	boss: false,
	respawnTime: 60 * 2
}
const cainTheGravekeeperBoss: NPC = {
	type: 'raider',
	display: 'Cain, The Gravekeeper',
	health: 125,
	damage: 30,
	drops: {
		common: [items.bandage],
		uncommon: [items.ifak_medkit],
		rare: [items.sledgehammer, items.bone_armor],
		rolls: 1
	},
	weapon: items['glock-17'],
	ammo: items['9mm_FMJ_bullet'],
	quotes: [
		'~*Cain: Life is suffering.*~',
		'~*Cain: I have a plot specifically made for you.*~',
		'~*Cain: Do not be afraid of death. Welcome it.*~',
		'~*Cain: The dead shall not be disturbed.*~'
	],
	armor: items.wooden_armor,
	helmet: items.wooden_helmet,
	xp: 100,
	boss: true,
	respawnTime: 60 * 10
}

export const suburbs: Location = {
	display: 'The Suburbs',
	icon: '🏡',
	locationLevel: 1,
	boss: cainTheGravekeeperBoss,
	areas: [
		{
			display: 'Backstreets',
			loot: {
				common: {
					items: [items.wooden_bat],
					xp: 5
				},
				uncommon: {
					items: [items.bandage, items.splint, items.makeshift_pistol_bullet],
					xp: 10
				},
				rare: {
					items: [items.metal_bat, items.makeshift_pistol],
					xp: 20
				},
				rolls: 1
			},
			scavengeCooldown: 60
		},
		{
			display: 'Red House',
			loot: {
				common: {
					items: [items.makeshift_pistol, items.makeshift_pistol_bullet],
					xp: 5
				},
				uncommon: {
					items: [items.makeshift_rifle, items.makeshift_rifle_bullet],
					xp: 10
				},
				rare: {
					items: [items.luger, items['.22LR_bullet'], items.sledgehammer, items.shed_key],
					xp: 20
				},
				rolls: 2
			},
			npcSpawns: [walkerWeak],
			scavengeCooldown: 60
		},
		{
			display: 'Apartments',
			loot: {
				common: {
					items: [items.shed_key, items.wooden_bat, items.bandage],
					xp: 5
				},
				uncommon: {
					items: [items.metal_bat],
					xp: 15
				},
				rare: {
					items: [items.luger, items['.22LR_bullet']],
					xp: 20
				},
				rolls: 2
			},
			npcSpawns: [raiderWeak],
			scavengeCooldown: 60
		},
		{
			display: 'Backyard Shed',
			loot: {
				common: {
					items: [items.cloth_armor, items.cloth_helmet],
					xp: 5
				},
				uncommon: {
					items: [items.small_pouch, items.wooden_helmet],
					xp: 10
				},
				rare: {
					items: [items.knife, items.ifak_medkit, items.wooden_armor],
					xp: 20
				},
				rolls: 2
			},
			requiresKey: [items.shed_key],
			keyIsOptional: false,
			scavengeCooldown: 60
		},
		{
			display: 'Park',
			loot: {
				common: {
					items: [items.wooden_bat],
					xp: 5
				},
				uncommon: {
					items: [items.metal_bat, items.bandage],
					xp: 10
				},
				rare: {
					items: [items.wooden_helmet, items.metal_bat],
					xp: 20
				},
				rolls: 1
			},
			scavengeCooldown: 60
		},
		{
			display: 'Cedar Lake',
			loot: {
				common: {
					items: [items.makeshift_rifle, items.makeshift_rifle_bullet, items['.22LR_bullet']],
					xp: 5
				},
				uncommon: {
					items: [items['anti-biotics'], items.splint, items['9mm_FMJ_bullet']],
					xp: 10
				},
				rare: {
					items: [items['glock-17'], items.P320, items.wooden_helmet, items.wooden_armor],
					xp: 20
				},
				rolls: 2
			},
			npcSpawns: [crawlerWeak],
			scavengeCooldown: 60
		}
	]
}
