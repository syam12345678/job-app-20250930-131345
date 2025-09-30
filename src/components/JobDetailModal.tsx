import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Job } from "@shared/types";
import { Briefcase, MapPin, ArrowUpRight, Code, Calendar } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
interface JobDetailModalProps {
  job: Job | null;
  isOpen: boolean;
  onClose: () => void;
}
export function JobDetailModal({ job, isOpen, onClose }: JobDetailModalProps) {
  if (!job) {
    return null;
  }
  const timeAgo = formatDistanceToNow(new Date(job.postedDate), { addSuffix: true });
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{job.title}</DialogTitle>
          <DialogDescription asChild>
            <div className="pt-2 space-y-2">
              <p className="flex items-center text-sm text-muted-foreground">
                <Briefcase className="h-4 w-4 mr-2 flex-shrink-0" />
                <span>{job.company}</span>
              </p>
              <p className="flex items-center text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                <span>{job.location}</span>
              </p>
              <p className="flex items-center text-sm text-muted-foreground">
                <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
                <span>Posted {timeAgo}</span>
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[50vh] pr-4">
          <div className="space-y-6 py-4">
            {job.jobType && (
              <div>
                <h3 className="font-semibold mb-2">Job Type</h3>
                <Badge variant="outline">{job.jobType}</Badge>
              </div>
            )}
            {job.description && (
              <div>
                <h3 className="font-semibold mb-2">Job Description</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{job.description}</p>
              </div>
            )}
            {job.skills && job.skills.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2 flex items-center">
                  <Code className="h-4 w-4 mr-2" />
                  Skills
                </h3>
                <div className="flex flex-wrap gap-2">
                  {job.skills.map((skill) => (
                    <Badge key={skill} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button
            asChild
            className="w-full bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            <a href={job.url} target="_blank" rel="noopener noreferrer">
              Apply Now
              <ArrowUpRight className="h-4 w-4 ml-2" />
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}