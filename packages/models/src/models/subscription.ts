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
}
