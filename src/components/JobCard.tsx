import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Briefcase, MapPin, ArrowUpRight, Eye } from "lucide-react";
import type { Job } from "@shared/types";
import { formatDistanceToNow } from 'date-fns';
interface JobCardProps {
  job: Job;
  onViewDetails: (job: Job) => void;
}
export function JobCard({ job, onViewDetails }: JobCardProps) {
  const timeAgo = formatDistanceToNow(new Date(job.postedDate), { addSuffix: true });
  return (
    <Card className="flex flex-col h-full bg-card/50 hover:bg-card/90 border-border/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
      <CardHeader>
        <CardTitle className="text-lg font-bold text-foreground leading-tight">{job.title}</CardTitle>
        <div className="flex items-center pt-2 text-sm text-muted-foreground">
          <Briefcase className="h-4 w-4 mr-2" />
          <span>{job.company}</span>
        </div>
        <div className="flex items-center text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 mr-2" />
          <span>{job.location}</span>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="flex flex-wrap gap-2">
          {job.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="font-medium">
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between items-center pt-4 gap-2">
        <p className="text-xs text-muted-foreground flex-shrink-0">{timeAgo}</p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetails(job)}
            className="bg-background/50"
          >
            <Eye className="h-4 w-4 mr-2" />
            Details
          </Button>
          <Button
            asChild
            size="sm"
            className="bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            <a href={job.url} target="_blank" rel="noopener noreferrer">
              Apply
              <ArrowUpRight className="h-4 w-4 ml-1" />
            </a>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}