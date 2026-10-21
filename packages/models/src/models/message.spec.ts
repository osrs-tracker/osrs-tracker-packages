import { describe, expect, it } from 'vitest';
import { codecFixtures } from '../hiscores/codec.test-utils.js';
import { HiscoreEntry } from './hiscores.js';
import { HiscoresResultMessage, ScrapeResultMessage, ScrapedHiscore } from './message.js';

/** SQS's maximum message size, 1 MiB. */
const SQS_MAX_MESSAGE_BYTES = 1024 * 1024;
/** The players of one scrape job: process-players' `PLAYERS_PER_EVENT` in osrs-tracker-aws (10). */
const PLAYERS_PER_JOB = 10;

/** A real layout with every value at its widest: ranked, a 7-digit rank and the longest xp and score. */
function widestHiscore(username: string): ScrapedHiscore {
  const { layout } = codecFixtures()['b0aty'];
  const skills: HiscoreEntry['skills'] = {};
  for (const name of layout.skills) skills[name] = { rank: 1_999_999, level: 126, xp: 4_600_000_000 };
  const activities: HiscoreEntry['activities'] = {};
  for (const name of layout.activities) activities[name] = { rank: 1_999_999, score: 99_999 };
  return { username, hiscore: { skills, activities }, layout };
}

describe('HiscoresResultMessage', () => {
  it('stays well under the SQS limit for a full scrape job', () => {
    const message: HiscoresResultMessage = {
      v: 1,
      type: 'hiscores',
      scrapedAt: new Date(0).toISOString(),
      scrapingOffset: -12,
      // 12 characters, the longest OSRS name
      found: Array.from({ length: PLAYERS_PER_JOB }, (_, i) => widestHiscore(`player name${i}`)),
      notFound: [],
    };

    const bytes = Buffer.byteLength(JSON.stringify(message));

    expect(bytes).toBeLessThan(SQS_MAX_MESSAGE_BYTES / 4);
  });

  it('comes through JSON unchanged, with `null` values and unranked values', () => {
    const { b0aty } = codecFixtures();
    const message: ScrapeResultMessage = {
      v: 1,
      type: 'hiscores',
      scrapedAt: '2026-10-21T13:00:04.512Z',
      scrapingOffset: 1,
      found: [
        {
          username: 'b0aty',
          hiscore: {
            skills: { ...b0aty.skills, Sailing: { rank: null, level: 30, xp: 13_363 } },
            activities: { ...b0aty.activities, 'Clue Scrolls (all)': null },
          },
          layout: b0aty.layout,
        },
      ],
      notFound: ['renamed1'],
    };

    expect(JSON.parse(JSON.stringify(message))).toEqual(message);
  });
});
