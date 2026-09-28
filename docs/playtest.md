# Playtest checklists

Each stage is tagged `v0.<stage>` and deployed to production. Use the in-game **⋯ → Report a problem** button
for anything odd: it attaches the room state automatically.

## v0.1 · Lobby and host flow

- [ ] Host opens the site on the computer that screen-shares, presses **Host a game**.
- [ ] Host presses **Play from this computer or your phone** and opens their player window (or scans their QR).
- [ ] Nobody on the call can see the host's personal link or QR once the panel closes.
- [ ] Everyone joins from the code on the stream. Do the animals and names show up?
- [ ] Refresh your phone, lock it for a minute, come back: are you still in the same seat?
- [ ] Close the tab entirely, reopen the site, type the code and your same name: do you get your seat back?
- [ ] VIP: add bots, change the game length, remove someone, re-open the host screen from ⋯.

## v0.2 · Player screen and input kit

Open **/dev/input-lab** (linked as "Try your device" on the home page) on your own phone or laptop.

- [ ] Try every tab. Do taps, drags, the d-pad, the joystick and drawing all feel responsive?
- [ ] Rotate your phone on the D-pad tab: the pad should move to your left thumb and Jump to your right.
- [ ] On a laptop, try the same tabs with only the keyboard (numbers, WASD, arrows, Backspace).
- [ ] If you have a game controller, plug it in and try Pick, D-pad and Rotate.
- [ ] Typing on the Text tab: does the box stay visible above your phone keyboard?
- [ ] In a lobby: **Doodle a flag** and **Wiggle**. Does your doodle and wiggle show on the shared screen?

## v0.3 · Timing core

Do this over a **real Discord screen share**, with at least one person on a TV or in the room if you can.

- [ ] VIP: press **Stream check**. Everyone taps when the star flashes on the stream, then on their own phone.
- [ ] Do Discord viewers get roughly 1 to 3 s, and anyone on the TV near 0? (Your delay shows in the lobby.)
- [ ] VIP: press **Reaction test**. Three rounds: tap on FIRE!, not on the fakes.
- [ ] Does it feel fair between phones and laptops? (Device icons show next to each time.)
- [ ] Add `?debug` to the end of your page URL: offset and round trip should stay stable.

## v0.4 · Mini game loop

