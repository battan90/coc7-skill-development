/**
 * Core skill-development logic for CoC7.
 *
 * Three phases, generalized from one actor to N:
 *   1. roll every development-flagged skill (commit nothing)
 *   2. preview + (optionally) confirm
 *   3. apply gains and clear flags
 *
 * Anti-cheat: when discard is NOT allowed (players under commit-on-roll),
 * results are written BEFORE the summary is shown, so a player cannot
 * disconnect / refresh mid-view to undo a bad roll.
 */

const MODULE_ID = "coc7-skill-development";

/** Skills on an actor currently flagged for development. */
export function getFlaggedSkills(actor) {
  return actor.items.filter(
    (i) => i.type === "skill" && i.system.flags?.developement === true
  );
}

/** Current effective skill value: base + all adjustments. */
function currentValue(skill) {
  const adj = skill.system.adjustments ?? {};
  return (
    (parseInt(skill.system.base) || 0) +
    (adj.personal ?? 0) +
    (adj.occupation ?? 0) +
    (adj.archetype ?? 0) +
    (adj.experiencePackage ?? 0) +
    (adj.experience ?? 0)
  );
}

/** Phase 1: roll improvement checks for one actor. Commits nothing. */
async function rollForActor(actor) {
  const results = [];
  for (const skill of getFlaggedSkills(actor)) {
    const current = currentValue(skill);
    const checkRoll = await new Roll("1d100").evaluate();
    let gain = 0;
    if (checkRoll.total > current) {
      const gainRoll = await new Roll("1d10").evaluate();
      gain = gainRoll.total;
    }
    results.push({
      skill,
      name: skill.name,
      roll: checkRoll.total,
      current,
      gain,
      cappedGain: Math.min(gain, 99 - current),
    });
  }
  return { actor, results };
}

/** Phase 3: write gains and clear flags for one actor's results. */
async function applyForActor({ results }) {
  for (const r of results) {
    if (r.cappedGain > 0) {
      const currentExp = r.skill.system.adjustments?.experience ?? 0;
      await r.skill.update({
        "system.adjustments.experience": currentExp + r.cappedGain,
        "system.flags.developement": false,
      });
    } else {
      await r.skill.update({ "system.flags.developement": false });
    }
  }
}

/** Whisper recipient ids based on the outputVisibility setting. */
function whisperTargets(actor) {
  const mode = game.settings.get(MODULE_ID, "outputVisibility");
  if (mode === "public") return [];

  const gmIds = ChatMessage.getWhisperRecipients("GM").map((u) => u.id);
  if (mode === "gm") return gmIds;

  // playerGM: GMs + everyone who owns this actor
  const ownerIds = game.users
    .filter((u) => actor.testUserPermission(u, "OWNER"))
    .map((u) => u.id);
  return [...new Set([...gmIds, ...ownerIds])];
}

/** Build the results table HTML for one or more actors. */
export function buildPreview(actorResults) {
  const L = (k) => game.i18n.localize(k);
  const sections = actorResults.map(({ actor, results }) => {
    const rows = results
      .map((r) => {
        if (r.cappedGain > 0) {
          const capNote =
            r.cappedGain < r.gain
              ? ` <span class="coc7sd-capped">(capped from +${r.gain})</span>`
              : "";
          return `<tr>
            <td><b>${r.name}</b></td>
            <td>${r.roll} vs ${r.current}% — <span class="coc7sd-success">${L("COC7SD.Result.Success")}</span></td>
            <td>${r.current}% → <b>${r.current + r.cappedGain}%</b> (+${r.cappedGain}${capNote})</td>
          </tr>`;
        }
        return `<tr>
          <td><b>${r.name}</b></td>
          <td>${r.roll} vs ${r.current}% — <span class="coc7sd-fail">${L("COC7SD.Result.NoImprovement")}</span></td>
          <td>${r.current}%</td>
        </tr>`;
      })
      .join("");
    return `<div class="coc7sd-actor-group">${actor.name}</div>
      <table class="coc7sd-table">
        <thead><tr>
          <th>${L("COC7SD.Table.Skill")}</th>
          <th>${L("COC7SD.Table.Roll")}</th>
          <th>${L("COC7SD.Table.Result")}</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  });
  return sections.join("");
}

/** Post results to chat, respecting the visibility setting. */
function postResults(actorResults, content) {
  // Per-actor whisper so each owner sees only their own when not public.
  const mode = game.settings.get(MODULE_ID, "outputVisibility");
  if (mode === "public") {
    ChatMessage.create({ content });
    return;
  }
  for (const ar of actorResults) {
    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: ar.actor }),
      whisper: whisperTargets(ar.actor),
      content: buildPreview([ar]),
    });
  }
}

/**
 * Run skill development for the given actors.
 * @param {Actor[]} actors
 * @param {object} [opts]
 * @param {boolean} [opts.allowDiscard] - GM take-back flow. Defaults to GM + trusting setting.
 */
export async function runSkillDevelopment(actors, opts = {}) {
  const L = (k, d) => game.i18n.format(k, d);
  actors = (actors ?? []).filter(Boolean);
  if (actors.length === 0) {
    ui.notifications.warn(game.i18n.localize("COC7SD.Warn.NoActor"));
    return;
  }

  const trusting = game.settings.get(MODULE_ID, "enforcement") === "trusting";
  const allowDiscard = opts.allowDiscard ?? (game.user.isGM || trusting);

  // Phase 1: roll all, drop actors with nothing flagged.
  const actorResults = [];
  for (const actor of actors) {
    if (getFlaggedSkills(actor).length === 0) {
      if (actors.length === 1) {
        ui.notifications.info(L("COC7SD.Info.NoFlagged", { name: actor.name }));
      }
      continue;
    }
    actorResults.push(await rollForActor(actor));
  }
  if (actorResults.length === 0) return;

  const preview = buildPreview(actorResults);

  if (!allowDiscard) {
    // Commit-on-roll: write FIRST, then reveal. No take-back.
    for (const ar of actorResults) await applyForActor(ar);
    postResults(actorResults, preview);
    return;
  }

  // GM / trusting: preview, then confirm or discard.
  const confirmed = await promptConfirm(actorResults, preview);
  if (!confirmed) {
    ui.notifications.info(game.i18n.localize("COC7SD.Info.Cancelled"));
    return;
  }
  for (const ar of actorResults) await applyForActor(ar);
  postResults(actorResults, preview);
}

/** Confirm/discard dialog (DialogV2). Resolves true on confirm. */
async function promptConfirm(actorResults, preview) {
  const L = (k) => game.i18n.localize(k);
  const title =
    actorResults.length === 1
      ? game.i18n.format("COC7SD.Dialog.Title", { name: actorResults[0].actor.name })
      : game.i18n.localize("COC7SD.ModuleTitle");

  const content = `<p>${L("COC7SD.Dialog.Review")}</p>${preview}`;

  try {
    return await foundry.applications.api.DialogV2.wait({
      window: { title },
      content,
      buttons: [
        {
          action: "confirm",
          label: L("COC7SD.Dialog.Confirm"),
          icon: "fas fa-check",
          default: true,
          callback: () => true,
        },
        {
          action: "discard",
          label: L("COC7SD.Dialog.Discard"),
          icon: "fas fa-times",
          callback: () => false,
        },
      ],
      rejectClose: false,
    });
  } catch (e) {
    // Closed without choosing → discard.
    return false;
  }
}
