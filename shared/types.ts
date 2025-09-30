export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  tags: string[];
  url: string;
  postedDate: string; // ISO 8601 string
  description?: string;
  skills?: string[];
  jobType?: 'Full-time' | 'Part-time' | 'Contract' | 'Internship';
}
export interface PushSubscriptionJSON {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}
export interface SavedSearch {
  searchName: string;
  keywords?: string;
  location?: string;
  experienceLevel?: string;
  jobType?: string;
}
export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string; // Only for backend, should not be sent to frontend
  savedSearches: SavedSearch[];
  notifications: boolean;
  pushSubscription?: PushSubscriptionJSON;
  lastNotified?: string; // ISO 8601 string
}
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}