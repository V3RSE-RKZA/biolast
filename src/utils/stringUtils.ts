import { icons } from '../config'
import { BodyPart } from './duelUtils'

export function formatNumber (number: number, decimals = false): string {
	return number.toLocaleString('en', { maximumFractionDigits: decimals ? 2 : 0, minimumFractionDigits: decimals ? 2 : 0 })
}

/**
 * @param number Number to convert into money string
 * @param showEmojis Whether to show icons or not, default true
 * @returns A string showing the currency with icons
 */
export function formatMoney (number: number, showEmojis = true): string {
	if (showEmojis) {
		return `${icons.copper} ${formatNumber(number)}`
	}

	return `${formatNumber(number)} copper`
}

/**
 * Format health and max health into an emote health bar
 * @param curentHP Current health
 * @param maxHP Max health
 * @param options Options for the display
 * @param options.emojisLength How many emojis to expand the health bar to, defaults 5 emojis
 * @returns A health bar
 */
export function formatHealth (curentHP: number, maxHP: number, options: Partial<{ emojisLength: number }> = {}): string {
	const { emojisLength = 5 } = options
	const hpPerBar = maxHP / emojisLength
	let hpStr = ''

	for (let i = 0; i < emojisLength; i++) {
		const barPerc = (curentHP - (hpPerBar * i)) / hpPerBar

		if (i === 0) {
			if (barPerc >= 1) {
				hpStr += icons.health.start_full
			}
			else if (barPerc > 0) {
				hpStr += icons.health.start_half
			}
			else {
				hpStr += icons.health.start_empty
			}
		}
		else if (i === emojisLength - 1) {
			if (barPerc >= 0.9) {
				hpStr += icons.health.end_full
			}
			else if (barPerc > 0) {
				hpStr += icons.health.end_half
			}
			else {
				hpStr += icons.health.end_empty
			}
		}

		// middle health block
		else if (barPerc >= 0.75) {
			hpStr += icons.health.mid_full
		}
		else if (barPerc > 0) {
			hpStr += icons.health.mid_half
		}
		else {
			hpStr += icons.health.mid_empty
		}
	}

	return hpStr
}

/**
 * Format progress into a red bar
 * @param current Current value
 * @param maxValue Max value
 * @returns A progress bar made of emojis
 */
export function formatRedBar (current: number, maxValue: number): string {
	const hpPerBar = maxValue / 5
	let hpStr = ''

	for (let i = 0; i < 5; i++) {
		const barPerc = (current - (hpPerBar * i)) / hpPerBar

		if (i === 0) {
			if (barPerc >= 1) {
				hpStr += icons.red_bar.start_full
			}
			else if (barPerc > 0) {
				hpStr += icons.red_bar.start_half
			}
			else {
				hpStr += icons.red_bar.start_empty
			}
		}
		else if (i === 4) {
			if (barPerc >= 1) {
				hpStr += icons.red_bar.end_full
			}
			else if (barPerc > 0) {
				hpStr += icons.red_bar.end_half
			}
			else {
				hpStr += icons.red_bar.end_empty
			}
		}

		// middle health block
		else if (barPerc >= 0.75) {
			hpStr += icons.red_bar.mid_full
		}
		else if (barPerc > 0) {
			hpStr += icons.red_bar.mid_half
		}
		else {
			hpStr += icons.red_bar.mid_empty
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
		case 'Insanely Rare': return `${icons.rarities.insanely.join('')}${icons.rarities.rare.join('')} `
	}
}

