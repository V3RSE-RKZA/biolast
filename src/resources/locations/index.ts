import { Location } from '../../types/Locations'
import { farm } from './farm'
import { mall } from './mall'
import { prison } from './prison'
import { suburbs } from './suburbs'

const locationsObject = <T>(et: { [K in keyof T]: Location }) => et

export const locations = locationsObject({
	suburbs,
	farm,
	mall,
	prison
})

export type LocationName = keyof typeof locations

export function isValidLocation (l: string): l is LocationName {
	return l in locations
}

export const allLocations = Object.values(locations)
