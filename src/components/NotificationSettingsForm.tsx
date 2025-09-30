import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormDescription } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Bell, Save } from "lucide-react";
import { useState, useEffect } from "react";
import type { ApiResponse, User } from "@shared/types";
import { useAuthStore } from "@/store/authStore";
const notificationSettingsSchema = z.object({
  notifications: z.boolean(),
});
type NotificationSettingsFormData = z.infer<typeof notificationSettingsSchema>;
interface NotificationSettingsFormProps {
  user: Omit<User, 'passwordHash'>;
  onSuccess: () => void;
}
export function NotificationSettingsForm({ user, onSuccess }: NotificationSettingsFormProps) {
  const [isSaving, setIsSaving] = useState(false);
  const { token } = useAuthStore();
  const form = useForm<NotificationSettingsFormData>({
    resolver: zodResolver(notificationSettingsSchema),
    defaultValues: {
      notifications: true,
    },
  });
  useEffect(() => {
    if (user) {
      form.reset({
        notifications: user.notifications,
      });
    }
  }, [user, form]);
  async function onSubmit(values: NotificationSettingsFormData) {
    setIsSaving(true);
    const toastId = toast.loading("Updating your preferences...");
    try {
      const response = await fetch("/api/profile/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(values),
      });
      const result: ApiResponse<{ message: string }> = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to update profile.");
      }
      toast.success("Preferences Updated!", {
        id: toastId,
        description: "Your notification settings have been saved.",
      });
      onSuccess();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
      toast.error("Update Failed", {
        id: toastId,
        description: errorMessage,
      });
    } finally {
      setIsSaving(false);
    }
  }
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
        <FormField
          control={form.control}
          name="notifications"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base flex items-center">
                  <Bell className="h-4 w-4 mr-2" />
                  Email Notifications
                </FormLabel>
                <FormDescription>
                  Receive an email when new jobs match your saved searches.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </Form>
  );
}