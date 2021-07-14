import { icons } from '../config'

export default function formatNumber (number: number, noIcon = false): string {
	if (noIcon) {
		return number.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
	}

	return `${icons.money} ${number.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}
