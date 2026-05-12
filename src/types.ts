export type Classification = 'Good' | 'Bad';

export interface Review {
  id?: string;
  classification: Classification;
  visitorName: string;
  visitDate: string;
  rating: number;
  type: string;
  details: string;
  timestamp: any; // Firestore serverTimestamp
  status: 'pending' | 'replied';
  adminReply?: string;
  repliedAt?: any;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}
