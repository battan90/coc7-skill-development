# Changelog

## 1.0.0

- First stable release. Verified for Foundry VTT v14.364 (minimum v13).
- Skill development automation: rolls all development-flagged skills, applies 1d10 gains (capped at 99), clears flags, posts chat summary.
- Two triggers: investigator sheet header button (single actor) + bundled macro opening a GM multi-select picker (party batch).
- Anti-cheat: commit-on-roll for players (no reroll fishing); GM keeps confirm/discard.
- Configurable output visibility: public / player+GM / GM-only.


## 0.1.4

- Rename display title to "CoC 7e Skill Development" for better search discoverability (module id unchanged).


## 0.1.3

- Verify compatibility with Foundry VTT v14 (14.363); minimum stays v13.


## 0.1.2

- Fix empty macro compendium: compile per-document source files (CLI ignored the previous single array file).


## 0.1.1

- Fix manifest: system relationship `type` must be `"system"`, not `"requires"` (caused install validation error on v13).

## 0.1.0

- Initial module: rolls development-flagged skills, applies 1d10 gains (capped at 99), clears flags.
- Actor-sheet header button (single actor) + bundled macro opening a GM multi-select picker (party batch).
- Anti-cheat: commit-on-roll for players, confirm/discard for GM.
- Configurable chat output visibility: public / player+GM / GM-only.
