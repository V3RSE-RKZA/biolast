import { Collectible } from '../../types/Items'

const questObject = <T>(et: { [K in keyof T]: Collectible & { name: K } }) => et

export const collectible = questObject({
	walker_goop: {
		type: 'Collectible',
		name: 'walker_goop',
		aliases: ['goop'],
		icon: '<:walker_goop:931425196466905088>',
		sellPrice: 61,
		slotsUsed: 2,
		itemLevel: 1,
		artist: '719365897458024558'
	},
	walker_sludge: {
		type: 'Collectible',
		name: 'walker_sludge',
		aliases: ['sludge'],
		icon: '<:walker_sludge:931797105448714282>',
		sellPrice: 122,
		slotsUsed: 2,
		itemLevel: 8,
		artist: '719365897458024558'
	},
	farming_guide: {
		type: 'Collectible',
		name: 'farming_guide',
		aliases: ['farming_guide', 'guide'],
		description: 'Some helpful tips for growing crops. Drop from The Farm.',
		icon: '<:farming_guide:933857770061578260>',
		sellPrice: 120,
		slotsUsed: 1,
		itemLevel: 4,
		artist: '719365897458024558'
	},
	antique_vase: {
		type: 'Collectible',
		name: 'antique_vase',
		aliases: ['vase'],
		sellPrice: 1080,
		description: 'An old vase.',
		icon: '<:antique_vase:931797015346683934>',
		slotsUsed: 2,
		itemLevel: 7,
		artist: '719365897458024558'
	},
	tech_trash: {
		type: 'Collectible',
		name: 'tech_trash',
		aliases: ['tech', 'trash'],
		description: 'Some technology junk salvaged from the computers and other technology in the room.',
		icon: '<:tech_trash:933851376981790820>',
		sellPrice: 1020,
		slotsUsed: 2,
		itemLevel: 7,
		artist: '719365897458024558'
	},
	escape_from_fristoe: {
		type: 'Collectible',
		name: 'escape_from_fristoe',
		aliases: ['fristoe'],
		description: 'The most popular first-person shooter game of the pre-apocalyptic world!',
		icon: '<:xp_star_pixel:935658011379257375>',
		sellPrice: 1000,
		slotsUsed: 2,
		itemLevel: 7
	},
	dog_tags: {
		type: 'Collectible',
		name: 'dog_tags',
		aliases: ['tags'],
		description: 'Identification tags worn by scavengers. You can obtain dog tags of a specific user by killing them in a duel.',
		icon: '<:dog_tags:930978901788864523>',
		sellPrice: 50,
		slotsUsed: 0.1,
		itemLevel: 1,
		artist: '168958344361541633'
	}
})
