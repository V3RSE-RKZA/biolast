import { ComponentType, ButtonStyle, ComponentActionRow, ComponentButton } from 'slash-create'
import { icons } from '../config'

export const CONFIRM_BUTTONS: ComponentActionRow[] = [
	{
		type: ComponentType.ACTION_ROW,
		components: [
			{
				type: ComponentType.BUTTON,
				label: 'Confirm',
				style: ButtonStyle.SUCCESS,
				custom_id: 'confirmed'
			},
			{
				type: ComponentType.BUTTON,
				label: 'Cancel',
				style: ButtonStyle.DESTRUCTIVE,
				custom_id: 'canceled'
			}
		]
	}
]

export const RED_BUTTON = (label: string, customID: string, disabled?: boolean, icon?: string): ComponentButton => ({
	type: ComponentType.BUTTON,
	label,
	custom_id: customID,
	style: ButtonStyle.DESTRUCTIVE,
	disabled,
	emoji: icon ? {
		name: icon
	} : undefined
})

export const BLUE_BUTTON = (label: string, customID: string, disabled?: boolean, icon?: string): ComponentButton => ({
	type: ComponentType.BUTTON,
	label,
	custom_id: customID,
	style: ButtonStyle.PRIMARY,
	disabled,
	emoji: icon ? {
		name: icon
	} : undefined
})

export const GRAY_BUTTON = (label: string, customID: string, disabled?: boolean, icon?: string): ComponentButton => ({
	type: ComponentType.BUTTON,
	label,
	custom_id: customID,
	style: ButtonStyle.SECONDARY,
	disabled,
	emoji: icon ? {
		name: icon
	} : undefined
})

export const GREEN_BUTTON = (label: string, customID: string, disabled?: boolean, icon?: string): ComponentButton => ({
	type: ComponentType.BUTTON,
	label,
	custom_id: customID,
	style: ButtonStyle.SUCCESS,
	disabled,
	emoji: icon ? {
		name: icon
	} : undefined
})


export const PREVIOUS_BUTTON = (disabled: boolean): ComponentButton => ({
	type: ComponentType.BUTTON,
	label: '',
	custom_id: 'previous',
	style: ButtonStyle.SECONDARY,
	emoji: {
		name: 'Previous Page',
		id: icons.button_icons.page_button_previous
	},
	disabled
})

export const NEXT_BUTTON = (disabled: boolean): ComponentButton => ({
	type: ComponentType.BUTTON,
	label: '',
	custom_id: 'next',
	style: ButtonStyle.SECONDARY,
	emoji: {
		name: 'Next Page',
		id: icons.button_icons.page_button_next
	},
	disabled
})

export const CLOSE_BUTTON: ComponentButton = {
	type: ComponentType.BUTTON,
	label: 'Close',
	custom_id: 'closed',
	style: ButtonStyle.DESTRUCTIVE
}

export enum Perks {
	None = 0,

	/**
	 * Killing a player in duel will replenish 50% HP
	 */
	Replenish = 1 << 0,

	/**
	 * Loot 8 items instead of 5 when you kill a player (PvP only)
	 */
	Perceptive = 1 << 1
}

/**
 * Commands that have a starter tip when user runs the command for the first time.
 * using flags so that I can add and remove commands from this in the future
 */
export enum CommandsWithStarterTip {
	inventory = 1 << 0,
	stash = 1 << 1,
	profile = 1 << 2,
	boss = 1 << 3,
	companion = 1 << 4,
	travel = 1 << 5,
	scavenge = 1 << 6,
	quest = 1 << 7,
	merchant = 1 << 8,
	market = 1 << 9
}

// export const commandsWithStarterTip = [
//    'inventory',
//    'stash'
// ] as const
// https://github.com/microsoft/TypeScript/issues/20965
// export type CommandWithStarterTip = (typeof commandsWithStarterTip)[number]
