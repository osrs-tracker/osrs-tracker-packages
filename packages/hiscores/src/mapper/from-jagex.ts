import { HiscoreEntry, HiscoreLayoutNames, SkillEnum } from '@osrs-tracker/models';

/**
 * A skill in Jagex's `index_lite.json`. `rank` and `xp` are `-1` when unranked or without xp. A dead hardcore player's
 * Overall has `death` (and more fields than typed here); a living player's has none.
 */
export type JagexHiscoreSkill = {
  id: number;
  name: string;
  rank: number;
  level: number;
  xp: number;
  death?: { timeStamp: number };
};

/** An activity in Jagex's `index_lite.json`. `rank` is `-1` when unranked, `score` `-1` or `0` without a score. */
export type JagexHiscoreActivity = { id: number; name: string; rank: number; score: number };

/** Jagex's `index_lite.json` response. `name` echoes the queried name as sent, not the player's display name. */
export type JagexHiscoreJson = {
  name: string;
  skills: JagexHiscoreSkill[];
  activities: JagexHiscoreActivity[];
};

/** A Jagex response mapped to the domain model; the caller adds `date` and `scrapingOffset`. */
export type MappedHiscore = {
  skills: HiscoreEntry['skills'];
  activities: HiscoreEntry['activities'];
  /** The names in Jagex's order, for `layoutId`/`createHiscoreLayout` in `@osrs-tracker/models`. */
  layout: HiscoreLayoutNames;
  /** When a hardcore player died, from Overall's `death.timeStamp` (ms); absent while alive. */
  diedAt?: Date;
};

/**
 * Maps Jagex's `index_lite.json` to the domain model, by name in Jagex's order (never by enum, so new skills and
 * activities come through before the enums know them):
 * - rank > 0: `{ rank, level, xp }` / `{ rank, score }`
 * - rank -1 with xp/score > 0: `{ rank: null, … }` (below Jagex's ranking cut-off)
 * - xp/score -1 or 0: `null` (no value)
 *
 * Overall is never `null`: `{ rank or null, level, xp }` with Jagex's level (total level counts unranked skills).
 */
export function fromJagex(json: JagexHiscoreJson): MappedHiscore {
  const skills: HiscoreEntry['skills'] = {};
  const activities: HiscoreEntry['activities'] = {};
  const layout: HiscoreLayoutNames = { skills: [], activities: [] };
  let diedAt: Date | undefined;

  for (const { name, rank, level, xp, death } of json.skills) {
    layout.skills.push(name);
    if (name === SkillEnum.Overall) {
      skills[name] = { rank: toRank(rank), level, xp: Math.max(xp, 0) };
      if (typeof death?.timeStamp === 'number') diedAt = new Date(death.timeStamp);
    } else skills[name] = xp > 0 ? { rank: toRank(rank), level, xp } : null;
  }

  for (const { name, rank, score } of json.activities) {
    layout.activities.push(name);
    activities[name] = score > 0 ? { rank: toRank(rank), score } : null;
  }

  return { skills, activities, layout, ...(diedAt && { diedAt }) };
}

/** A real rank is never 0; Jagex sends `-1` for unranked. */
function toRank(rank: number): number | null {
  return rank > 0 ? rank : null;
}
