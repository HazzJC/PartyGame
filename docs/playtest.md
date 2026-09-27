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
