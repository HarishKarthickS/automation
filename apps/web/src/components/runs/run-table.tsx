import type { RunDTO } from "@automation/shared";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const variantByStatus: Record<RunDTO["status"], "success" | "warning" | "destructive"> = {
  queued: "warning",
  running: "warning",
  succeeded: "success",
  failed: "destructive",
  timed_out: "destructive",
  killed: "destructive"
};

interface RunTableProps {
  runs: RunDTO[];
  onViewLog: (run: RunDTO) => void;
}

export function RunTable({ runs, onViewLog }: RunTableProps) {
  if (runs.length === 0) {
    return <p className="text-sm text-muted-foreground">No runs yet.</p>;
  }

  return (
    <div className="rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Status</TableHead>
            <TableHead>Started</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Attempt</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {runs.map((run) => (
            <TableRow key={run.id}>
              <TableCell>
                <Badge variant={variantByStatus[run.status]}>{run.status}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">{new Date(run.startedAt).toLocaleString()}</TableCell>
              <TableCell className="text-muted-foreground">
                {typeof run.durationMs === "number" ? `${run.durationMs} ms` : "-"}
              </TableCell>
              <TableCell className="text-muted-foreground">{run.attempt}</TableCell>
              <TableCell>
                <Button variant="ghost" size="sm" onClick={() => onViewLog(run)}>
                  View logs
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
