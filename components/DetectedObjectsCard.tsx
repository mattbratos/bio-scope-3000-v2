import { Card } from "@/components/ui/card"

interface DetectedObjectsCardProps {
  detections: Record<string, number>
  isLoading?: boolean
}

export function DetectedObjectsCard({ detections, isLoading = false }: DetectedObjectsCardProps) {
  return (
    <Card className="p-4 space-y-4">
      <h3 className="text-lg font-semibold">Detected Objects</h3>
      {isLoading ? (
        <div className="text-center text-muted-foreground py-4">
          Loading model and processing...
        </div>
      ) : Object.keys(detections).length === 0 ? (
        <div className="text-center text-muted-foreground py-4">
          No objects detected yet
        </div>
      ) : (
        <ul className="space-y-2">
          {Object.entries(detections).map(([objectName, count]) => (
            <li key={objectName} className="flex justify-between items-center">
              <span className="capitalize">{objectName}</span>
              <span className="bg-primary/10 text-primary rounded-full px-3 py-1">
                {count}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
} 