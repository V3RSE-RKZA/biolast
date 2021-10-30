import { Location } from '../../types/Raids'
import { farm } from './farm'
import { mall } from './mall'
import { station } from './policestation'
import { suburbs } from './suburbs'

const locationsObject = <T>(et: { [K in keyof T]: Location }) => et

export const locations = locationsObject({
	suburbs,
	farm,
	mall,
	station
})

export const allLocations = Object.values(locations)
