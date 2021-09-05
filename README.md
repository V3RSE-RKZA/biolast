# Currently in development

[![Github Mega-Linter](https://github.com/blobfysh/project-z/workflows/Lint%20Code/badge.svg)](https://github.com/nvuillam/mega-linter)
![Build](https://github.com/blobfysh/project-z/workflows/Build/badge.svg)

### Plans:

- [x] Trying to scavenge or evac in a channel where there's an NPC should make the NPC attack you (gives more incentive to kill the NPCs and search the area before scavenging for loot).

- [ ] Cooldowns before user can enter raid of same type to prevent someone dying then going back into same raid and taking their stuff off the ground.

- [x] Raider NPCs and zombie NPCs can wear armor that they will drop when killed (the durability of the armor would be random to pretend it was used). Raider NPCs should also be able to use a ranged weapon and ammo which they would drop on death.

- [ ] Boss NPCs that have better armor/weapons and deal more damage. These would have a longer respawn rate than the basic NPCs

- [x] Some channels require a **Key** item to use the `scavenge` command. When a key is used to scavenge for loot, the durability of the key should go down, if it goes to 0 the key should break. This could also work for certain evac channels.

- [ ] add daily or weekly quests system, user must complete quest to receive a reward which can be viewed with `quests`

- [ ] add infection debuff when swiped by a zombie, user must take `anti-biotics` to get rid of the infection. Infection would cause the player to deal reduced damage when attacking.

- [ ] add `notifications` command that would show user notifications such as who they were killed by, who they killed, successful/failed raid evacs, level ups.

- [ ] `leaderboard` command for viewing players with most xp/level, money, successful raids, quests completed

- [ ] There should be a `shop` that unlocks at a certain level. When a player sells an item to the shop, it should show as for sale by the shop for 2x - 3x (randomized) the price they sold it for. Other players could then buy these items from the shop using the item ID: `=shop buy <item id>` (items would only show on the shop for a limited time before being removed). Also, some items could require the player to be a certain level before they can purchase that item (to prevent users from buying end game items).
- [ ] limit amount of item players can buy from shop each day.
- [ ] respawn with health
- [ ] leveling up should increase stash space and max health.
- [ ] add health regen over time.
- [ ] more raid locations that require user to be a higher level to travel to, they should contain stronger NPCs and better scavenge loot. there could also be locations that require you to use a key.
- [ ] can't type in channels but can use emotes.
- [x] ~~allow picking up of multiple items up to a max of like 4 items: `grab 10400 10401 10402`.~~ This was added with the migration to slash commands
- [ ] `item` command should work with item ids: `t-item 10400`

### Further down line:
- [ ] when user votes for the bot on a bot list, they should receive a random item (maybe like 10% weapon, 30% ammo, 60% other stuff)
- [ ] 2 attachment slots that can be equipped (requires ranged weapon to already be equipped)
- [ ] translations??? this might be confusing when other players see them using command in raid though... or maybe that would be cooler who knows
