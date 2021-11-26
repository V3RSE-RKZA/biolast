import { ComponentType, ButtonStyle, ComponentActionRow, ComponentButton } from 'slash-create'

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

export const RED_BUTTON = (label: string, customID: string, disabled?: boolean): ComponentButton => ({
	type: ComponentType.BUTTON,
	label,
	custom_id: customID,
	style: ButtonStyle.DESTRUCTIVE,
	disabled
})

export const GRAY_BUTTON = (label: string, customID: string, disabled?: boolean): ComponentButton => ({
	type: ComponentType.BUTTON,
	label,
	custom_id: customID,
	style: ButtonStyle.SECONDARY,
	disabled
})

export const GREEN_BUTTON = (label: string, customID: string, disabled?: boolean): ComponentButton => ({
	type: ComponentType.BUTTON,
	label,
	custom_id: customID,
	style: ButtonStyle.SUCCESS,
	disabled
})


export const PREVIOUS_BUTTON = (disabled: boolean): ComponentButton => ({
	type: ComponentType.BUTTON,
	label: 'Previous Page',
	custom_id: 'previous',
	style: ButtonStyle.SECONDARY,
	disabled
})

export const NEXT_BUTTON = (disabled: boolean): ComponentButton => ({
	type: ComponentType.BUTTON,
	label: 'Next Page',
	custom_id: 'next',
	style: ButtonStyle.SECONDARY,
	disabled
})

export const CLOSE_BUTTON: ComponentButton = {
	type: ComponentType.BUTTON,
	label: 'Close',
	custom_id: 'closed',
	style: ButtonStyle.DESTRUCTIVE
}