The VIP presses **Start game** (add bots if you're few). No board yet: every round is one mini game.

- [ ] Rules card: is it clear what to do? Does it show the right controls for your device?
- [ ] **Lowest Unique Number**: was the reveal fun to watch? Did your phone wait for the stream before showing your result?
- [ ] **Stopwatch Chicken**: does the clock on your phone feel fair? Any lag between tapping STOP and it stopping?
- [ ] **Count Together**: did clashes feel fair? (They're judged by when you tapped, not when it arrived.)
- [ ] Is the standings screen after each game readable on the stream?
- [ ] Solo testing: `/dev/minigame/lowest-unique?n=6` (also `stopwatch-chicken`, `count-to`) plays one game against bots.

## v0.5 · The board

A full game now: roll, move, mini game, repeat. Try **Quick** first.

- [ ] Rolling: does everyone roll at once, and does the board phase stay under a minute?
- [ ] At a fork your phone shows a small map with two coloured paths. Is it clear which is which?
- [ ] Stars: pass one with 20 coins to buy it. Did anyone get a **star contest** (two players reaching it together)?
- [ ] Coin flips for purple/yellow/green spaces, then Blue vs Red decides the game format. Did that make sense?
- [ ] Are the spotlight cards (stars, events) readable on the stream, and not too slow?
- [ ] Does your phone hold back your landing result until the stream shows it?

## v0.6 · Economy and endgame

- [ ] Final stretch: whoever is last picks a twist (cheaper stars, a restless star, or free items). Did it help them?
- [ ] Bonus stars at the end: were they a fun surprise, or did they feel unfair?
- [ ] **Tug of War** (team): mash, but stop when the rope flashes red. Does the hazard feel fair on your device?
- [ ] **Hunter vs Hiders** (1 vs many): is 15 coins for the hunter a good prize?
- [ ] Failed co-op games fill the threat meter (shown under the players). Three fails = everyone loses 5 coins.

Balance numbers from `pnpm --filter @partygame/sim sim 40 standard` (bots only, before items and duels):

| Players | Leader stars | Median stars | Coins at end |
| --- | --- | --- | --- |
| 6 | 2.8 | 1.2 | 81 |
| 8 | 2.6 | 0.9 | 84 |
| 12 | 3.5 | 0.9 | 82 |
| 16 | 3.1 | 0.7 | 83 |

The doc targets 3 to 5 stars for the leader. Coins pile up until the shop, items, duels and bets arrive in v0.7.
With the doc's thresholds, 6-player games are mostly team and 1-vs-many; free-for-all only happens when everyone lands on one colour.

## v0.7 · Items, shop, traps, duels and bets

Try it solo first with `/dev/board?n=4&dev=items,duel,shop` (hands you items, queues a duel and opens the shop).

- [ ] Items: during the roll, tap an item (and a target) before rolling. Is it clear it's secret until everyone has rolled?
- [ ] The reveal lists every item used. Two people swapping with each other cancels out. Did anyone see that happen?
- [ ] Hidden traps: place one from your map. Nobody else should ever see where it is until someone steps on it.
- [ ] Shop spaces (yellow $): the shop opens on your phone at the standings screen for 15 seconds.
- [ ] Duels (green VS spaces, sharing a space, or a Duel Ticket): pick the wager, everyone else bets. Fun or too slow?
- [ ] Bets: did underdog bets pay out more? Was the result on your phone in sync with the stream?
- [ ] **Quick Draw**: hold, then let go on FIRE! Fair between phones and laptops?

## v0.8 · Wave A: pick and grid games

Each can be tried solo at `/dev/minigame/<id>?n=6`.

- [ ] **Silent Trample** (`silent-trample`): do the zone rewards make you second-guess the crowd?
- [ ] **Pick a Door** (`pick-a-door`): once you're out you rig the next doors. Is that more fun than waiting?
- [ ] **Pick a Door: Trap-setter** (`pick-a-door-setter`, 1 vs many): is 3 rounds to knock out half fair?
- [ ] **Deep Sea Sonar** (`deep-sea-sonar`): your phone shows exact fish in one patch. Did anyone share (or lie about) theirs?
- [ ] **Raft Gamble** (`raft-gamble`): bank or stay? Are the side bets worth doing once you're ashore?
- [ ] **Crumble Tower** (`crumble-tower`): is the "which row falls" rule clear on the phone?
- [ ] **Quick Draw** (`quick-draw`) now appears as a free-for-all too.

## v0.9 · Wave B: word and social games

- [ ] **Herd Mentality** (`herd-mentality`): answers are grouped even with typos and plurals. When it missed a match, did the merge vote fix it?
- [ ] The last Herd round flips to "be the only one". Fun twist or confusing?
- [ ] **Odd One Out** (`odd-one-out`): the imposter doesn't know they're the imposter. Did the clues give it away too fast?
- [ ] **Who Wrote That?** (`who-wrote-that`): is guessing 6 to 8 answers on a phone too fiddly?
- [ ] **Predict the Crowd** (`predict-the-crowd`): is ranking by dragging (or ▲▼) easy enough?
- [ ] Any prompt that fell flat or was confusing? Note it in Report a problem.

## v0.10 · Wave C: simulated games

All physics runs once on the server and is played back, so every screen shows the same thing.

- [ ] **Sumo Programming** (`sumo-programming`): tap the platform to aim, set force. Does the playback look fair?
- [ ] **Artillery Trajectory** (`artillery`): does the red preview line plus last round's dashed path help you learn?
- [ ] **Artillery: Fortress** (`artillery-fortress`, 1 vs many): is the fortress too tough or too weak?
- [ ] **Planned Movement Heist** (`heist`): is programming 5 moves on the phone quick enough? Are bumps clear on the stream?
- [ ] **Heist: Guard** (`heist-guard`, 1 vs many): do the guards have a fair chance?
- [ ] **Land Grab** (`land-grab`): does the zoomed view of your own area make placing easy? Clashes stay grey forever.

## v0.11 · Wave D: team games

- [ ] **Synchronised Pulse** (`synchronised-pulse`): the first 4 beats tune your phone. Did phones and laptops feel equal after that?
- [ ] **Mirror Maze Optics** (`mirror-maze`): your phone shows your team's beam live. Is flipping mirrors clear?
- [ ] **Radar Beacon** (`radar-beacon`): three pings, taken in turns. Could your team find the beacon from the rings?
- [ ] **Blind Architect** (`blind-architect`): the architect types short messages instead of talking, so all teams play at once. Enough messages?
- [ ] At 12+ players, team games split into four teams (two-team games like Tug of War merge back into two).

## v0.12 · Wave E: co-op games (all 33 games are in)

Co-op pays everyone the same (gold 8, silver 5, bronze 3). Failures fill the threat meter.

- [ ] **Recipe Assembly Line** (`recipe-assembly`): does "claim the next slot" stop people clashing?
- [ ] **Runaway Switchboard** (`runaway-switchboard`): can you coordinate junctions without shouting over each other?
- [ ] **Pressure Valve Balancer** (`pressure-valve`): are the cooldowns too long or short?
- [ ] **The Mind** (`the-mind`): no talking! Did the timestamp ordering ever feel wrong?
- [ ] **Collaborative Quilt** (`collaborative-quilt`): did seeing your neighbours' edges make lines join up?
- [ ] **Defuse the Circuit** (`defuse-circuit`): this one needs talking. Is the manual readable on a phone?
- [ ] **Meteor Shield Array** (`meteor-shield`): the one real-time game. Does it feel responsive on your connection?

## v0.13 · Large lobbies

Aim for a 12 to 16 player night, with bots topping up if people drop.

- [ ] **16 players on one board:** can you find your pawn in the crowd on the start space? Does the rail stay readable on the stream?
- [ ] **Team board** (lobby option, 8+ players): four teams share a pawn, purse, items and stars. Your phone shows your team.
  - [ ] Rolls: the first teammate to tap rolls. Paths, cards, bids and items are votes: the majority wins, and ties are random. Did voting feel fast enough?
  - [ ] Every seat still plays every mini game. In free-for-alls, each team scores its members' average placing (8/5/3/2). Did that feel fair?
  - [ ] Duels: any teammate can issue the challenge, and they play it. There are no spectator bets in team mode.
- [ ] **Movement cards** (lobby option): play one of three cards instead of rolling, then draw a fresh one. Does it add strategy, or just slow things down?
- [ ] **Deck editing** (lobby, "Mini games: N/33 on"): untick games you don't want. Free-for-all can't be emptied.
- [ ] **Autopilot:** if you drop, your seat now makes random path choices and never spends your items or coins. Only real bots use items and shop.
- [ ] Try `/dev/board?n=16&team=1&cards=1` to see team board and cards with bots.
