# BioScope 3000 🌿🎥

A sophisticated video analysis tool for detecting and tracking wildlife and nature elements in video footage. This project was completed as a recruitment task, taking approximately 12 hours to develop with the assistance of v0, GPT-4, Claude 3.5 Sonnet, and Cursor Composer.

## Features 🚀

- **Real-time Video Processing**: Upload and process videos with smooth playback and analysis
- **Object Detection**: Utilizes TensorFlow.js and COCO-SSD model for detecting:
  - 50+ types of animals (from common pets to exotic wildlife)
  - Natural elements (trees, mountains, lakes, etc.)
- **Interactive Canvas Editor**: Draw, edit, and annotate detected objects
- **Timeline Navigation**: Frame-by-frame analysis with thumbnail previews
- **Statistics & Analytics**: Track object appearances and persistence
- **Modern UI/UX**: Built with Next.js 14 and shadcn/ui components
- **Responsive Design**: Works seamlessly across different screen sizes
- **Dark/Light Mode**: Supports system theme with smooth transitions

## Tech Stack 💻

- **Frontend Framework**: Next.js 14
- **UI Components**: shadcn/ui + Radix UI
- **Styling**: Tailwind CSS
- **ML Model**: TensorFlow.js + COCO-SSD
- **Animation**: Custom canvas-based animations
- **State Management**: React Hooks
- **Type Safety**: TypeScript

## Getting Started 🏁

1. Clone the repository:
```bash
git clone https://github.com/yourusername/bio-scope-3000.git
cd bio-scope-3000
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Development Process 🛠️

This project was developed as a recruitment task over approximately 12 hours. The development process was significantly enhanced by:

- **v0**: Used for initial code generation and boilerplate setup
- **GPT-4**: Assisted with architecture decisions and problem-solving
- **Claude 3.5 Sonnet**: Helped with code optimization and debugging
- **Cursor Composer**: Provided intelligent code completion and refactoring

## Project Structure 📁

```
bio-scope-3000/
├── app/                  # Next.js app directory
├── components/          # React components
│   ├── Canvas/         # Video canvas and editor components
│   ├── ui/             # Reusable UI components
│   └── VideoProcessor/ # Core video processing logic
├── config/             # Configuration files
├── lib/               # Utility functions and helpers
├── styles/            # Global styles
└── types/             # TypeScript type definitions
```

## Features in Detail 📋

### Video Processing
- Upload and process video files
- Automatic resolution management for optimal performance
- Frame extraction and thumbnail generation

### Object Detection
- Real-time object detection using TensorFlow.js
- Support for 50+ animal species
- Nature element detection (trees, mountains, etc.)
- Confidence scoring for detections

### Interactive Editor
- Draw and edit masks around detected objects
- Label and categorize detections
- Frame-by-frame navigation
- Timeline with thumbnail previews

### Analytics
- Track object appearances over time
- Calculate persistence of detected objects
- Export analysis results in JSON format

## License 📄

MIT

## Acknowledgments 🙏

- TensorFlow.js team for the COCO-SSD model
- shadcn for the amazing UI components
- The open-source community for various tools and libraries used in this project 