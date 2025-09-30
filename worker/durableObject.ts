import { DurableObject } from "cloudflare:workers";
import type { Job, PushSubscriptionJSON, SavedSearch, User } from '@shared/types';
import { MOCK_JOBS } from '@shared/mock-data';
import * as bcrypt from 'bcryptjs';
const JOBS_KEY = "jobs";
const USERS_KEY = "users";
interface PendingNotification {
  email: string;
  searchName: string;
  jobs: Job[];
  pushSubscription?: PushSubscriptionJSON;
}
interface SearchFilters {
    keywords?: string;
    location?: string;
    experienceLevel?: string;
    jobType?: string;
}
const JOB_SOURCES = [
  "https://remotive.com/api/remote-jobs?category=software-dev&search=india&limit=20",
  "https://remotive.com/api/remote-jobs?category=software-dev&limit=30",
];
const FRESHER_KEYWORDS = ['intern', 'internship', 'junior', 'entry-level', 'graduate', 'trainee', 'fresher', 'final year'];
export class GlobalDurableObject extends DurableObject {
    // User Management
    async getUsers(): Promise<User[]> {
        return (await this.ctx.storage.get<User[]>(USERS_KEY)) || [];
    }
    async registerUser(name: string, email: string, passwordVal: string): Promise<Omit<User, 'passwordHash'>> {
        const users = await this.getUsers();
        if (users.some(u => u.email === email)) {
            throw new Error("User with this email already exists.");
        }
        const passwordHash = await bcrypt.hash(passwordVal, 10);
        const newUser: User = {
            id: crypto.randomUUID(),
            name,
            email,
            passwordHash,
            savedSearches: [],
            notifications: true,
            lastNotified: new Date().toISOString(),
        };
        users.push(newUser);
        await this.ctx.storage.put(USERS_KEY, users);
        const { passwordHash: _, ...userToReturn } = newUser;
        return userToReturn;
    }
    async loginUser(email: string, passwordVal: string): Promise<Omit<User, 'passwordHash'>> {
        const users = await this.getUsers();
        const user = users.find(u => u.email === email);
        if (!user) {
            throw new Error("Invalid credentials.");
        }
        const isPasswordValid = await bcrypt.compare(passwordVal, user.passwordHash);
        if (!isPasswordValid) {
            throw new Error("Invalid credentials.");
        }
        const { passwordHash, ...userToReturn } = user;
        return userToReturn;
    }
    async getUserProfile(userId: string): Promise<Omit<User, 'passwordHash'> | null> {
        const users = await this.getUsers();
        const user = users.find(u => u.id === userId);
        if (!user) return null;
        const { passwordHash, ...userToReturn } = user;
        return userToReturn;
    }
    async updateUserProfile(userId: string, updates: Partial<Pick<User, 'savedSearches' | 'notifications'>>): Promise<void> {
        const users = await this.getUsers();
        const userIndex = users.findIndex(u => u.id === userId);
        if (userIndex > -1) {
            const user = users[userIndex];
            if (updates.savedSearches !== undefined) {
                user.savedSearches = updates.savedSearches;
            }
            if (updates.notifications !== undefined) {
                user.notifications = updates.notifications;
            }
            users[userIndex] = user;
            await this.ctx.storage.put(USERS_KEY, users);
        } else {
            throw new Error("User not found.");
        }
    }
    async addPushSubscription(userId: string, pushSubscription: PushSubscriptionJSON): Promise<void> {
        const users = await this.getUsers();
        const userIndex = users.findIndex(u => u.id === userId);
        if (userIndex > -1) {
            users[userIndex].pushSubscription = pushSubscription;
            await this.ctx.storage.put(USERS_KEY, users);
        } else {
            throw new Error("User not found.");
        }
    }
    // Job Management
    async getJobs(): Promise<Job[]> {
      const jobs = await this.ctx.storage.get<Job[]>(JOBS_KEY);
      if (jobs) return jobs;
      await this.ctx.storage.put(JOBS_KEY, MOCK_JOBS);
      return MOCK_JOBS;
    }
    async searchJobs(filters: SearchFilters): Promise<Job[]> {
        const allJobs = await this.getJobs();
        return this.filterJobs(allJobs, filters);
    }
    async fetchAndProcessExternalJobs(): Promise<{ added: number, fetched: number, duplicates: number }> {
      const cache = caches.default as unknown as Cache;
      const fetchPromises = JOB_SOURCES.map(async (url) => {
        try {
          const request = new Request(url);
          let response = await cache.match(request);
          if (!response) {
            const originResponse = await fetch(request);
            if (!originResponse.ok) return [];
            const headers = new Headers(originResponse.headers);
            headers.set("Cache-Control", "public, max-age=600");
            response = new Response(originResponse.body, { status: originResponse.status, statusText: originResponse.statusText, headers });
            this.ctx.waitUntil(cache.put(request, response.clone()));
          }
          const data = await response.json() as { jobs: any[] };
          return data.jobs || [];
        } catch (error) {
          console.error(`Error processing source ${url}:`, error);
          return [];
        }
      });
      const results = await Promise.all(fetchPromises);
      const allExternalJobs = results.flat();
      const normalizedJobs: Job[] = allExternalJobs.map(job => {
          const jobTypeStr = job.job_type || '';
          let jobType: Job['jobType'] = 'Full-time';
          if (jobTypeStr.includes('full')) jobType = 'Full-time';
          else if (jobTypeStr.includes('part')) jobType = 'Part-time';
          else if (jobTypeStr.includes('contract')) jobType = 'Contract';
          return { id: job.id.toString(), title: job.title, company: job.company_name, location: job.candidate_required_location || 'Remote', tags: job.tags || [], url: job.url, postedDate: job.publication_date, description: job.description || '', skills: job.tags || [], jobType: jobType };
        }).filter(job => {
          const titleLower = job.title.toLowerCase();
          const locationLower = job.location.toLowerCase();
          return locationLower.includes('india') || FRESHER_KEYWORDS.some(kw => titleLower.includes(kw));
        });
      const uniqueJobsByURL = Array.from(new Map(normalizedJobs.map(job => [job.url, job])).values());
      const existingJobs = await this.getJobs();
      const existingJobUrls = new Set(existingJobs.map(job => job.url));
      const newUniqueJobs = uniqueJobsByURL.filter(job => !existingJobUrls.has(job.url));
      const duplicates = uniqueJobsByURL.length - newUniqueJobs.length;
      if (newUniqueJobs.length > 0) {
        const combinedJobs = [...newUniqueJobs, ...existingJobs];
        const sortedJobs = combinedJobs.sort((a, b) => new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime());
        await this.ctx.storage.put(JOBS_KEY, sortedJobs.slice(0, 200));
      }
      return { added: newUniqueJobs.length, fetched: allExternalJobs.length, duplicates };
    }
    // Notification Logic
    async getPendingNotifications(): Promise<PendingNotification[]> {
        const allJobs = await this.getJobs();
        const users = await this.getUsers();
        const pendingNotifications: PendingNotification[] = [];
        for (const user of users) {
            if (!user.notifications || !user.savedSearches || user.savedSearches.length === 0) continue;
            const lastNotifiedDate = user.lastNotified ? new Date(user.lastNotified) : new Date(0);
            const newJobsForUser = allJobs.filter(job => new Date(job.postedDate) > lastNotifiedDate);
            if (newJobsForUser.length === 0) continue;
            for (const savedSearch of user.savedSearches) {
                const matchingJobs = this.filterJobs(newJobsForUser, savedSearch);
                if (matchingJobs.length > 0) {
                    pendingNotifications.push({
                        email: user.email,
                        searchName: savedSearch.searchName,
                        jobs: matchingJobs,
                        pushSubscription: user.pushSubscription,
                    });
                }
            }
        }
        return pendingNotifications;
    }
    async updateUserLastNotified(email: string): Promise<void> {
        const users = await this.getUsers();
        const userIndex = users.findIndex(u => u.email === email);
        if (userIndex > -1) {
            users[userIndex].lastNotified = new Date().toISOString();
            await this.ctx.storage.put(USERS_KEY, users);
        }
    }
    private filterJobs(jobs: Job[], filters: SearchFilters): Job[] {
        const { keywords, location, experienceLevel, jobType } = filters;
        const searchKeywords = keywords?.toLowerCase().split(',').map(k => k.trim()).filter(Boolean) || [];
        const searchLocation = location?.toLowerCase().trim();
        const searchExperience = experienceLevel?.toLowerCase() || 'any';
        const searchJobType = (jobType?.toLowerCase() === 'any' ? '' : jobType?.toLowerCase()) || '';
        return jobs.filter(job => {
            const jobTitle = job.title.toLowerCase();
            const jobDescription = job.description?.toLowerCase() || '';
            const jobTags = job.tags.map(t => t.toLowerCase());
            const jobSkills = job.skills?.map(s => s.toLowerCase()) || [];
            const jobLocation = job.location.toLowerCase();
            const jobTypeLower = job.jobType?.toLowerCase();
            const keywordMatch = searchKeywords.length === 0 || searchKeywords.some(k => jobTitle.includes(k) || jobDescription.includes(k) || jobTags.includes(k) || jobSkills.includes(k));
            const locationMatch = !searchLocation || jobLocation.includes(searchLocation);
            let experienceMatch = true;
            if (searchExperience && searchExperience !== 'any') {
                const isFresherJob = FRESHER_KEYWORDS.some(kw => jobTitle.includes(kw) || jobDescription.includes(kw));
                if (['internship', 'entry-level', 'junior'].includes(searchExperience)) {
                    experienceMatch = isFresherJob || jobTypeLower === 'internship';
                }
            }
            const jobTypeMatch = !searchJobType || jobTypeLower === searchJobType;
            return keywordMatch && locationMatch && experienceMatch && jobTypeMatch;
        });
    }
}