import { useState } from "react";
import "./App.css";

// Placeholder components - these will be implemented in separate files later
const VideoUploader = ({ onVideoUpload }: { onVideoUpload: () => void }) => {
  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // In a real implementation, we would process the video file here
      console.log("Video file selected:", file.name);
      onVideoUpload();
    }
  };

  return (
    <div className="video-uploader">
      <h3>Upload Video</h3>
      <div className="upload-area">
        <input
          type="file"
          accept="video/*"
          className="file-input"
          onChange={handleUpload}
        />
        <div className="upload-placeholder">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          <p>Drag & drop your video or click to browse</p>
        </div>
      </div>
    </div>
  );
};

const CanvasEditor = () => {
  return (
    <div className="canvas-editor">
      <div className="canvas-container">
        {/* Canvas layers will be added here */}
        <div className="canvas-placeholder">
          <p>Canvas Editor</p>
          <p className="placeholder-text">
            Video preview and segmentation will appear here
          </p>
        </div>
      </div>
    </div>
  );
};

const Timeline = () => {
  return (
    <div className="timeline">
      <div className="filmroll">
        {/* Thumbnails will be generated here */}
        <div className="thumbnail-placeholder"></div>
        <div className="thumbnail-placeholder"></div>
        <div className="thumbnail-placeholder"></div>
      </div>
      <div className="timeline-controls">
        <button className="control-button">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="19 20 9 12 19 4 19 20"></polygon>
            <line x1="5" y1="19" x2="5" y2="5"></line>
          </svg>
        </button>
        <button className="control-button">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="5 4 15 12 5 20 5 4"></polygon>
          </svg>
        </button>
        <div className="timeline-slider">
          <input type="range" min="0" max="100" defaultValue="0" />
        </div>
        <div className="timestamp">00:00:00</div>
      </div>
    </div>
  );
};

const ToolPanel = () => {
  return (
    <div className="tool-panel">
      <h3>Tools</h3>
      <div className="tool-buttons">
        <button className="tool-button">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
            <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
            <path d="M2 2l7.586 7.586"></path>
            <circle cx="11" cy="11" r="2"></circle>
          </svg>
          <span>Select</span>
        </button>
        <button className="tool-button">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="22" y1="12" x2="18" y2="12"></line>
            <line x1="6" y1="12" x2="2" y2="12"></line>
            <line x1="12" y1="6" x2="12" y2="2"></line>
            <line x1="12" y1="22" x2="12" y2="18"></line>
          </svg>
          <span>Add Point</span>
        </button>
        <button className="tool-button">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 3l18 18"></path>
          </svg>
          <span>Erase</span>
        </button>
      </div>
      <div className="segmentation-controls">
        <h4>Segmentation</h4>
        <button className="action-button">Run AI Segmentation</button>
        <div className="confidence-slider">
          <label>Confidence Threshold</label>
          <input type="range" min="0" max="100" defaultValue="75" />
          <span>75%</span>
        </div>
      </div>
      <div className="export-controls">
        <h4>Export</h4>
        <button className="action-button">Export Results</button>
      </div>
    </div>
  );
};

function App() {
  const [processingState, setProcessingState] = useState<
    "idle" | "processing" | "ready"
  >("idle");

  const handleVideoUpload = () => {
    setProcessingState("processing");

    // Simulate video processing
    setTimeout(() => {
      setProcessingState("ready");
    }, 3000);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Smart Nature Observer</h1>
        <div className="app-status">
          {processingState === "processing" && (
            <span className="processing-badge">Processing...</span>
          )}
        </div>
      </header>

      <main className="app-main">
        {processingState === "idle" ? (
          <div className="upload-container">
            <VideoUploader onVideoUpload={handleVideoUpload} />
          </div>
        ) : (
          <div className="editor-container">
            <div className="editor-main">
              <CanvasEditor />
              <ToolPanel />
            </div>
            <Timeline />
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>Smart Nature Observer - AI-Powered Video Analysis</p>
      </footer>
    </div>
  );
}

export default App;
