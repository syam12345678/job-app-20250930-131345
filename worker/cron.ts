import type { GlobalDurableObject } from './durableObject';
import { sendNotificationEmail } from './email';
import { sendPushNotification } from './push';
export async function handleScheduled(durableObject: DurableObjectNamespace<GlobalDurableObject>) {
  console.log("Cron trigger received. Starting job processing...");
  const stub = durableObject.get(durableObject.idFromName("global"));
  // 1. Fetch and process new jobs from external sources
  const { added, fetched, duplicates } = await stub.fetchAndProcessExternalJobs();
  console.log(`Fetched ${fetched} jobs, found ${duplicates} duplicates, added ${added} new jobs.`);
  if (added === 0) {
    console.log("No new jobs to process. Ending cron run.");
    return { success: true, message: "No new jobs to process." };
  }
  // 2. Get pending notifications for all users based on their saved searches
  const notifications = await stub.getPendingNotifications();
  console.log(`Found ${notifications.length} pending notifications across all users/searches.`);
  if (notifications.length === 0) {
    return { success: true, message: "New jobs found, but no matching saved searches." };
  }
  // 3. Send notifications concurrently
  const notificationPromises = notifications.map(async (notification) => {
    try {
      // Send email notification
      await sendNotificationEmail(notification);
      // Send web push notification if user is subscribed
      if (notification.pushSubscription) {
        for (const job of notification.jobs) {
          await sendPushNotification({
            pushSubscription: notification.pushSubscription,
            job: job,
          });
        }
      }
      // Update the user's lastNotified timestamp in the DO
      await stub.updateUserLastNotified(notification.email);
      return { status: 'fulfilled', email: notification.email, search: notification.searchName };
    } catch (error) {
      console.error(`Failed to send notification to ${notification.email} for search "${notification.searchName}":`, error);
      return { status: 'rejected', email: notification.email, reason: error };
    }
  });
  const results = await Promise.allSettled(notificationPromises);
  const successfulNotifications = results.filter(r => r.status === 'fulfilled').length;
  const failedNotifications = results.length - successfulNotifications;
  const resultMessage = `Cron job finished. Sent ${successfulNotifications} notifications. Failed for ${failedNotifications}.`;
  console.log(resultMessage);
  return { success: true, message: resultMessage, details: { fetched, added, duplicates, successfulNotifications, failedNotifications } };
}