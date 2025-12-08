"use client";

import Dexie, { type Table } from "dexie";

export type ToneMode = "roast" | "standard" | "auto";

export interface UserRecord {
  id?: number;
  email: string;
  pinHash: string;
  createdAt: number;
  toneMode: ToneMode;
}

class AppDatabase extends Dexie {
  users!: Table<UserRecord, number>;

  constructor() {
    super("ClassGuardDB");
    this.version(1).stores({
      users: "++id,&email,createdAt,toneMode",
    });
  }
}

let dbInstance: AppDatabase | null = null;

export function getDb(): AppDatabase {
  if (!dbInstance) {
    dbInstance = new AppDatabase();
  }
  return dbInstance;
}
