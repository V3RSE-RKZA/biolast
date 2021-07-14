import { ComponentType, ButtonStyle, ComponentActionRow } from 'slash-create'

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
