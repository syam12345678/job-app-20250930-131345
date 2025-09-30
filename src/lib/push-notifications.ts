import { toast } from "sonner";
import type { PushSubscriptionJSON } from "@shared/types";
// In a real app, this key would be generated and stored securely.
// For this demo, we'll use a placeholder. The backend doesn't validate it,
// but a real web-push implementation would require the corresponding private key.
const VAPID_PUBLIC_KEY = "BEl62iUYgUivxIkv69yQv3O3hK2l-SXO-t-22_2n9a_yBceIlzZkUGCgCV-n_3g-3R3e_e-p1aYf_x1a-b-c-d-e";
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
export async function subscribeUserToPush(): Promise<PushSubscriptionJSON | null> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    toast.warning("Push Notifications not supported", {
      description: "Your browser does not support push notifications.",
    });
    return null;
  }
  try {
    const registration = await navigator.serviceWorker.ready;
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      console.log("User is already subscribed to push notifications.");
      return existingSubscription.toJSON() as PushSubscriptionJSON;
    }
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
    console.log("User subscribed to push notifications:", subscription);
    return subscription.toJSON() as PushSubscriptionJSON;
  } catch (error) {
    console.error("Failed to subscribe the user to push notifications:", error);
    if (Notification.permission === "denied") {
      toast.error("Permission for notifications was denied", {
        description: "Please enable notifications in your browser settings.",
      });
    } else {
      toast.error("Failed to subscribe to push notifications", {
        description: "An unexpected error occurred. Please try again.",
      });
    }
    return null;
  }
}