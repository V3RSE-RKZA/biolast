import { SlashCreator, CommandContext, ComponentType, Message, ComponentSelectMenu } from 'slash-create'
import App from '../app'
import { icons } from '../config'
import { allLocations, isValidLocation, LocationName, locations } from '../resources/locations'
import CustomSlashCommand from '../structures/CustomSlashCommand'
import { beginTransaction, query } from '../utils/db/mysql'
import { getUserRow, setLocation } from '../utils/db/players'
import { combineArrayWithAnd, combineArrayWithOr } from '../utils/stringUtils'

class TravelCommand extends CustomSlashCommand {
	constructor (creator: SlashCreator, app: App) {
		super(creator, app, {
			name: 'travel',
			description: 'Travel to a new location to scavenge.',
			longDescription: 'Travel to a new location to scavenge.\n\nThe location you travel to will decide what areas you can scavenge with the `/scavenge` command as' +
				' well as what boss you fight with `/boss`.\n\nTo unlock a new location, you will have to fight the boss of the location you are currently on (so if you' +
				' are on **The Suburbs**, you would have to beat the boss either alone or with the help of friends in order to progress to **The Farm**).',
			options: [],
			category: 'info',
			guildModsOnly: false,
			worksInDMs: false,
			worksDuringDuel: false,
			guildIDs: []
		})

		this.filePath = __filename
	}

	async run (ctx: CommandContext): Promise<void> {
		const preUserData = (await getUserRow(query, ctx.user.id))!
		const sortedLocationIDs = Object.keys(locations)
			.filter(l => locations[l as LocationName].locationLevel <= preUserData.locationLevel)
			.sort((a, b) => locations[a as LocationName].locationLevel - locations[b as LocationName].locationLevel) as LocationName[]
		const components: ComponentSelectMenu[] = [
			{
				type: ComponentType.SELECT,
				custom_id: 'locations',
				options: sortedLocationIDs.map(locID => {
					const locationData = locations[locID]
					const iconID = locationData.icon.match(/:([0-9]*)>/)

					return {
						label: `${locationData.locationLevel === preUserData.locationLevel ? `${locationData.display} (best location available)` : locationData.display}`,
						value: locID,
						description: `Location level: ${locationData.locationLevel}`,
						emoji: iconID ? {
							id: iconID[1],
							name: locationData.display
						} : {
							name: locationData.icon
						}
					}
				})
			}
		]
		const currentLocation = isValidLocation(preUserData.currentLocation) && locations[preUserData.currentLocation]
		const maxLocations = allLocations.filter(l => l.locationLevel === preUserData.locationLevel)
		const nextLocations = allLocations.filter(l => l.locationLevel === preUserData.locationLevel + 1)

		const botMessage = await ctx.send({
			content: `Current Location: **${currentLocation ? `${currentLocation.icon} ${currentLocation.display}` : 'Unknown'}**.` +
				(` ${maxLocations.length && nextLocations.length ?
					`(Defeat the boss of ${combineArrayWithOr(maxLocations.map(l => `**${l.display}**`))} to unlock ${combineArrayWithAnd(nextLocations.map(l => `**${l.display}**`))})` :
					'(You have unlocked all locations)'}`) +
				'\n\n**Where where you like to travel to?**:',
			components: [
				{
					type: ComponentType.ACTION_ROW,
					components
				}
			]
		}) as Message

		try {
			const locationCtx = (await this.app.componentCollector.awaitClicks(botMessage.id, i => i.user.id === ctx.user.id, 30000))[0]
			const locationID = isValidLocation(locationCtx.values[0]) ? locationCtx.values[0] : undefined
			const locationChoice = locationID ? locations[locationID] : undefined
			const transaction = await beginTransaction()
			const userData = (await getUserRow(transaction.query, ctx.user.id, true))!

			if (!locationID || !locationChoice) {
				await transaction.commit()

				await locationCtx.editParent({
					content: `${icons.danger} Could not find location.`,
					components: []
				})
				return
			}
			else if (locationChoice.locationLevel > userData.locationLevel) {
				await transaction.commit()

				await locationCtx.editParent({
					content: `${icons.danger} You have not unlocked that location.`,
					components: []
				})
				return
			}
			else if (locationID === userData.currentLocation) {
				await transaction.commit()

				await locationCtx.editParent({
					content: `${icons.warning} You are already at ${locationChoice.icon} **${locationChoice.display}**. Use the \`/scavenge\` command to search for items.`,
					components: []
				})
				return
			}

			await setLocation(transaction.query, ctx.user.id, locationID)
			await transaction.commit()

			await locationCtx.editParent({
				content: `🗺️ You have traveled to ${locationChoice.icon} **${locationChoice.display}**. Use the \`/scavenge\` command to search for items.`,
				components: []
			})
		}
		catch (err) {
			await botMessage.edit({
				content: `${icons.danger} Ran out of time to choose a location.`,
				components: []
			})
		}
	}
}

export default TravelCommand
