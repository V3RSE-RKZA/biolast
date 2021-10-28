import { icons } from '../config'
import { BodyPart } from './raidUtils'

export function formatNumber (number: number): string {
	return number.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/**
 * @param number Number to convert into money string
 * @param showAll Whether to show icons for gold and silver even if there is 0
 * @returns A string showing the currency with icons
 */
export function formatMoney (number: number, showAll = false): string {
	const copper = number % 100
	const silver = ((number - copper) / 100) % 100
	const gold = (number - copper - (silver * 100)) / 10000
	const display = []

	if (showAll || gold > 0) {
		display.push(`${icons.tier3_currency} ${formatNumber(gold)}`)
	}
	if (showAll || silver > 0) {
		display.push(`${icons.tier2_currency} ${formatNumber(silver)}`)
	}

	if (showAll || copper > 0 || !display.length) {
		display.push(`${icons.tier1_currency} ${formatNumber(copper)}`)
	}

	return display.join(' ')
}

/**
 * Format health and max health into an emote health bar
 * @param curentHP Current health
 * @param maxHP Max health
 * @returns A health bar
 */
export function formatHealth (curentHP: number, maxHP: number): string {
	const hpPerBar = maxHP / 5
	let hpStr = ''

	for (let i = 0; i < 5; i++) {
		const barPerc = (curentHP - (hpPerBar * i)) / hpPerBar

		if (i === 0) {
			if (barPerc >= 1) {
				hpStr += icons.health.start_full
			}
			else if (barPerc >= 0.75) {
				hpStr += icons.health.start_75
			}
			else if (barPerc >= 0.5) {
				hpStr += icons.health.start_50
			}
			else if (barPerc > 0) {
				hpStr += icons.health.start_25
			}
			else {
				hpStr += icons.health.empty
			}
		}
		else if (i === 4) {
			if (barPerc >= 1) {
				hpStr += icons.health.end_full
			}
			else if (barPerc >= 0.75) {
				hpStr += icons.health.percent_75
			}
			else if (barPerc >= 0.5) {
				hpStr += icons.health.percent_50
			}
			else if (barPerc >= 0.25) {
				hpStr += icons.health.percent_25
			}
			else {
				hpStr += icons.health.empty
			}
		}

		// middle health block
		else if (barPerc >= 1) {
			hpStr += icons.health.mid_full
		}
		else if (barPerc >= 0.75) {
			hpStr += icons.health.percent_75
		}
		else if (barPerc >= 0.5) {
			hpStr += icons.health.percent_50
		}
		else if (barPerc >= 0.25) {
			hpStr += icons.health.percent_25
		}
		else {
			hpStr += icons.health.empty
		}
	}

	return hpStr
}

/**
 * Combines an array of strings with "and"
 * @param array Array to combine
 */
export function combineArrayWithAnd (array: string[]): string {
	if (array.length === 1) {
		return array[0]
	}
	else if (array.length === 2) {
		return `${array[0]} and ${array[1]}`
	}

	const last = array.pop()
	return `${array.join(', ')}, and ${last}`
}

/**
 * Combines an array of strings with "or"
 * @param array Array to combine
 */
export function combineArrayWithOr (array: string[]): string {
	if (array.length === 1) {
		return array[0]
	}
	else if (array.length === 2) {
		return `${array[0]} or ${array[1]}`
	}

	const last = array.pop()
	return `${array.join(', ')}, or ${last}`
}

/**
 * @param bodyPart Body part to get emoji for
 * @returns The emoji that represents that body part
 */
export function getBodyPartEmoji (bodyPart: BodyPart): string {
	switch (bodyPart) {
		case 'head': return '😵'
		case 'chest': return '👕'
		case 'leg': return '🦵'
		case 'arm': return '💪'
	}
}

export function getRarityDisplay (rarity: 'Common' | 'Uncommon' | 'Rare' | 'Insanely Rare'): string {
	switch (rarity) {
		case 'Common': return icons.rarities.common.join('')
		case 'Uncommon': return icons.rarities.uncommon.join('')
		case 'Rare': return icons.rarities.rare.join('')
		case 'Insanely Rare': return `${icons.rarities.insanely.join('')}${icons.rarities.rare.join('')}`
	}
}

