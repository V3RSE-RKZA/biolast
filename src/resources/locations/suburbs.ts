import { Location } from '../../types/Locations'
import { items } from '../items'

export const suburbs: Location = {
	display: 'The Suburbs',
	icon: '<:suburbs:939647476674220112>',
	locationLevel: 1,
	boss: {
		type: 'raider',
		display: 'Cain, The Gravekeeper',
		health: 105,
		damage: 15,
		drops: {
			common: [items.bandage],
			uncommon: [items.ifak_medkit],
			rare: [items.sledgehammer, items.bone_armor, items.bone_helmet],
			rolls: 1
		},
		weapon: items.luger,
		ammo: items['.22LR_bullet'],
		quotes: [
			'I will lay you all to rest.',
			'I have a plot specifically made for you.',
			'Do not be afraid of death. Welcome it.',
			'The dead shall not be disturbed.',
			'The world you and I once knew is long gone.',
			'You dare slaughter them with no remorse?'
		],
		armor: items.cloth_armor,
		helmet: items.cloth_helmet,
		xp: 100,
		boss: true,
		respawnTime: 60 * 60
	},
	quests: [
		{
			type: 'Region',
			id: 'suburbs_key_scavenge_1',
			questType: 'Scavenge With A Key',
			progressGoal: 2,
			key: items.shed_key
		},
		{
			type: 'Region',
			id: 'suburbs_key_scavenge_2',
			questType: 'Scavenge With A Key',
			progressGoal: 3,
			key: items.shed_key
		},
		{
			type: 'Region',
			id: 'suburbs_goop_retrieve_1',
			questType: 'Retrieve Item',
			progressGoal: 2,
			item: items.walker_goop
		},
		{
			type: 'Region',
			id: 'suburbs_goop_retrieve_2',
			questType: 'Retrieve Item',
			progressGoal: 3,
			item: items.walker_goop
		}
	],
	areas: [
		{
			display: 'Backstreets',
			loot: {
				common: {
					items: [items.wooden_bat],
					xp: 5
				},
				uncommon: {
					items: [items.bandage, items.makeshift_pistol_bullet],
					xp: 10
				},
				rare: {
					items: [items.metal_bat, items.makeshift_pistol, items.splint],
					xp: 20
				},
				rolls: 1
			},
			scavengeCooldown: 60
		},
		{
			display: 'Red House',
			quote: 'My neighbors house. It looks like someone is still inside.',
			loot: {
				common: {
					items: [items.makeshift_pistol, items.makeshift_pistol_bullet],
					xp: 5
				},
				uncommon: {
					items: [items.makeshift_rifle_bullet],
					xp: 10
				},
				rare: {
					items: [items.luger, items['.22LR_bullet'], items.sledgehammer, items.shed_key],
					xp: 20
				},
				rolls: 2
			},
			npc: {
				type: 'walker',
				display: 'Walker',
				health: 22,
				damage: 15,
				drops: {
					common: [items.bandage],
					uncommon: [items.makeshift_pistol_bullet, items.small_pouch],
					rare: [items.walker_goop],
					rolls: 2
				},
				xp: 20,
				chanceToBite: 0,
				attackPenetration: 0.3,
				boss: false,
				respawnTime: 60 * 4
			},
			scavengeCooldown: 60
		},
		{
			display: 'Backyard Shed',
			quote: 'the shed behind my neighbors house. I can see a figure moving through the darkness inside.',
			loot: {
				common: {
					items: [items.cloth_armor, items.cloth_helmet],
					xp: 5
				},
				uncommon: {
					items: [items.makeshift_rifle],
					xp: 10
				},
				rare: {
					items: [items.wooden_armor, items.wooden_helmet],
					xp: 20
				},
				rarest: {
					items: [items.makeshift_shotgun],
					xp: 25
				},
				rolls: 2
			},
			npc: {
				type: 'walker',
				display: 'Walker',
				health: 30,
				damage: 10,
				drops: {
					common: [items.bandage, items['.22LR_bullet']],
					uncommon: [items.makeshift_pistol_bullet, items.small_pouch, items.luger],
					rare: [items.walker_goop],
					rolls: 1
				},
				armor: items.cloth_armor,
				helmet: items.cloth_helmet,
				xp: 40,
				chanceToBite: 0,
				attackPenetration: 0.1,
				boss: false,
				respawnTime: 60 * 4
			},
			requiresKey: [items.shed_key],
			keyUsedToFightNPC: false,
			scavengeCooldown: 60 * 2
		},
		{
			display: 'Apartments',
			loot: {
				common: {
					items: [items.shed_key, items.wooden_bat, items.bandage],
					xp: 5
				},
				uncommon: {
					items: [items.metal_bat, items.knife],
					xp: 15
				},
				rare: {
					items: [items.luger, items['.22LR_bullet']],
					xp: 20
				},
				rolls: 2
			},
			npc: {
				type: 'walker',
				display: 'Crawler',
				health: 20,
				damage: 15,
				drops: {
					common: [items.makeshift_pistol, items.makeshift_pistol_bullet, items.cloth_armor],
					uncommon: [items['anti-biotics'], items.makeshift_rifle],
					rare: [items.makeshift_shell, items.small_pouch, items.walker_goop],
					rolls: 2
				},
				xp: 20,
				chanceToBite: 0,
				attackPenetration: 0.1,
				boss: false,
				respawnTime: 60 * 4
			},
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
					items: [items.metal_bat, items.bandage, items.makeshift_pistol_bullet],
					xp: 10
				},
				rare: {
					items: [items.makeshift_pistol],
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
					items: [items.makeshift_rifle_bullet, items['.22LR_bullet']],
					xp: 5
				},
				uncommon: {
					items: [items['anti-biotics'], items.splint, items.makeshift_rifle],
					xp: 10
				},
				rare: {
					items: [items.wooden_helmet, items.wooden_armor, items.luger],
					xp: 20
				},
				rolls: 2
			},
			npc: {
				type: 'walker',
				display: 'Walker',
				health: 30,
				damage: 10,
				drops: {
					common: [items.bandage, items['.22LR_bullet']],
					uncommon: [items.makeshift_pistol_bullet, items.small_pouch, items.luger],
					rare: [items.walker_goop],
					rolls: 1
				},
				armor: items.cloth_armor,
				helmet: items.cloth_helmet,
				xp: 40,
				chanceToBite: 0,
				attackPenetration: 0.1,
				boss: false,
				respawnTime: 60 * 4
			},
			scavengeCooldown: 60 * 2
		}
	]
}
