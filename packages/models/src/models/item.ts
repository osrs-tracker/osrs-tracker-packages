export interface Item {
  id: number;

  name: string;
  examine: string;
  icon: string;

  members: true;

  value: number;
  limit: number;

  lowalch: number;
  highalch: number;

  /** Last time the detail was fetched for this item. */
  lastFetch?: Date;

  /**
   * When the item first appeared in the OSRS Wiki's item list, as stored by osrs-tracker-api's ingester. Absent on items
   * stored before the ingester wrote it (not backfilled).
   */
  addedAt?: Date;

  /**
   * When osrs-tracker-api's ingester last wrote a change to the item's Wiki fields (name, examine, icon, members, value,
   * limit, alch values), its add included. Absent on items stored before the ingester wrote it (not backfilled).
   */
  updatedAt?: Date;
}
