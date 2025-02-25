"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, Edit2, Download } from "lucide-react"
import type { Mask } from "@/types"

interface SegmentationToolsProps {
  selectedMask: Mask | null
  onUpdateMask: (maskId: string, updates: Partial<Mask>) => void
  onDeleteMask: (maskId: string) => void
  onExport: () => void
}

export function SegmentationTools({ selectedMask, onUpdateMask, onDeleteMask, onExport }: SegmentationToolsProps) {
  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Segmentation Tools</h3>
        <Button variant="outline" size="sm" onClick={onExport}>
          <Download className="w-4 h-4 mr-2" />
          Export Results
        </Button>
      </div>

      {selectedMask ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Object Label</Label>
            <Input
              value={selectedMask.label}
              onChange={(e) => onUpdateMask(selectedMask.id, { label: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={selectedMask.category}
              onValueChange={(value) => onUpdateMask(selectedMask.id, { category: value as "static" | "dynamic" })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="static">Static (e.g., trees, mountains)</SelectItem>
                <SelectItem value="dynamic">Dynamic (e.g., animals, birds)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Confidence Score</Label>
            <Input
              type="number"
              min="0"
              max="1"
              step="0.01"
              value={selectedMask.confidence}
              onChange={(e) =>
                onUpdateMask(selectedMask.id, {
                  confidence: Number.parseFloat(e.target.value),
                })
              }
            />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="w-full" onClick={() => onUpdateMask(selectedMask.id, {})}>
              <Edit2 className="w-4 h-4 mr-2" />
              Edit Shape
            </Button>
            <Button variant="destructive" className="w-full" onClick={() => onDeleteMask(selectedMask.id)}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-center text-muted-foreground py-4">Select a mask to edit its properties</div>
      )}
    </Card>
  )
}

