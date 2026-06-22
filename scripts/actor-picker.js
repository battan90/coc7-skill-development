/**
 * GM multi-select dialog: pick which investigators run skill development.
 * Only lists actors that actually have skills flagged for development.
 */

import { getFlaggedSkills, runSkillDevelopment } from "./skill-development.js";

/** Player-character actors with at least one flagged skill. */
function candidateActors() {
  return game.actors.filter(
    (a) => a.type === "character" && getFlaggedSkills(a).length > 0
  );
}

export async function openPicker() {
  if (!game.user.isGM) {
    // Non-GM: just run on their own assigned/selected actor.
    const actor = canvas.tokens?.controlled[0]?.actor ?? game.user.character;
    return runSkillDevelopment([actor]);
  }

  const L = (k) => game.i18n.localize(k);
  const actors = candidateActors();
  if (actors.length === 0) {
    ui.notifications.info(L("COC7SD.Picker.None"));
    return;
  }

  const items = actors
    .map((a) => {
      const n = getFlaggedSkills(a).length;
      return `<li>
        <label>
          <input type="checkbox" name="actorId" value="${a.id}" checked />
          ${a.name} <span class="coc7sd-fail">(${n})</span>
        </label>
      </li>`;
    })
    .join("");

  const content = `<p>${L("COC7SD.Picker.Hint")}</p>
    <ul class="coc7sd-picker-list">${items}</ul>`;

  let chosen = null;
  try {
    chosen = await foundry.applications.api.DialogV2.wait({
      window: { title: L("COC7SD.Picker.Title") },
      content,
      buttons: [
        {
          action: "run",
          label: L("COC7SD.Picker.Run"),
          icon: "fas fa-dice",
          default: true,
          callback: (event, button) => {
            const checked = button.form.elements.actorId;
            const ids = [];
            // Single checkbox vs RadioNodeList
            if (checked instanceof RadioNodeList) {
              for (const el of checked) if (el.checked) ids.push(el.value);
            } else if (checked?.checked) {
              ids.push(checked.value);
            }
            return ids;
          },
        },
      ],
      rejectClose: false,
    });
  } catch (e) {
    return;
  }

  if (!chosen || chosen.length === 0) return;
  const selected = chosen.map((id) => game.actors.get(id)).filter(Boolean);
  return runSkillDevelopment(selected);
}
