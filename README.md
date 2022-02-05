# ⚠️ Currently in development

[![Github Mega-Linter](https://github.com/blobfysh/biolast/workflows/Lint%20Code/badge.svg)](https://github.com/nvuillam/mega-linter)
![Build](https://github.com/blobfysh/biolast/workflows/Build/badge.svg)

This is a post-apocalyptic RPG bot where players scavenge regions for items and progress to new regions by defeating a boss. The bot features PvP, PvE, quests, a global shop, unique items, equippable items and some other things.

Join our discord server if you'd like to help work on the bot: https://discord.gg/6JqT3STJ5w

## Plans:

- [x] Trying to scavenge or evac in a channel where there's an NPC should make the NPC attack you (gives more incentive to kill the NPCs and search the area before scavenging for loot).
- [x] Cooldowns before user can enter raid of same type to prevent someone dying then going back into same raid and taking their stuff off the ground.
- [x] Raider NPCs and zombie NPCs can wear armor that they will drop when killed (the durability of the armor would be random to pretend it was used). Raider NPCs should also be able to use a ranged weapon and ammo which they would drop on death.
- [x] Boss NPCs that have better armor/weapons and deal more damage. These would have a longer respawn rate than the basic NPCs
- [x] Some channels require a **Key** item to use the `scavenge` command. When a key is used to scavenge for loot, the durability of the key should go down, if it goes to 0 the key should break. This could also work for certain evac channels.
- [x] add daily or weekly quests system, user must complete quest to receive a reward which can be viewed with `quests`
- [x] add infection debuff when swiped by a zombie, user must take `anti-biotics` to get rid of the infection. Infection would cause the player to deal reduced damage when attacking.
- [x] There should be a `shop` that unlocks at a certain level. When a player sells an item to the shop, it should show as for sale by the shop for 2x - 3x (randomized) the price they sold it for. Other players could then buy these items from the shop using the item ID: `=shop buy <item id>` (items would only show on the shop for a limited time before being removed). Also, some items could require the player to be a certain level before they can purchase that item (to prevent users from buying end game items).
- [x] limit amount of item players can buy from shop each day.
- [x] leveling up should increase stash space and max health.
- [x] add health regen over time.
- [x] more raid locations that require user to be a higher level to travel to, they should contain stronger NPCs and better scavenge loot. there could also be locations that require you to use a key.
- [x] can't type in channels but can use emotes.
- [x] ~~allow picking up of multiple items up to a max of like 4 items: `grab 10400 10401 10402`.~~ This was added with the migration to slash commands
- [x] `item` command should work with item ids: `t-item 10400`
- [x] unequip command (just for ease of use)
- [x] durability should affect how much item sells for
- [x] change the currency from rubles to something else
- [x] commands shouldn't be able to be used while user is `evac`ing
- [x] `leaderboard` command for viewing players with most xp/level, money, successful raids, quests completed
- [x] add tests that make sure every item is obtainable, whether it be from scavenging channels in raids or as drops from an npc.
- [x] players drop dog tags when they die, they would show up as "user#1234's Dog Tags". this would allow people to collect dog tags of the players they kill.

### Further down line (after bot releases):
- [ ] when user votes for the bot on a bot list, they should receive a random item (maybe like 10% weapon, 30% ammo, 60% other stuff)
- [ ] attachments that can be added to ranged weapons, only certain attachments would work depending on the weapon. these attachments would give the weapon a damage/speed/accuracy buff.
- [ ] translations??? this might be confusing when other players see them using command in raid though... or maybe that would be cooler who knows
- [ ] for late game, add a max level user can achieve and some sort of prestiging system that resets them (there should be some kind of reward involved)
- [x] a companion system, you can hire raiders or have pets like dogs/cats that fetch items for you (you could level your companion up, making the items they retrieve better)
- [ ] `combine` command that users can unlock after prestiging, requires prestige system to be finished first. this command would allow users to combine the durability of 2 of the same weapon/armor. this would allow the durability to go higher than items normally could, so players could have an armor that has much more durability than usual.
- [ ] perk system. as players level up, they gain a point which they can use to upgrade perks. perks would be things like "gain 50 max health but deal -30% damage", "increase the number of stimulants you can use in a duel", "increased chance to flee from duels", "deal 10% more damage with melee weapons".
- [ ] ranked PvP duels that are exclusive to the official discord server. players would gain RP (ranked points) based on the sum of item level of the users inventory (better items = more rp if they win). there would be some kind of leaderboard for this and the leaderboard would reset monthly, top players would get some kind of prize.

## Contributing

All item, npc, quest, and raid data is located in src/resources. Simply edit the files and submit a PR for someone to review.
