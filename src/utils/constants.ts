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
	style: ButtonStyle.PRIMARY,
	emoji: {
		name: 'Previous Page',
		id: icons.page_button_previous
	},
	disabled
})

export const NEXT_BUTTON = (disabled: boolean): ComponentButton => ({
	type: ComponentType.BUTTON,
	label: '',
	custom_id: 'next',
	style: ButtonStyle.PRIMARY,
	emoji: {
		name: 'Next Page',
		id: icons.page_button_next
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
