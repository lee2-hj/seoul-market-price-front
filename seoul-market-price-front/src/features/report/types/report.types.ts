export type ReportCategory =
  | "ALL"
  | "FAKE_LISTING"
  | "PRICE_DISTORTION"
  | "DUPLICATE"
  | "UNFAIR_BROKERAGE"
  | "OTHER";

export type ReportStatus = "RECEIVED" | "IN_PROGRESS" | "RESOLVED" | "REJECTED";

export interface ReportAttachment {
  id: number;
  fileName: string;
  fileSize: number;
}

export interface AdminReply {
  replyContent: string;
  repliedAt: string;
  adminName: string;
}

export interface ReportItem {
  id: number;
  category: ReportCategory;
  status: ReportStatus;
  targetProperty: string;
  title: string;
  content: string;
  authorName: string;
  authorUserId?: string;
  authorMemberId?: number | string;
  createdAt: string;
  isSecret: boolean;
  attachments?: ReportAttachment[];
  adminReply?: AdminReply;
}

export interface ReportCreateRequest {
  category: ReportCategory;
  targetProperty: string;
  title: string;
  content: string;
  isSecret: boolean;
  authorName: string;
  authorUserId?: string;
  authorMemberId?: number | string;
  files?: File[];
}

export interface ReportUpdateRequest {
  targetProperty: string;
  title: string;
  content: string;
  isSecret: boolean;
}
