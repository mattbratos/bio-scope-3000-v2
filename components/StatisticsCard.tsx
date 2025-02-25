"use client";

import { Card } from "@/components/ui/card";
import type { FrameData } from "@/types";

interface StatisticsCardProps {
  currentFrame: FrameData | null;
}

type ObjectCount = Record<string, number>;

export function StatisticsCard({ currentFrame }: StatisticsCardProps) {
  if (!currentFrame) {
    return (
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">Statistics</h3>
        <p className="text-center text-muted-foreground">No frame selected</p>
      </Card>
    );
  }

  // Count objects by label
  const objectCounts = currentFrame.segmentation.masks.reduce(
    (acc: ObjectCount, mask) => {
      acc[mask.label] = (acc[mask.label] || 0) + 1;
      return acc;
    },
    {},
  );

  // Calculate total objects
  const totalObjects = Object.values(objectCounts).reduce(
    (sum, count) => sum + count,
    0,
  );

  // Calculate average confidence
  const averageConfidence = currentFrame.segmentation.masks.length
    ? (
        currentFrame.segmentation.masks.reduce(
          (sum, mask) => sum + mask.confidence,
          0,
        ) / currentFrame.segmentation.masks.length
      ).toFixed(2)
    : 0;

  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-4">Statistics</h3>
      <div className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">Total Objects</p>
          <p className="text-2xl font-bold">{totalObjects}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Average Confidence</p>
          <p className="text-2xl font-bold">{averageConfidence}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground mb-2">Objects by Type</p>
          <ul className="space-y-1">
            {Object.entries(objectCounts).map(([label, count]) => (
              <li
                key={label}
                className="flex justify-between items-center text-sm"
              >
                <span>{label}</span>
                <span className="font-medium">{count}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}
