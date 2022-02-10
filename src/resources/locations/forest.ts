import { Location } from '../../types/Locations'
import { items } from '../items'

export const forest: Location = {
	display: 'The Forest',
	icon: '🚜',
	locationLevel: 3,
	boss: {
		type: 'raider',
		display: 'Dave, The Redneck',
		health: 185,
		damage: 31,
		drops: {
			common: [items.pitchfork, items.daves_drug_key, items.sledgehammer],
			uncommon: [items.paracetamol, items.farming_guide],
			rare: [items.gunsafe_code],
			rolls: 2
		},
		weapon: items.m1911,
		ammo: items['.45_ACP_FMJ_bullet'],
		usesStimulants: [items.adrenaline],
		usesHeals: [items.compression_bandage],
		quotes: [
			'Did I hear somebody?',
			'*buUUUUuUrP*',
			'Damn pterodactyls eating my crops again.',
			'You\'ll never get to my stash you damn raiders!',
			'Stay away from my farm!!'
		],
		armor: items.cloth_armor,
		helmet: items.sauce_pan,
		xp: 500,
		boss: true,
		respawnTime: 60 * 60
	},
	quests: [],
	areas: [
		{
			display: 'Abandoned Cabin',
			quote: '',
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
			display: 'Treehouse',
			quote: '',
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
			npc: {
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
			},
			scavengeCooldown: 60
		},
		{
			display: 'Clearing',
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
			npc: {
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
			},
			scavengeCooldown: 60
		},
		{
			display: 'Cave',
			loot: {
				common: {
					items: [items.apple, items.compression_bandage],
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
					rare: [items['9mm_FMJ_bullet']],
					rolls: 1
				},
				weapon: items.luger,
				ammo: items['.22LR_bullet'],
				armor: items.wooden_armor,
				xp: 40,
				boss: false,
				respawnTime: 60 * 2
			},
			scavengeCooldown: 60
		},
		{
			display: 'Campsite',
			quote: '',
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
			keyUsedToFightNPC: false,
			scavengeCooldown: 60 * 10
		}
	]
}
