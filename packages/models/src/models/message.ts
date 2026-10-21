import { HiscoreEntry, HiscoreLayoutNames } from './hiscores.js';
import { PlayerCount } from './player-count.js';

export interface PlayerScrapeMessageBody {
  usernames: string[];
  scrapingOffset: number;
}

/**
 * A message on the scrape results queue: what a Lambda scraped, as JSON, for the ingester to apply to MongoDB. A
 * message can wait in the queue for up to 14 days, across a release of either side, so it holds raw results and never
 * stored or encoded data: the ingester encodes with the format current when it applies the message. An ingester that
 * doesn't know a message's `v` leaves it on the queue.
 *
 * Dates are ISO 8601 strings, as `JSON.parse` returns them: convert with `new Date()` before storing or comparing.
 */
export type ScrapeResultMessage = HiscoresResultMessage | PlayerCountResultMessage;

/** One player's hiscore, as `getHiscore` in `@osrs-tracker/hiscores` returns a found one. */
export interface ScrapedHiscore {
  username: string;
  hiscore: Pick<HiscoreEntry, 'skills' | 'activities'>;
  /** The names in Jagex's order, for `createHiscoreLayout`. */
  layout: HiscoreLayoutNames;
}

/** One process-players scrape job's results: the job's usernames, minus the failed ones it retries itself. */
export interface HiscoresResultMessage {
  v: 1;
  type: 'hiscores';
  /** When the job started scraping, ISO 8601: every entry of the job gets this date. */
  scrapedAt: string;
  scrapingOffset: number;
  found: ScrapedHiscore[];
  /** Not on the hiscores (HTTP 404, or 400 for an invalid name). */
  notFound: string[];
}

/** One sample from record-player-count. */
export interface PlayerCountResultMessage {
  v: 1;
  type: 'playerCount';
  /** `date` is ISO 8601. */
  playerCount: Omit<PlayerCount, 'date'> & { date: string };
}
