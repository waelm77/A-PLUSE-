export interface Subject {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  code: string;
  createdAt: string;
  order?: number;
  tickerText?: string;
  tickerColor?: string;
  tickerBgColor?: string;
  tickerActive?: boolean;
  tickerSpeed?: number;
  tickerFontSize?: string;
  countdownActive?: boolean;
  countdownTitle?: string;
  countdownEndDate?: string;
  isHidden?: boolean;
}

export interface Video {
  id: string;
  subjectId: string;
  title: string;
  type: "theory" | "review" | "practical";
  sourceType: "youtube" | "telegram" | "upload";
  url: string;
  thumbnail?: string;
  duration?: string;
  color?: string;
  createdAt: string;
  order?: number;
  isFree?: boolean;
  isHidden?: boolean;
}

export interface FileItem {
  id: string;
  subjectId: string;
  title: string;
  fileType: string;
  size?: string;
  downloadUrl: string;
  downloads: number;
  isFree: boolean;
  canDownload?: boolean;
  canView?: boolean;
  createdAt: string;
  order?: number;
  isHidden?: boolean;
}

export interface Assessment {
  id: string;
  subjectId: string;
  title: string;
  url: string;
  isFree: boolean;
  createdAt: string;
  order?: number;
  isHidden?: boolean;
}

export interface UserProgress {
  userId: string;
  completedItems: string[];
}

export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  userAgent: string;
  lastAccess: string;
  approvedAt: string;
}

export interface Student {
  id: string;
  username: string;
  password: string;
  displayName: string;
  isActive: boolean;
  enrolledSubjects: string[];
  devices: DeviceInfo[];
  createdAt: string;
}

export interface StudentFormData {
  username: string;
  password: string;
  displayName: string;
  enrolledSubjects: string[];
}

export interface Admin {
  id: string;
  name: string;
  email: string;
}

export interface Ticker {
  text: string;
  color: string;
  bgColor?: string;
  active: boolean;
  speed?: number;
  fontSize?: string;
}

// ─── Statistics ────────────────────────────────────────────────

/** Uniquely identifies a browser/device for visitor counting (spam-safe). */
export interface DailyVisit {
  date: string;       // YYYY-MM-DD (local)
  deviceIds: string[]; // unique device ids seen that day
  pageviews: number;  // total raw page loads
}

export interface VideoStats {
  videoId: string;
  subjectId: string;
  title: string;
  views: number;          // number of times play was started
  watchSeconds: number;   // cumulative watch time
  lastViewedAt: string;
}

export interface VisitorSession {
  deviceId: string;
  firstSeen: string;
  lastSeen: string;
  visits: number;
}

export interface StatsData {
  visitorsToday: number;
  totalVisitors: number;
  totalPageviews: number;
  topVideos: VideoStats[];
  totalVideos: number;
  totalWatchHours: number;
}
