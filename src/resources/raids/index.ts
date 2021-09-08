import { Location } from '../../types/Raids'
import { farm } from './farm'
import { suburbs } from './suburbs'

const locationsObject = <T>(et: { [K in keyof T]: Location }) => et

export const locations = locationsObject({
	suburbs,
	farm
})

export const allLocations = Object.values(locations)
