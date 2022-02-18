import { Location } from '../../types/Locations'
import { items } from '../items'

export const forest: Location = {
	display: 'The Forest',
	icon: '🚜',
	locationLevel: 3,
	boss: {
		type: 'raider',
		display: 'Zoro, The Mutated Scav',
		health: 300,
		damage: 50,
		drops: {
			common: [items.pitchfork, items.daves_drug_key, items.sledgehammer],
			uncommon: [items.paracetamol, items.farming_guide],
			rare: [items.gunsafe_code],
			rolls: 2
		},
		weapon: items.saiga_MK,
		ammo: items['5.45x39mm_FMJ_bullet'],
		usesHeals: [items.compression_bandage],
		quotes: [],
		armor: items.wooden_armor,
		helmet: items.wooden_helmet,
		xp: 750,
		boss: true,
		respawnTime: 60 * 60
	},
	quests: [],
	areas: [
		{
			display: 'Clearing',
			quote: 'its a large open field surrounded by trees on all sides.',
			loot: {
				common: {
					items: [items.bandage, items.sledgehammer],
					xp: 5
				},
				uncommon: {
					items: [items.ifak_medkit],
					xp: 15
				},
				rare: {
					items: [items['.45_ACP_FMJ_bullet'], items['9mm_HP_bullet']],
					xp: 20
				},
				rolls: 2
			},
			scavengeCooldown: 60
		},
		{
			display: 'Treehouse',
			quote: '',
			loot: {
				common: {
					items: [items.splint],
					xp: 5
				},
				uncommon: {
					items: [items.fire_axe],
					xp: 10
				},
				rare: {
					items: [items['glock-17']],
					xp: 20
				},
				rolls: 2
			},
			npc: {
				type: 'raider',
				display: 'Cultist',
				health: 70,
				damage: 50,
				drops: {
					common: [items.bandage],
					uncommon: [items.ifak_medkit, items['anti-biotics'], items.splint],
					rare: [items.cloth_backpack],
					rolls: 1
				},
				weapon: items['glock-17'],
				ammo: items['9mm_HP_bullet'],
				armor: items.cloth_armor,
				helmet: items.wooden_helmet,
				xp: 40,
				boss: false,
				respawnTime: 60 * 4
			},
			scavengeCooldown: 60 * 2
		},
		{
			display: 'Cave',
			loot: {
				common: {
					items: [],
					xp: 5
				},
				uncommon: {
					items: [items.wooden_armor, items.cloth_backpack, items.wooden_helmet],
					xp: 10
				},
				rare: {
					items: [items.chainsaw],
					xp: 20
				},
				rolls: 2
			},
			npc: {
				type: 'raider',
				display: 'Raider',
				health: 30,
				damage: 15,
				drops: {
					common: [items.bandage],
					uncommon: [items.ifak_medkit, items['anti-biotics'], items.splint, items.cloth_backpack],
					rare: [items['9mm_HP_bullet']],
					rolls: 1
				},
				weapon: items.makeshift_shotgun,
				ammo: items.makeshift_shell,
				armor: items.wooden_armor,
				helmet: items.wooden_helmet,
				xp: 50,
				boss: false,
				respawnTime: 60 * 3
			},
			scavengeCooldown: 90
		},
		{
			display: 'Campsite',
			quote: '',
			loot: {
				common: {
					items: [],
					xp: 8
				},
				uncommon: {
					items: [],
					xp: 10
				},
				rare: {
					items: [],
					xp: 15
				},
				rolls: 4
			},
			scavengeCooldown: 60 * 10
		},
		{
			display: 'Abandoned Cabin',
			quote: '',
			loot: {
				common: {
					items: [],
					xp: 5
				},
				uncommon: {
					items: [],
					xp: 10
				},
				rare: {
					items: [],
					xp: 20
				},
				rolls: 1
			},
			requiresKey: [items.sacred_pendant],
			keyUsedToFightNPC: false,
			scavengeCooldown: 60
		}
	]
}
