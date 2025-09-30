import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MapPin, Briefcase, Building, X, Save } from "lucide-react";
import { KEYWORD_SUGGESTIONS, LOCATION_SUGGESTIONS } from "@/lib/suggestions";
import { Badge } from "./ui/badge";
const searchSchema = z.object({
  keywords: z.string().optional(),
  location: z.string().optional(),
  experienceLevel: z.string().optional(),
  jobType: z.string().optional(),
});
export type SearchFormData = z.infer<typeof searchSchema>;
interface JobSearchFormProps {
  onSearch: (data: SearchFormData) => void;
  isSearching: boolean;
  onClear: () => void;
  hasActiveSearch: boolean;
  onSaveSearch: (data: SearchFormData) => void;
}
export function JobSearchForm({ onSearch, isSearching, onClear, hasActiveSearch, onSaveSearch }: JobSearchFormProps) {
  const form = useForm<SearchFormData>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      keywords: "",
      location: "",
      experienceLevel: "any",
      jobType: "any",
    },
  });
  const handleClear = () => {
    form.reset();
    onClear();
  };
  const handleSave = () => {
    onSaveSearch(form.getValues());
  };
  const handleSuggestionClick = (field: 'keywords' | 'location', value: string) => {
    const currentValues = form.getValues(field)?.split(',').map(k => k.trim()).filter(Boolean) || [];
    if (!currentValues.includes(value)) {
      const newValue = [...currentValues, value].join(', ');
      form.setValue(field, newValue, { shouldValidate: true });
    }
  };
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSearch)} className="p-6 bg-card/60 border rounded-lg shadow-md space-y-6 backdrop-blur-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <FormField
            control={form.control}
            name="keywords"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center text-sm font-medium text-muted-foreground"><Search className="h-4 w-4 mr-2" />Keywords</FormLabel>
                <FormControl>
                  <Input placeholder="React, Node.js..." {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center text-sm font-medium text-muted-foreground"><MapPin className="h-4 w-4 mr-2" />Location</FormLabel>
                <FormControl>
                  <Input placeholder="Remote, Bangalore..." {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="experienceLevel"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center text-sm font-medium text-muted-foreground"><Briefcase className="h-4 w-4 mr-2" />Experience</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="internship">Internship</SelectItem>
                    <SelectItem value="entry-level">Entry-level</SelectItem>
                    <SelectItem value="junior">Junior</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="jobType"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center text-sm font-medium text-muted-foreground"><Building className="h-4 w-4 mr-2" />Job Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="full-time">Full-time</SelectItem>
                    <SelectItem value="part-time">Part-time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="internship">Internship</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
        </div>
        <div className="space-y-3">
            <div>
                <FormLabel className="text-xs font-medium text-muted-foreground">Popular Keywords</FormLabel>
                <div className="flex flex-wrap gap-1.5 pt-2">
                    {KEYWORD_SUGGESTIONS.slice(0, 12).map(suggestion => (
                        <Badge key={suggestion} variant="secondary" className="cursor-pointer hover:bg-primary/20" onClick={() => handleSuggestionClick('keywords', suggestion)}>{suggestion}</Badge>
                    ))}
                </div>
            </div>
            <div>
                <FormLabel className="text-xs font-medium text-muted-foreground">Popular Locations</FormLabel>
                <div className="flex flex-wrap gap-1.5 pt-2">
                    {LOCATION_SUGGESTIONS.slice(0, 8).map(suggestion => (
                        <Badge key={suggestion} variant="secondary" className="cursor-pointer hover:bg-primary/20" onClick={() => handleSuggestionClick('location', suggestion)}>{suggestion}</Badge>
                    ))}
                </div>
            </div>
        </div>
        <div className="flex justify-end items-center gap-2 md:gap-4 border-t pt-4 mt-2">
          {hasActiveSearch && (
            <Button type="button" variant="ghost" onClick={handleClear} disabled={isSearching}>
              <X className="h-4 w-4 mr-2" />
              Clear Search
            </Button>
          )}
           <Button type="button" variant="outline" onClick={handleSave} disabled={isSearching}>
              <Save className="h-4 w-4 mr-2" />
              Save Search
            </Button>
          <Button type="submit" disabled={isSearching} className="bg-blue-600 text-white hover:bg-blue-700">
            <Search className="h-4 w-4 mr-2" />
            {isSearching ? 'Searching...' : 'Search Jobs'}
          </Button>
        </div>
      </form>
    </Form>
  );
}