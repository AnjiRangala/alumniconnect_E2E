import React, { useState, useRef, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';

export default function ImageCropModal({ imageSrc, onCropComplete, onCancel }) {
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      drawCanvas();
    };
    img.src = imageSrc;
  }, [imageSrc]);

  useEffect(() => {
    drawCanvas();
  }, [zoom, rotation, offsetX, offsetY]);

  const renderImageCanvas = (targetCanvas) => {
    if (!targetCanvas || !imageRef.current) return;

    const ctx = targetCanvas.getContext('2d');
    const size = 400;

    targetCanvas.width = size;
    targetCanvas.height = size;

    // Clear canvas
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, size, size);

    // Save context state
    ctx.save();

    // Translate to center
    ctx.translate(size / 2, size / 2);

    // Apply rotation
    ctx.rotate((rotation * Math.PI) / 180);

    // Apply zoom and offset
    const img = imageRef.current;
    const scaledWidth = img.width * zoom;
    const scaledHeight = img.height * zoom;

    ctx.drawImage(
      img,
      -scaledWidth / 2 + offsetX,
      -scaledHeight / 2 + offsetY,
      scaledWidth,
      scaledHeight
    );

    // Restore context
    ctx.restore();
  };

  const drawCanvas = () => {
    if (!canvasRef.current || !imageRef.current) return;

    renderImageCanvas(canvasRef.current);

    const ctx = canvasRef.current.getContext('2d');
    const size = canvasRef.current.width;

    // Draw circular guide (preview only)
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, (size / 2) * 0.9, 0, Math.PI * 2);
    ctx.stroke();
  };

  const handleCanvasMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offsetX, y: e.clientY - offsetY });
  };

  const handleCanvasMouseMove = (e) => {
    if (!isDragging) return;
    setOffsetX(e.clientX - dragStart.x);
    setOffsetY(e.clientY - dragStart.y);
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
  };

  const handleCrop = async () => {
    if (!canvasRef.current) return;
    setIsProcessing(true);

    try {
      const outputCanvas = document.createElement('canvas');
      renderImageCanvas(outputCanvas);

      const size = outputCanvas.width;
      const circleCanvas = document.createElement('canvas');
      circleCanvas.width = size;
      circleCanvas.height = size;
      const circleCtx = circleCanvas.getContext('2d');

      circleCtx.beginPath();
      circleCtx.arc(size / 2, size / 2, (size / 2) * 0.9, 0, Math.PI * 2);
      circleCtx.clip();

      circleCtx.drawImage(outputCanvas, 0, 0);

      const croppedImage = circleCanvas.toDataURL('image/jpeg', 0.95);
      onCropComplete(croppedImage);
    } catch (err) {
      console.error('Error cropping image:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-800">Crop Your Photo</h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Canvas - Main cropping area */}
        <div className="p-6 bg-gray-50 flex flex-col items-center">
          <canvas
            ref={canvasRef}
            className="border-2 border-gray-300 rounded-lg cursor-grab active:cursor-grabbing bg-white"
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
            style={{ maxWidth: '100%', height: 'auto' }}
          />
          <p className="text-xs text-gray-500 mt-3">Drag to reposition • Circle shows final crop</p>
        </div>

        {/* Controls */}
        <div className="border-t p-4 bg-gray-50 space-y-4">
          {/* Zoom Control */}
          <div className="flex items-center gap-3">
            <ZoomOut size={18} className="text-gray-600" />
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.1"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1 h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <ZoomIn size={18} className="text-gray-600" />
            <span className="text-sm text-gray-600 w-10 text-right">{(zoom * 100).toFixed(0)}%</span>
          </div>

          {/* Rotation Control */}
          <div className="flex items-center gap-3">
            <RotateCw size={18} className="text-gray-600" />
            <input
              type="range"
              min="0"
              max="360"
              step="1"
              value={rotation}
              onChange={(e) => setRotation(parseFloat(e.target.value))}
              className="flex-1 h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <span className="text-sm text-gray-600 w-10 text-right">{rotation}°</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-6 border-t bg-white">
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleCrop}
            disabled={isProcessing}
            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 font-semibold transition flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              '✓ Crop & Upload'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
