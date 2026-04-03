'use client';

import { useState } from 'react';
import { ZoomIn, ZoomOut, RotateCw, Download, Maximize2 } from 'lucide-react';

interface DocumentViewerProps {
  url: string;
  type: 'pdf' | 'image';
}

export function DocumentViewer({ url, type }: DocumentViewerProps) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const zoomIn = () => setScale(s => Math.min(s + 0.25, 3));
  const zoomOut = () => setScale(s => Math.max(s - 0.25, 0.5));
  const rotate = () => setRotation(r => (r + 90) % 360);

  if (type === 'pdf') {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-[#2a1f1a]/50">PDF Document</span>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#2D5A3D]/10 text-[#2D5A3D] text-sm font-medium hover:bg-[#2D5A3D]/20 transition-colors"
          >
            <Download className="w-4 h-4" />
            Open PDF
          </a>
        </div>
        <iframe
          src={`${url}#view=FitH`}
          className="w-full h-[600px] rounded-xl border border-[#2a1f1a]/10"
          title="Death Certificate PDF"
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={zoomOut}
            disabled={scale <= 0.5}
            className="p-2 rounded-lg hover:bg-white/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4 text-[#2a1f1a]/60" />
          </button>
          <span className="text-sm text-[#2a1f1a]/50 min-w-[4rem] text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={zoomIn}
            disabled={scale >= 3}
            className="p-2 rounded-lg hover:bg-white/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4 text-[#2a1f1a]/60" />
          </button>
          <button
            onClick={rotate}
            className="p-2 rounded-lg hover:bg-white/50 transition-colors"
            title="Rotate"
          >
            <RotateCw className="w-4 h-4 text-[#2a1f1a]/60" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-lg hover:bg-white/50 transition-colors"
            title="Fullscreen"
          >
            <Maximize2 className="w-4 h-4 text-[#2a1f1a]/60" />
          </button>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg hover:bg-white/50 transition-colors"
            title="Download"
          >
            <Download className="w-4 h-4 text-[#2a1f1a]/60" />
          </a>
        </div>
      </div>

      {/* Image Viewer */}
      <div 
        className={`overflow-auto rounded-xl border border-[#2a1f1a]/10 bg-gray-100 ${
          isFullscreen ? 'fixed inset-4 z-50' : 'max-h-[600px]'
        }`}
      >
        {isFullscreen && (
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-4 right-4 z-10 p-2 rounded-lg bg-white/80 hover:bg-white transition-colors"
          >
            <span className="sr-only">Close</span>
            ✕
          </button>
        )}
        <div className="flex items-center justify-center min-h-[400px] p-4">
          <img
            src={url}
            alt="Death Certificate"
            className="max-w-full transition-transform duration-200"
            style={{
              transform: `scale(${scale}) rotate(${rotation}deg)`,
              transformOrigin: 'center center',
            }}
          />
        </div>
      </div>
    </div>
  );
}
