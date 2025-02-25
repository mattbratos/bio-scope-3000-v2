import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatTime } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Download } from "lucide-react";

interface DetectedObjectsCardProps {
  detections: Record<
    string,
    {
      count: number;
      confidence: number;
      timestamps: number[];
    }
  >;
  isLoading?: boolean;
  onTimestampClick?: (time: number) => void;
  onExport?: () => void;
}

export function DetectedObjectsCard({
  detections,
  isLoading = false,
  onTimestampClick,
  onExport,
}: DetectedObjectsCardProps) {
  const getTimeRange = (timestamps: number[]) => {
    if (timestamps.length === 0) return null;
    const sortedTimes = timestamps.sort((a, b) => a - b);
    return {
      start: Math.min(...sortedTimes),
      end: Math.max(...sortedTimes),
    };
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>Detected Objects</CardTitle>
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2 text-xs gap-1.5"
          onClick={onExport}
          disabled={isLoading || Object.keys(detections).length === 0}
        >
          <Download className="w-3.5 h-3.5" />
          Export Results
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center text-muted-foreground py-4">
            Loading model and processing...
          </div>
        ) : Object.keys(detections).length === 0 ? (
          <div className="text-center text-muted-foreground py-4">
            No objects detected yet
          </div>
        ) : (
          <ul className="space-y-4">
            {Object.entries(detections).map(([objectName, data]) => {
              const timeRange = getTimeRange(data.timestamps);
              if (!timeRange) return null;

              return (
                <li key={objectName} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg font-semibold capitalize">
                      {objectName}
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        {(data.confidence * 100).toFixed(1)}%
                      </span>
                      <Badge variant="secondary">{data.count}</Badge>
                    </div>
                  </div>
                  <Progress value={data.confidence * 100} className="h-2" />
                  <div
                    className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer"
                    onClick={() => onTimestampClick?.(timeRange.start)}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      {formatTime(timeRange.start)} -{" "}
                      {formatTime(timeRange.end)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
