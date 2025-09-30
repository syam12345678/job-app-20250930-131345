import { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "@/store/authStore";
import { Link, useNavigate } from "react-router-dom";
import type { ApiResponse, User, PushSubscriptionJSON } from "@shared/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Mail, Bell, Search, AlertCircle, Trash2, MapPin, Briefcase, Building, ArrowRight, Edit, BellRing } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { NotificationSettingsForm } from "@/components/NotificationSettingsForm";
import { Switch } from "@/components/ui/switch";
import { subscribeUserToPush } from "@/lib/push-notifications";
export function DashboardPage() {
  const { user: authUser, token, isAuthenticated, setUser } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPushSubscribing, setIsPushSubscribing] = useState(false);
  const fetchProfile = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/profile", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error("Failed to fetch profile data.");
      }
      const result: ApiResponse<Omit<User, 'passwordHash'>> = await response.json();
      if (result.success && result.data) {
        setUser(result.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setLoading(false);
    }
  }, [token, setUser]);
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    } else {
      fetchProfile();
    }
  }, [isAuthenticated, navigate, fetchProfile]);
  const handleDeleteSearch = async (searchName: string) => {
    if (!authUser) return;
    const toastId = toast.loading(`Deleting search "${searchName}"...`);
    try {
      const updatedSearches = authUser.savedSearches.filter(s => s.searchName !== searchName);
      const response = await fetch("/api/profile/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ savedSearches: updatedSearches })
      });
      const result: ApiResponse<{message: string;}> = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to delete search.");
      }
      toast.success("Search Deleted", {
        id: toastId,
        description: `Successfully deleted "${searchName}".`
      });
      fetchProfile();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
      toast.error("Deletion Failed", {
        id: toastId,
        description: errorMessage
      });
    }
  };
  const handleUpdateSuccess = () => {
    setIsEditDialogOpen(false);
    fetchProfile();
  };
  const handlePushToggle = async (checked: boolean) => {
    if (!checked) {
      // Note: Unsubscribing logic is more complex and not implemented for this demo.
      // A real app would need to invalidate the subscription on the server.
      toast.info("Disabling push notifications is not fully supported in this demo.", {
        description: "To re-subscribe, you may need to clear site data in your browser settings."
      });
      return;
    }
    setIsPushSubscribing(true);
    const toastId = toast.loading("Enabling push notifications...");
    try {
      const pushSubscription = await subscribeUserToPush();
      if (!pushSubscription) {
        throw new Error("Failed to get push subscription from browser.");
      }
      const response = await fetch("/api/profile/subscribe-push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ pushSubscription })
      });
      const result: ApiResponse<{ message: string }> = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to save push subscription.");
      }
      toast.success("Push Notifications Enabled!", {
        id: toastId,
        description: "You'll now receive real-time job alerts."
      });
      fetchProfile();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
      toast.error("Failed to Enable Push Notifications", {
        id: toastId,
        description: errorMessage
      });
    } finally {
      setIsPushSubscribing(false);
    }
  };
  if (!isAuthenticated) {
    return null;
  }
  const renderContent = () => {
    if (loading) {
      return (
        <div className="space-y-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>);
    }
    if (error) {
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>);
    }
    if (!authUser) {
      return (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No User Data</AlertTitle>
          <AlertDescription>Could not load your profile. Please try logging in again.</AlertDescription>
          <Button asChild size="sm" className="mt-4">
            <Link to="/login">
              Go to Login <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </Alert>);
    }
    return (
      <div className="space-y-8">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5 text-blue-500" /> Notification Settings</CardTitle>
              <CardDescription>Manage your alert preferences.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </CardHeader>
          <CardContent className="space-y-4 divide-y">
            <div className="flex items-center gap-2 pt-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <p><strong>Email Notifications:</strong> {authUser.notifications ? <Badge variant="default">Enabled</Badge> : <Badge variant="secondary">Disabled</Badge>}</p>
            </div>
            <div className="flex items-center justify-between pt-4">
              <div className="flex items-center gap-2">
                <BellRing className="h-4 w-4 text-muted-foreground" />
                <p><strong>Push Notifications:</strong> {authUser.pushSubscription ? <Badge variant="default">Enabled</Badge> : <Badge variant="secondary">Disabled</Badge>}</p>
              </div>
              <Switch
                checked={!!authUser.pushSubscription}
                onCheckedChange={handlePushToggle}
                disabled={isPushSubscribing}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Search className="h-5 w-5 text-green-500" /> Saved Searches</CardTitle>
            <CardDescription>You will receive notifications for each of these saved searches if notifications are enabled.</CardDescription>
          </CardHeader>
          <CardContent>
            {authUser.savedSearches && authUser.savedSearches.length > 0 ?
            <div className="space-y-4">
                {authUser.savedSearches.map((search, index) =>
              <div key={index} className="flex items-start justify-between p-4 border rounded-lg bg-background">
                    <div className="space-y-2">
                      <h4 className="font-semibold">{search.searchName}</h4>
                      <div className="text-sm text-muted-foreground flex flex-col items-start gap-1.5">
                        {search.keywords && <span className="flex items-center"><Search className="h-4 w-4 mr-2 text-foreground/70" /> {search.keywords}</span>}
                        {search.location && <span className="flex items-center"><MapPin className="h-4 w-4 mr-2 text-foreground/70" /> {search.location}</span>}
                        {search.experienceLevel && search.experienceLevel !== 'any' && <span className="flex items-center"><Briefcase className="h-4 w-4 mr-2 text-foreground/70" /> {search.experienceLevel}</span>}
                        {search.jobType && search.jobType !== 'any' && <span className="flex items-center"><Building className="h-4 w-4 mr-2 text-foreground/70" /> {search.jobType}</span>}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteSearch(search.searchName)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
              )}
              </div> :
            <p className="text-muted-foreground">You have no saved searches.</p>
            }
          </CardContent>
        </Card>
      </div>);
  };
  return (
    <>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-4 mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {authUser?.name || authUser?.email}. Manage your job alerts and preferences here.</p>
        </div>
        {renderContent()}
      </div>
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Notifications</DialogTitle>
            <DialogDescription>
              Update your job alert preferences below.
            </DialogDescription>
          </DialogHeader>
          {authUser && <NotificationSettingsForm user={authUser} onSuccess={handleUpdateSuccess} />}
        </DialogContent>
      </Dialog>
    </>
  );
}