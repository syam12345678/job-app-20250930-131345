import { Hono } from "hono";
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { jwt, sign } from 'hono/jwt';
import { Env } from './core-utils';
import type { Job, ApiResponse, PushSubscriptionJSON } from '@shared/types';
import { handleScheduled } from './cron';
const searchJobsSchema = z.object({
  keywords: z.string().optional(),
  location: z.string().optional(),
  experienceLevel: z.string().optional(),
  jobType: z.string().optional()
});
const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters")
});
const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters")
});
const savedSearchSchema = z.object({
  searchName: z.string(),
  keywords: z.string().optional(),
  location: z.string().optional(),
  experienceLevel: z.string().optional(),
  jobType: z.string().optional(),
});
const updateProfileSchema = z.object({
  savedSearches: z.array(savedSearchSchema).optional(),
  notifications: z.boolean().optional(),
});
const pushSubscriptionSchema = z.object({
  pushSubscription: z.object({
    endpoint: z.string().url(),
    expirationTime: z.number().nullable().optional(),
    keys: z.object({ p256dh: z.string(), auth: z.string() })
  })
});
export function userRoutes(app: Hono<{Bindings: Env;}>) {
  // --- Public Routes ---
  app.get('/api/jobs', async (c) => {
    try {
      const durableObjectStub = c.env.GlobalDurableObject.get(c.env.GlobalDurableObject.idFromName("global"));
      const jobs = await durableObjectStub.getJobs();
      return c.json({ success: true, data: jobs } satisfies ApiResponse<Job[]>);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      return c.json({ success: false, error: "Failed to fetch jobs" }, 500);
    }
  });
  app.post('/api/fetch-now', async (c) => {
    try {
      const result = await handleScheduled(c.env.GlobalDurableObject);
      return c.json({ success: true, data: result });
    } catch (error) {
      console.error("Error triggering manual fetch:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      return c.json({ success: false, error: "Failed to trigger manual fetch", details: errorMessage }, 500);
    }
  });
  app.post('/api/search-jobs', zValidator('json', searchJobsSchema), async (c) => {
    try {
      const filters = c.req.valid('json');
      const durableObjectStub = c.env.GlobalDurableObject.get(c.env.GlobalDurableObject.idFromName("global"));
      const jobs = await durableObjectStub.searchJobs(filters);
      return c.json({ success: true, data: jobs } satisfies ApiResponse<Job[]>);
    } catch (error) {
      console.error("Error searching jobs:", error);
      return c.json({ success: false, error: "Failed to search for jobs" }, 500);
    }
  });
  // --- Authentication Routes ---
  app.post('/api/signup', zValidator('json', signupSchema, (result, c) => {
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      const firstError = Object.values(errors)[0]?.[0] || "Invalid input.";
      return c.json({ success: false, error: firstError }, 400);
    }
  }), async (c) => {
    try {
      const { name, email, password } = c.req.valid('json');
      const durableObjectStub = c.env.GlobalDurableObject.get(c.env.GlobalDurableObject.idFromName("global"));
      await durableObjectStub.registerUser(name, email, password);
      return c.json({ success: true, data: { message: "User registered successfully" } }, 201);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      return c.json({ success: false, error: errorMessage }, 400);
    }
  });
  app.post('/api/login', zValidator('json', loginSchema, (result, c) => {
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      const firstError = Object.values(errors)[0]?.[0] || "Invalid input.";
      return c.json({ success: false, error: firstError }, 400);
    }
  }), async (c) => {
    try {
      const { email, password } = c.req.valid('json');
      const durableObjectStub = c.env.GlobalDurableObject.get(c.env.GlobalDurableObject.idFromName("global"));
      const user = await durableObjectStub.loginUser(email, password);
      const payload = { sub: user.id, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 }; // 24 hour expiration
      const token = await sign(payload, c.env.JWT_SECRET || 'a-secure-secret-key');
      return c.json({ success: true, data: { user, token } });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      return c.json({ success: false, error: errorMessage }, 401);
    }
  });
  // --- Protected Routes ---
  const jwtMiddleware = jwt({ secret: (c) => c.env.JWT_SECRET || 'a-secure-secret-key' });
  app.use('/api/profile', jwtMiddleware);
  app.use('/api/profile/*', jwtMiddleware);
  app.get('/api/profile', async (c) => {
    try {
      const payload = c.get('jwtPayload');
      const userId = payload.sub as string;
      const durableObjectStub = c.env.GlobalDurableObject.get(c.env.GlobalDurableObject.idFromName("global"));
      const profileData = await durableObjectStub.getUserProfile(userId);
      return c.json({ success: true, data: profileData });
    } catch (error) {
      console.error("Error fetching profile:", error);
      return c.json({ success: false, error: "Failed to fetch profile" }, 500);
    }
  });
  app.post('/api/profile/update', zValidator('json', updateProfileSchema), async (c) => {
    try {
      const payload = c.get('jwtPayload');
      const userId = payload.sub as string;
      const updates = c.req.valid('json');
      const durableObjectStub = c.env.GlobalDurableObject.get(c.env.GlobalDurableObject.idFromName("global"));
      await durableObjectStub.updateUserProfile(userId, updates);
      return c.json({ success: true, data: { message: 'Profile updated successfully' } });
    } catch (error) {
      console.error("Error updating profile:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      return c.json({ success: false, error: errorMessage }, 500);
    }
  });
  app.post('/api/profile/subscribe-push', zValidator('json', pushSubscriptionSchema), async (c) => {
    try {
      const payload = c.get('jwtPayload');
      const userId = payload.sub as string;
      const { pushSubscription } = c.req.valid('json');
      const durableObjectStub = c.env.GlobalDurableObject.get(c.env.GlobalDurableObject.idFromName("global"));
      await durableObjectStub.addPushSubscription(userId, pushSubscription as PushSubscriptionJSON);
      return c.json({ success: true, data: { message: 'Push notifications enabled!' } });
    } catch (error) {
      console.error("Error subscribing to push notifications:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      return c.json({ success: false, error: errorMessage }, 500);
    }
  });
}