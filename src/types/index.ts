export interface Subject {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  code: string;
  createdAt: string;
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
  createdAt: string;
  order?: number;
  isFree?: boolean;
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
  createdAt: string;
  order?: number;
}

export interface Assessment {
  id: string;
  subjectId: string;
  title: string;
  url: string;
  isFree: boolean;
  createdAt: string;
  order?: number;
}

export interface UserProgress {
  userId: string;
  completedItems: string[]; // List of IDs (Video, File, Assessment)
}
