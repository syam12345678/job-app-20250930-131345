import { useEffect, useState } from "react";
import { toast } from "@/components/ui/sonner";
import { JobCard } from "@/components/JobCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { Job, ApiResponse } from "@shared/types";
import { Briefcase, Zap, SearchX, UserPlus, ServerCrash, RefreshCw, X } from "lucide-react";
import { JobSearchForm, type SearchFormData } from "@/components/JobSearchForm";
import { JobDetailModal } from "@/components/JobDetailModal";
import { SaveSearchDialog } from "@/components/SaveSearchDialog";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious } from
"@/components/ui/pagination";
import { Link } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
const JOBS_PER_PAGE = 6;
export function HomePage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [hasActiveSearch, setHasActiveSearch] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaveSearchDialogOpen, setIsSaveSearchDialogOpen] = useState(false);
  const [searchToSave, setSearchToSave] = useState<SearchFormData | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  async function fetchJobs() {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/jobs");
      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.statusText}`);
      }
      const data: ApiResponse<Job[]> = await response.json();
      if (data.success && data.data) {
        const sortedJobs = data.data.sort((a, b) => new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime());
        setAllJobs(sortedJobs);
        setJobs(sortedJobs);
      } else {
        throw new Error(data.error || "Could not retrieve jobs.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    fetchJobs();
  }, []);
  const handleFetchNow = async () => {
    setIsFetching(true);
    const toastId = toast.loading("Triggering job fetcher...", {
      description: "Checking for new opportunities from external sources."
    });
    try {
      const response = await fetch("/api/fetch-now", { method: "POST" });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to trigger job fetcher.");
      }
      toast.success("Job fetcher finished!", {
        id: toastId,
        description: result.data?.message || "Process completed successfully."
      });
      await fetchJobs();
      setHasActiveSearch(false);
      setCurrentPage(1);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
      toast.error("Error Triggering Job Fetcher", {
        id: toastId,
        description: errorMessage
      });
    } finally {
      setIsFetching(false);
    }
  };
  const handleSearch = async (searchData: SearchFormData) => {
    setIsSearching(true);
    setError(null);
    setCurrentPage(1);
    try {
      const response = await fetch("/api/search-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(searchData)
      });
      if (!response.ok) throw new Error("Search request failed");
      const result: ApiResponse<Job[]> = await response.json();
      if (result.success && result.data) {
        setJobs(result.data);
        setHasActiveSearch(true);
      } else {
        throw new Error(result.error || "Could not retrieve search results.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred during search.");
      setJobs(allJobs);
    } finally {
      setIsSearching(false);
    }
  };
  const handleClearSearch = () => {
    setJobs(allJobs);
    setHasActiveSearch(false);
    setError(null);
    setCurrentPage(1);
  };
  const handleViewDetails = (job: Job) => {
    setSelectedJob(job);
    setIsModalOpen(true);
  };
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedJob(null), 300);
  };
  const handleOpenSaveSearchDialog = (searchData: SearchFormData) => {
    setSearchToSave(searchData);
    setIsSaveSearchDialogOpen(true);
  };
  const totalPages = Math.ceil(jobs.length / JOBS_PER_PAGE);
  const paginatedJobs = jobs.slice((currentPage - 1) * JOBS_PER_PAGE, currentPage * JOBS_PER_PAGE);
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };
  const renderJobContent = () => {
    if (loading || isSearching) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, index) =>
          <div key={index} className="flex flex-col space-y-3 p-6 border rounded-lg bg-card/50">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
              <div className="flex gap-2 pt-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-20" />
              </div>
            </div>
          )}
        </div>);
    }
    if (error) {
      return (
        <div className="text-center py-10 px-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg flex flex-col items-center space-y-4">
          <ServerCrash className="h-12 w-12" />
          <p className="font-semibold text-lg">Oops! Something went wrong.</p>
          <p className="text-sm max-w-md">We couldn't load the job listings. This might be a temporary issue.</p>
          <Button onClick={fetchJobs} variant="destructive" className="bg-red-600 hover:bg-red-700 text-white">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>);
    }
    if (jobs.length === 0) {
      return (
        <div className="text-center py-10 px-4 bg-slate-100 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 rounded-lg flex flex-col items-center space-y-4">
          <SearchX className="h-12 w-12" />
          <p className="font-semibold text-lg">{hasActiveSearch ? "No Jobs Match Your Search" : "No Opportunities Found"}</p>
          <p className="text-sm max-w-md">
            {hasActiveSearch ?
            "Try adjusting your filters or clearing the search to see more results." :
            "There are currently no jobs listed. Try fetching the latest jobs from our sources."}
          </p>
          {hasActiveSearch ?
          <Button onClick={handleClearSearch} variant="outline">
                <X className="h-4 w-4 mr-2" />
                Clear Search
            </Button> :
          <Button onClick={handleFetchNow} variant="outline" disabled={isFetching}>
                <Zap className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
                {isFetching ? "Fetching..." : "Fetch Latest Jobs"}
            </Button>
          }
        </div>);
    }
    return (
      <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedJobs.map((job) =>
          <JobCard key={job.id} job={job} onViewDetails={handleViewDetails} />
          )}
        </div>
        {totalPages > 1 &&
        <Pagination className="mt-12">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious href="#" onClick={(e) => {e.preventDefault();handlePageChange(currentPage - 1);}} className={currentPage === 1 ? "pointer-events-none opacity-50" : ""} />
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) =>
            <PaginationItem key={page}>
                  <PaginationLink href="#" onClick={(e) => {e.preventDefault();handlePageChange(page);}} isActive={currentPage === page}>
                    {page}
                  </PaginationLink>
                </PaginationItem>
            )}
              <PaginationItem>
                <PaginationNext href="#" onClick={(e) => {e.preventDefault();handlePageChange(currentPage + 1);}} className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""} />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        }
      </>);
  };
  return (
    <>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="flex flex-col items-center space-y-16 md:space-y-24">
          <section className="text-center space-y-6 w-full">
            <div className="inline-flex items-center justify-center p-3 bg-blue-100 dark:bg-blue-900/50 rounded-full mb-4">
              <Briefcase className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-slate-800 to-slate-600 dark:from-slate-200 dark:to-slate-400">
              JobBeacon
            </h1>
            <p className="max-w-2xl mx-auto text-lg text-slate-600 dark:text-slate-400">
              Your curated source for the latest IT and developer jobs. Create an account to save searches and get personalized alerts.
            </p>
            <Button asChild size="lg" className="bg-blue-600 text-white hover:bg-blue-700 transition-all duration-200 hover:-translate-y-0.5 active:scale-95">
              <Link to="/register">
                <UserPlus className="h-5 w-5 mr-2" />
                Get Started for Free
              </Link>
            </Button>
          </section>
          <section className="w-full space-y-12">
            <div className="space-y-4 text-center">
                <h2 className="text-3xl md:text-4xl font-bold">Find Your Next Opportunity</h2>
                <p className="text-muted-foreground max-w-xl mx-auto">Use the filters below to narrow down the job listings and find the perfect role for you.</p>
            </div>
            <JobSearchForm onSearch={handleSearch} isSearching={isSearching} onClear={handleClearSearch} hasActiveSearch={hasActiveSearch} onSaveSearch={handleOpenSaveSearchDialog} />
            {renderJobContent()}
          </section>
        </div>
      </div>
      <footer className="text-center py-8 px-4 space-y-4 text-sm text-slate-500 dark:text-slate-400">
        <Button
          onClick={handleFetchNow}
          disabled={isFetching}
          variant="outline"
          size="sm"
          className="bg-card/50 hover:bg-card/90">
          <Zap className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          {isFetching ? "Fetching..." : "Fetch Latest Jobs"}
        </Button>
        <div className="flex items-center justify-center gap-2">
            <p>Built with ❤️ at Cloudflare</p>
            <Separator orientation="vertical" className="h-4" />
            <p>Created by Syam</p>
        </div>
      </footer>
      <JobDetailModal isOpen={isModalOpen} onClose={handleCloseModal} job={selectedJob} />
      <SaveSearchDialog isOpen={isSaveSearchDialogOpen} onClose={() => setIsSaveSearchDialogOpen(false)} searchFilters={searchToSave} />
    </>
  );
}