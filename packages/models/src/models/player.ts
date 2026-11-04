import { HiscoreEntry, StoredHiscoreEntry } from './hiscores.js';

export enum PlayerType {
  Normal = 'normal',
  Ironman = 'ironman',
  Ultimate = 'ultimate',
  Hardcore = 'hardcore_ironman',
  /**
   * A Hardcore Worlds character, tracked from its own `hiscore_oldschool_hardcore_mains` table. After a death, a
   * Transfer to the main game makes it `normal`, with `diedAsHardcore` kept true.
   */
  HardcoreMain = 'hardcore_mains',
}

export enum PlayerStatus {
  Default = 'default',
  DeIroned = 'de_ironed',
  DeUltimated = 'de_ultimated',
}

export interface Player {
  username: string;
  combatLevel: number;
  /**
   * The account type, set by osrs-tracker-api on a lookup. Its value is the hiscore table's suffix: the web links to
   * Jagex's hiscores as `hiscore_oldschool_` + `type` (`normal` uses `hiscore_oldschool`).
   */
  type: PlayerType;
  status: PlayerStatus;
  /**
   * True when a hardcore player died, set by osrs-tracker-api on a lookup from Jagex's death record (hiscores'
   * `diedAt`). By `type`:
   * - `hardcore_ironman`: died; read from the hardcore table on each lookup.
   * - `hardcore_mains`: died on Hardcore Worlds and hasn't picked a Reset or a Transfer yet. Read on each lookup, so a
   *   Reset that brings the character back alive clears it.
   * - `normal`: a Hardcore Worlds character that died and transferred to the main game. Never cleared.
   */
  diedAsHardcore: boolean;

  /**
   * Last time osrs-tracker-api determined the player type and status. Refreshed on a lookup at most every
   * `MIN_PLAYER_REFRESH_HOURS` (2), or sooner when the player lacks the requested scraping offset.
   */
  lastModified: Date;
  /**
   * Last time a visitor looked the player up; orders the recent players list. Set by osrs-tracker-api on every lookup
   * of a stored player, tracked or not. Not the last hiscores scrape: that is the newest `hiscoreEntries` entry's
   * `date` for the offset.
   */
  lastHiscoreFetch?: Date;

  /** offsets for scraping hiscores compared to UTC midnight, between -12 and +11. */
  scrapingOffsets?: number[];
  /**
   * Scraping offsets that were paused because the player hasn't been on the hiscores (HTTP 404) for 7 days in a row.
   * Restored to `scrapingOffsets` when the player is found again.
   */
  pausedScrapingOffsets?: number[];
  /**
   * When a visitor last looked the player up per scraping offset, keyed by the offset as a string (`"-12"` to `"11"`).
   * clean-hiscores drops an offset (and its hiscore entries) that wasn't looked up for 180 days, except the most
   * recently looked up one. Never sent to the web.
   */
  scrapingOffsetLookups?: Record<string, Date>;
  /** Number of consecutive hiscore fetches that returned "not found". Reset on the next successful fetch. */
  hiscoreNotFoundCount?: number;
  /** Date of the first hiscore fetch in the current "not found" streak. Reset on the next successful fetch. */
  hiscoreNotFoundSince?: Date;
  hiscoreEntries?: HiscoreEntry[];

  /**
   * Date of the oldest stored hiscore entry for the requested `scrapingOffset`, `null` when there are none.
   * Computed by `GET /players/:username` in osrs-tracker-api, never stored.
   */
  trackedSince?: Date | null;
  /**
   * True when osrs-tracker-api couldn't refresh the player because the hiscores didn't respond (outage, rate limit,
   * timeout), so the returned data may be stale. Set by `GET /players/:username`, never stored.
   */
  refreshFailed?: boolean;
}

/** A player as stored in `players`: hiscore entries in the stored format, decoded with `decode`. */
export interface StoredPlayer extends Omit<Player, 'hiscoreEntries'> {
  hiscoreEntries?: StoredHiscoreEntry[];
}
