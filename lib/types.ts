export type ToneMode = "roast" | "standard" | "auto";

export interface UserRecord {
  id: string;
  email: string;
  pinHash: string;
  createdAt: Date | number;
  toneMode: ToneMode;
}



