# CoC7 Skill Development

A [Foundry VTT](https://foundryvtt.com) module for the
[Call of Cthulhu 7th Edition](https://foundryvtt.com/packages/CoC7) system that
automates end-of-scenario **skill improvement checks**.

For every skill flagged for development it rolls `1d100`; on a roll greater than
the skill's current value it adds `1d10` percentiles (capped at 99), then clears
the development flag and posts a summary to chat.

## Features

- **One click, all skills** — processes every development-flagged skill on an actor.
- **Two entry points**
  - A button in the investigator sheet header (runs that one actor).
  - A bundled macro that opens a GM **multi-select picker** to batch the whole party.
- **Anti-cheat** — *commit-on-roll* by default: players' rolls are written the
  instant they're made, so there's no cancel-and-reroll fishing. The GM keeps a
  confirm/discard review step for legitimate corrections.
- **Configurable output** — results visible to everyone (default), to the
  player + GM, or to the GM only.

## Settings (world-scoped, GM)

| Setting | Default | Options |
|---------|---------|---------|
| Result Output Visibility | Public | Public · Player + GM · GM only |
| Anti-Cheat Enforcement | Commit on roll | Commit on roll · Trusting |

## Installation

In Foundry: **Add-on Modules → Install Module**, paste the manifest URL:

```
https://github.com/battan90/coc7-skill-development/releases/latest/download/module.json
```

## Requirements

- Foundry VTT v13+
- Call of Cthulhu 7th Edition system (`CoC7`)

## License

[MIT](LICENSE). Ships no Chaosium intellectual property — game mechanics only.
