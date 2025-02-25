"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Mask } from "@/types"
import { TreesIcon as Tree, Rabbit } from "lucide-react"

interface StatisticsCardProps {
  masks: Mask[]
}

interface ObjectCount {
  [key: string]: number
}

export function StatisticsCard({ masks }: StatisticsCardProps) {
  // Count objects by label
  const objectCounts = masks.reduce((acc: ObjectCount, mask) => {
    acc[mask.label] = (acc[mask.label] || 0) + 1
    return acc
  }, {})

  // Separate static and dynamic objects
  const staticObjects = masks
    .filter((mask) => mask.category === "static")
    .reduce((acc: ObjectCount, mask) => {
      acc[mask.label] = (acc[mask.label] || 0) + 1
      return acc
    }, {})

  const dynamicObjects = masks
    .filter((mask) => mask.category === "dynamic")
    .reduce((acc: ObjectCount, mask) => {
      acc[mask.label] = (acc[mask.label] || 0) + 1
      return acc
    }, {})

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="flex gap-2">
            <Tree className="h-5 w-5" />
            <Rabbit className="h-5 w-5" />
          </div>
          Detected Objects
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div>
          <h4 className="text-sm font-semibold text-muted-foreground mb-2">Static Objects</h4>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(staticObjects).map(([label, count]) => (
              <div key={label} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <span className="text-sm font-medium">{label}</span>
                <span className="text-sm text-muted-foreground">{count}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-muted-foreground mb-2">Dynamic Objects</h4>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(dynamicObjects).map(([label, count]) => (
              <div key={label} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <span className="text-sm font-medium">{label}</span>
                <span className="text-sm text-muted-foreground">{count}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-between items-center pt-2 border-t">
          <span className="text-sm font-medium">Total Objects</span>
          <span className="text-sm text-muted-foreground">{masks.length}</span>
        </div>
      </CardContent>
    </Card>
  )
}

