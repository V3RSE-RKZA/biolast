import { Location } from '../../types/Raids'
import { farm } from './farm'
import { mall } from './mall'
import { suburbs } from './suburbs'

const locationsObject = <T>(et: { [K in keyof T]: Location }) => et

export const locations = locationsObject({
	suburbs,
	farm,
	mall
})

export const allLocations = Object.values(locations)
