export type BugCategory = "playback" | "loading" | "ui" | "crash" | "other";
export type BugStatus = "open" | "closed";
export type BugEntityType = "track" | "album" | "artist" | "playlist";

export interface BugReportReporter {
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

export interface BugReport {
  id: string;
  reporter_id: string;
  reporter: BugReportReporter | null;
  category: BugCategory;
  description: string;
  entity_type: BugEntityType | null;
  entity_id: string | null;
  status: BugStatus;
  created_at: string;
  updated_at: string;
}

export interface BugReportCreate {
  category: BugCategory;
  description: string;
  entity_type?: BugEntityType;
  entity_id?: string;
}

export interface BugReportUpdate {
  status: BugStatus;
}