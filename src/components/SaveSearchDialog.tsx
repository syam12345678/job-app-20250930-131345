import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tag, Save } from "lucide-react";
import { useState, useEffect } from "react";
import type { SearchFormData } from "./JobSearchForm";
import type { ApiResponse, SavedSearch, User } from "@shared/types";
import { useAuthStore } from "@/store/authStore";
import { useNavigate } from "react-router-dom";
const saveSearchSchema = z.object({
  searchName: z.string().min(3, { message: "Search name must be at least 3 characters." }),
});
type SaveSearchFormData = z.infer<typeof saveSearchSchema>;
interface SaveSearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  searchFilters: SearchFormData | null;
}
export function SaveSearchDialog({ isOpen, onClose, searchFilters }: SaveSearchDialogProps) {
  const [isSaving, setIsSaving] = useState(false);
  const { user, token, isAuthenticated, setUser } = useAuthStore();
  const navigate = useNavigate();
  const form = useForm<SaveSearchFormData>({
    resolver: zodResolver(saveSearchSchema),
    defaultValues: {
      searchName: "",
    },
  });
  useEffect(() => {
    if (!isOpen) {
      form.reset();
    }
  }, [isOpen, form]);
  async function onSubmit(values: SaveSearchFormData) {
    if (!isAuthenticated || !user) {
      toast.error("Authentication Required", {
        description: "You must be logged in to save a search.",
        action: {
          label: "Login",
          onClick: () => navigate("/login"),
        },
      });
      return;
    }
    if (!searchFilters) {
      toast.error("Cannot save search", { description: "No search criteria available." });
      return;
    }
    setIsSaving(true);
    const toastId = toast.loading("Saving your search...");
    try {
      const newSearch: SavedSearch = {
        ...values,
        ...searchFilters,
      };
      const updatedSearches = [...user.savedSearches.filter(s => s.searchName !== newSearch.searchName), newSearch];
      const response = await fetch("/api/profile/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ savedSearches: updatedSearches }),
      });
      const result: ApiResponse<{ message: string }> = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to save search.");
      }
      setUser({ ...user, savedSearches: updatedSearches });
      toast.success("Search Saved!", {
        id: toastId,
        description: "You can manage your saved searches on your dashboard.",
      });
      onClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
      toast.error("Failed to Save Search", {
        id: toastId,
        description: errorMessage,
      });
    } finally {
      setIsSaving(false);
    }
  }
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save Your Search</DialogTitle>
          <DialogDescription>
            Give this search a name to save it to your profile. You'll be notified of new jobs matching these criteria.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="searchName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Search Name</FormLabel>
                   <div className="relative">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <FormControl>
                      <Input placeholder="e.g., Remote React Jobs" {...field} className="pl-10" />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Saving..." : "Save Search"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}