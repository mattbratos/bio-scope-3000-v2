import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

interface DetectedObject {
  label: string
  confidence: number
  bbox: [number, number, number, number] // [x, y, width, height]
  category: "static" | "dynamic"
}

interface AnalyzeFrameResult {
  objects: DetectedObject[]
}

const NATURE_CATEGORIES = {
  static: ["tree", "mountain", "rock", "bush", "lake", "river", "forest"],
  dynamic: ["bear", "bird", "deer", "fox", "wolf", "rabbit", "squirrel", "insect"],
}

const NATURE_PROMPT = `Analyze this image and detect natural elements, focusing on:

Static objects (e.g., trees, mountains, rocks):
- Exact type and count
- Location and size
- Confidence level

Dynamic objects (e.g., animals, birds):
- Species identification
- Movement patterns
- Confidence level

Return a JSON object with detected objects, including:
1. Label (specific natural element)
2. Confidence score (0-1)
3. Bounding box [x, y, width, height]
4. Category ("static"/"dynamic")

Focus only on natural elements and wildlife.`

export async function analyzeFrame(imageBase64: string): Promise<AnalyzeFrameResult> {
  try {
    const { text } = await generateText({
      model: openai("gpt-4-vision"),
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: NATURE_PROMPT },
            { type: "image", image: imageBase64 },
          ],
        },
      ],
    })

    // Parse and validate the response
    const rawResult = JSON.parse(text)

    // Ensure proper categorization
    const objects = rawResult.objects.map((obj: DetectedObject) => {
      const label = obj.label.toLowerCase()
      const category = NATURE_CATEGORIES.static.some((item) => label.includes(item))
        ? "static"
        : NATURE_CATEGORIES.dynamic.some((item) => label.includes(item))
          ? "dynamic"
          : "static" // Default to static if uncertain

      return {
        ...obj,
        category,
        // Ensure confidence is a number between 0 and 1
        confidence: Math.min(Math.max(obj.confidence, 0), 1),
      }
    })

    return { objects }
  } catch (error) {
    console.error("Error analyzing frame:", error)
    throw error
  }
}

