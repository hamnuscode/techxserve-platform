import type { ID, ISODate } from './common';

export type DateCategory = 'Tax' | 'Licence' | 'Contract' | 'Insurance' | 'Other';
export type DatePriority = 'Critical' | 'High' | 'Medium' | 'Low';

export interface ImportantDate {
  id: ID;
  title: string;
  date: ISODate;
  category: DateCategory;
  advanceNoticeDays: number;
  priority: DatePriority;
  completed: boolean;
  recurring?: boolean;
}

export interface DocFolder {
  id: ID;
  name: string;
  parentId: ID | null;
  count: number;
}

export interface DocFile {
  id: ID;
  folderId: ID;
  name: string;
  type: 'pdf' | 'image' | 'doc' | 'sheet' | 'other';
  sizeKb: number;
  uploadedBy: string;
  uploadedAt: ISODate;
  // Google Drive backing (set when uploaded via the Drive edge function).
  driveFileId?: string;
  driveViewUrl?: string;
  mimeType?: string;
}
