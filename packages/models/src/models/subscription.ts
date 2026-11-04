/**
 * One item in the DynamoDB subscriptions table: a player's `scrapingOffsets`, which the ingester copies from MongoDB
 * and queue-players reads to know whom to scrape each hour.
 *
 * `scrapingOffsets` is a Number Set, which `@aws-sdk/lib-dynamodb` writes from a `Set` (an array would become a List)
 * and reads back as one. A Number Set can't be empty: a player without offsets has no item.
 */
export interface PlayerSubscription {
  username: string;
  scrapingOffsets: Set<number>;
  /** The hiscore table to scrape the player from; absent means `hiscore_oldschool`. Written by the ingester's sync. */
  table?: ScrapeTable;
}

/**
 * A hiscore table a player is scraped from, other than the default `hiscore_oldschool`. The ingester's sync writes it
 * to `PlayerSubscription.table`, queue-players passes it on in `PlayerScrapeMessageBody.table`, and process-players
 * fetches it.
 */
export type ScrapeTable = 'hiscore_oldschool_hardcore_mains';
