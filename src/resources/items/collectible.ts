import { Collectible } from '../../types/Items'

const questObject = <T>(et: { [K in keyof T]: Collectible & { name: K } }) => et

export const collectible = questObject({
	walker_goop: {
		type: 'Collectible',
		name: 'walker_goop',
		aliases: ['goop'],
		icon: '<:quest_item:886561850525896724>',
		sellPrice: 61,
		slotsUsed: 2,
		itemLevel: 1
	},
	farming_guide: {
		type: 'Collectible',
		name: 'farming_guide',
		aliases: ['farming_guide', 'guide'],
		description: 'Some helpful tips for growing crops. Drop from The Farm.',
		icon: '<:quest_item:886561850525896724>',
		sellPrice: 120,
		slotsUsed: 1,
		itemLevel: 1
	},
	antique_vase: {
		type: 'Collectible',
		name: 'antique_vase',
		aliases: ['vase'],
		sellPrice: 150,
		description: 'An old vase.',
		icon: '<:quest_item:886561850525896724>',
		slotsUsed: 2,
		itemLevel: 1
	},
	tech_trash: {
		type: 'Collectible',
		name: 'tech_trash',
		aliases: ['tech', 'trash'],
		description: 'Some technology junk salvaged from the computers and other technology in the room.',
		icon: '<:quest_item:886561850525896724>',
		sellPrice: 180,
		slotsUsed: 2,
		itemLevel: 1
	},
	escape_from_fristoe: {
		type: 'Collectible',
		name: 'escape_from_fristoe',
		aliases: ['fristoe'],
		description: 'The most popular first-person shooter game of the pre-apocalyptic world!',
		icon: '<:quest_item:886561850525896724>',
		sellPrice: 180,
		slotsUsed: 2,
		itemLevel: 1
	},
	dog_tags: {
		type: 'Collectible',
		name: 'dog_tags',
		aliases: ['tags'],
		description: 'Identification tags worn by scavengers. You can obtain dog tags of a specific user by killing them in raid.',
		icon: '🏷️',
		sellPrice: 25,
		slotsUsed: 0.1,
		itemLevel: 1
	}
})
