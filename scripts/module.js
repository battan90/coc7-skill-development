/**
 * Entry point: register settings, expose API, inject the actor-sheet button.
 */

import { runSkillDevelopment } from "./skill-development.js";
import { openPicker } from "./actor-picker.js";

const MODULE_ID = "coc7-skill-development";

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, "outputVisibility", {
    name: "COC7SD.Settings.OutputVisibility.Name",
    hint: "COC7SD.Settings.OutputVisibility.Hint",
    scope: "world",
    config: true,
    type: String,
    default: "public",
    choices: {
      public: "COC7SD.Settings.OutputVisibility.Public",
      playerGM: "COC7SD.Settings.OutputVisibility.PlayerGM",
      gm: "COC7SD.Settings.OutputVisibility.GMOnly",
    },
  });

  game.settings.register(MODULE_ID, "enforcement", {
    name: "COC7SD.Settings.Enforcement.Name",
    hint: "COC7SD.Settings.Enforcement.Hint",
    scope: "world",
    config: true,
    type: String,
    default: "commit",
    choices: {
      commit: "COC7SD.Settings.Enforcement.CommitOnRoll",
      trusting: "COC7SD.Settings.Enforcement.Trusting",
    },
  });
});

Hooks.once("ready", () => {
  const mod = game.modules.get(MODULE_ID);
  if (mod) mod.api = { runSkillDevelopment, openPicker };
});

/**
 * Inject a header button into the investigator sheet. Single-actor quick path.
 * Feature-detects ApplicationV2 vs legacy ActorSheet so it works whether or
 * not the CoC7 system has migrated its sheets.
 */
function headerControl(actor) {
  return {
    icon: "fas fa-dice-d20",
    label: "COC7SD.HeaderButton",
    action: "coc7sd-develop",
    onClick: () => runSkillDevelopment([actor]),
  };
}

// ApplicationV2 sheets (v13+ native).
Hooks.on("getHeaderControlsActorSheetV2", (app, controls) => {
  const actor = app.document;
  if (actor?.type !== "character") return;
  // Guard against duplicate pushes (known core quirk: array is by-reference).
  if (controls.some((c) => c.action === "coc7sd-develop")) return;
  controls.push(headerControl(actor));
});

// Legacy ActorSheet (ApplicationV1) fallback.
Hooks.on("getActorSheetHeaderButtons", (sheet, buttons) => {
  const actor = sheet.actor ?? sheet.document;
  if (actor?.type !== "character") return;
  if (buttons.some((b) => b.class === "coc7sd-develop")) return;
  buttons.unshift({
    label: game.i18n.localize("COC7SD.HeaderButton"),
    class: "coc7sd-develop",
    icon: "fas fa-dice-d20",
    onclick: () => runSkillDevelopment([actor]),
  });
});
