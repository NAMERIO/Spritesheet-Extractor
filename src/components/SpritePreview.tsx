import React, { useCallback, useState, useRef, useEffect } from 'react';
import { Sprite } from './SpritesheetExtractor';
import { DownloadIcon, ZoomInIcon, ZoomOutIcon, Edit2Icon, SaveIcon, Eraser, XIcon, PencilIcon, CropIcon, UndoIcon, RedoIcon, PlusIcon } from 'lucide-react';
import JSZip from 'jszip';

interface SpritePreviewProps {
  sprites: Sprite[];
  originalImage: HTMLImageElement | null;
  onAddSprite: (sprite: Sprite) => void;
}

export function SpritePreview({ sprites, originalImage, onAddSprite }: SpritePreviewProps) {
  const [selectedSprite, setSelectedSprite] = useState<Sprite | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isEditing, setIsEditing] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [spriteNames, setSpriteNames] = useState<Record<string, string>>({});
  const [editingName, setEditingName] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isErasing, setIsErasing] = useState(false);
  const [eraserSize, setEraserSize] = useState(20);
  const [cropBounds, setCropBounds] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [undoStack, setUndoStack] = useState<ImageData[]>([]);
  const [redoStack, setRedoStack] = useState<ImageData[]>([]);
  const lastPoint = useRef<{ x: number, y: number } | null>(null);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragCorner, setDragCorner] = useState<'tl' | 'tr' | 'bl' | 'br' | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  
  useEffect(() => {
    if (selectedSprite && canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = selectedSprite.bounds.width;
      canvas.height = selectedSprite.bounds.height;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        contextRef.current = ctx;
        ctx.drawImage(selectedSprite.canvas, 0, 0);
        setUndoStack([ctx.getImageData(0, 0, canvas.width, canvas.height)]);
        setRedoStack([]);
      }
    }
  }, [selectedSprite]);

  useEffect(() => {
    if (isCropping && selectedSprite) {
      setCropBounds({
        x: selectedSprite.bounds.x,
        y: selectedSprite.bounds.y,
        width: selectedSprite.bounds.width,
        height: selectedSprite.bounds.height
      });
    }
  }, [isCropping, selectedSprite]);

  const handleSpriteClick = useCallback((sprite: Sprite) => {
    setSelectedSprite(sprite);
    setZoomLevel(1);
    setIsEditing(false);
    setIsCropping(false);
  }, []);
  
  const saveCurrentState = useCallback(() => {
    if (!contextRef.current || !canvasRef.current) return;
    const imageData = contextRef.current.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
    setUndoStack(prev => [...prev, imageData]);
    setRedoStack([]);
  }, []);

  const undo = useCallback(() => {
    if (undoStack.length <= 1 || !contextRef.current || !canvasRef.current) return;
    
    const currentState = contextRef.current.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
    setRedoStack(prev => [...prev, currentState]);
    
    const previousState = undoStack[undoStack.length - 2];
    contextRef.current.putImageData(previousState, 0, 0);
    setUndoStack(prev => prev.slice(0, -1));
  }, [undoStack]);

  const redo = useCallback(() => {
    if (redoStack.length === 0 || !contextRef.current) return;
    
    const nextState = redoStack[redoStack.length - 1];
    contextRef.current.putImageData(nextState, 0, 0);
    
    setRedoStack(prev => prev.slice(0, -1));
    setUndoStack(prev => [...prev, nextState]);
  }, [redoStack]);
  
  const startErasing = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isEditing || !contextRef.current) return;
    
    setIsErasing(true);
    const ctx = contextRef.current;
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoomLevel;
    const y = (e.clientY - rect.top) / zoomLevel;
    
    lastPoint.current = { x, y };
    
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, eraserSize / 2, 0, Math.PI * 2);
    ctx.fill();
  }, [isEditing, zoomLevel, eraserSize]);
  
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCursorPosition({ x, y });

    if (isErasing && contextRef.current && lastPoint.current && canvasRef.current) {
      const canvasRect = canvasRef.current.getBoundingClientRect();
      const newX = (e.clientX - canvasRect.left) / zoomLevel;
      const newY = (e.clientY - canvasRect.top) / zoomLevel;
      
      const ctx = contextRef.current;
      ctx.beginPath();
      ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
      ctx.lineTo(newX, newY);
      ctx.lineWidth = eraserSize;
      ctx.lineCap = 'round';
      ctx.stroke();
      
      lastPoint.current = { x: newX, y: newY };
    }
  }, [isErasing, zoomLevel, eraserSize]);
  
  const stopErasing = useCallback(() => {
    if (isErasing) {
      saveCurrentState();
      setIsErasing(false);
    }
    lastPoint.current = null;
    if (contextRef.current) {
      contextRef.current.globalCompositeOperation = 'source-over';
    }
  }, [isErasing, saveCurrentState]);

  const handleCropMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isCropping || !originalImage) return;
    
    const rect = imageRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const scaleX = originalImage.width / rect.width;
    const scaleY = originalImage.height / rect.height;
    const corners = [
      { x: cropBounds.x / scaleX, y: cropBounds.y / scaleY, corner: 'tl' },
      { x: (cropBounds.x + cropBounds.width) / scaleX, y: cropBounds.y / scaleY, corner: 'tr' },
      { x: cropBounds.x / scaleX, y: (cropBounds.y + cropBounds.height) / scaleY, corner: 'bl' },
      { x: (cropBounds.x + cropBounds.width) / scaleX, y: (cropBounds.y + cropBounds.height) / scaleY, corner: 'br' }
    ];
    
    for (const { x: cornerX, y: cornerY, corner } of corners) {
      if (Math.abs(x - cornerX) < 10 && Math.abs(y - cornerY) < 10) {
        setDragCorner(corner as 'tl' | 'tr' | 'bl' | 'br');
        setIsDragging(true);
        setDragStart({ x, y });
        return;
      }
    }
    
    setDragCorner(null);
    setIsDragging(true);
    setDragStart({ x, y });
  }, [isCropping, cropBounds, originalImage]);

  const handleCropMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !isCropping || !originalImage || !imageRef.current) return;
    
    const rect = imageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const dx = x - dragStart.x;
    const dy = y - dragStart.y;
    const scaleX = originalImage.width / rect.width;
    const scaleY = originalImage.height / rect.height;
    
    if (dragCorner) {
      let newBounds = { ...cropBounds };
      const scaledDX = dx * scaleX;
      const scaledDY = dy * scaleY;
      
      switch (dragCorner) {
        case 'tl':
          newBounds.x += scaledDX;
          newBounds.y += scaledDY;
          newBounds.width -= scaledDX;
          newBounds.height -= scaledDY;
          break;
        case 'tr':
          newBounds.width += scaledDX;
          newBounds.y += scaledDY;
          newBounds.height -= scaledDY;
          break;
        case 'bl':
          newBounds.x += scaledDX;
          newBounds.width -= scaledDX;
          newBounds.height += scaledDY;
          break;
        case 'br':
          newBounds.width += scaledDX;
          newBounds.height += scaledDY;
          break;
      }
      if (newBounds.width >= 10 && newBounds.height >= 10 &&
          newBounds.x >= 0 && newBounds.y >= 0 &&
          newBounds.x + newBounds.width <= originalImage.width &&
          newBounds.y + newBounds.height <= originalImage.height) {
        setCropBounds(newBounds);
      }
    } else {
      const newX = cropBounds.x + (dx * scaleX);
      const newY = cropBounds.y + (dy * scaleY);
      
      if (newX >= 0 && newY >= 0 &&
          newX + cropBounds.width <= originalImage.width &&
          newY + cropBounds.height <= originalImage.height) {
        setCropBounds(prev => ({
          ...prev,
          x: newX,
          y: newY
        }));
      }
    }
    
    setDragStart({ x, y });
  }, [isDragging, isCropping, dragCorner, dragStart, cropBounds, originalImage]);

  const handleCropMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragCorner(null);
  }, []);
  
  const saveEdits = useCallback(() => {
    if (!selectedSprite || !originalImage) return;
    
    if (isCropping) {
      const croppedCanvas = document.createElement('canvas');
      croppedCanvas.width = cropBounds.width;
      croppedCanvas.height = cropBounds.height;
      const ctx = croppedCanvas.getContext('2d');
      
      if (ctx) {
        ctx.drawImage(
          originalImage,
          Math.round(cropBounds.x),
          Math.round(cropBounds.y),
          Math.round(cropBounds.width),
          Math.round(cropBounds.height),
          0,
          0,
          cropBounds.width,
          cropBounds.height
        );
        
        const newSprite: Sprite = {
          id: crypto.randomUUID(),
          imageData: ctx.getImageData(0, 0, cropBounds.width, cropBounds.height),
          canvas: croppedCanvas,
          bounds: {
            x: Math.round(cropBounds.x),
            y: Math.round(cropBounds.y),
            width: Math.round(cropBounds.width),
            height: Math.round(cropBounds.height)
          }
        };
        
        onAddSprite(newSprite);
      }
    } else if (canvasRef.current) {
      selectedSprite.canvas = canvasRef.current;
    }
    
    setIsEditing(false);
    setIsCropping(false);
    setSelectedSprite(null);
  }, [selectedSprite, isCropping, cropBounds, originalImage, onAddSprite]);
  
  const downloadSprite = useCallback((sprite: Sprite, index: number) => {
    const name = spriteNames[sprite.id] || `sprite_${index}`;
    const link = document.createElement('a');
    link.download = `${name}.png`;
    link.href = sprite.canvas.toDataURL('image/png');
    link.click();
  }, [spriteNames]);

  const zoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(prev + 0.5, 4));
  }, []);

  const zoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(prev - 0.5, 0.5));
  }, []);

  const handleAddNewSprite = useCallback(() => {
    if (!originalImage) return;
    
    const newSprite: Sprite = {
      id: crypto.randomUUID(),
      imageData: new ImageData(1, 1),
      canvas: document.createElement('canvas'),
      bounds: { x: 0, y: 0, width: 100, height: 100 }
    };
    
    setSelectedSprite(newSprite);
    setIsCropping(true);
    setCropBounds({ x: 0, y: 0, width: 100, height: 100 });
  }, [originalImage]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {sprites.map((sprite, index) => (
        <div
          key={sprite.id}
          className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-2 relative group transition-all hover:shadow-md"
        >
          <div className="aspect-square flex items-center justify-center bg-[url('/checkerboard.png')] bg-repeat">
            <img
              src={sprite.canvas.toDataURL()}
              alt={`Sprite ${index}`}
              className="max-w-full max-h-full object-contain cursor-pointer"
              onClick={() => handleSpriteClick(sprite)}
            />
          </div>
          <div className="mt-2 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {editingName === sprite.id ? (
                  <input
                    type="text"
                    value={spriteNames[sprite.id] || `sprite_${index}`}
                    onChange={(e) => setSpriteNames(prev => ({ ...prev, [sprite.id]: e.target.value }))}
                    onBlur={() => setEditingName(null)}
                    autoFocus
                    className="w-24 px-1 py-0.5 text-xs border rounded"
                  />
                ) : (
                  <span>{sprite.bounds.width}×{sprite.bounds.height}px</span>
                )}
              </span>
              {editingName !== sprite.id && (
                <button
                  onClick={() => setEditingName(sprite.id)}
                  className="p-1 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-md"
                >
                  <PencilIcon size={12} />
                </button>
              )}
            </div>
            <button
              onClick={() => downloadSprite(sprite, index)}
              className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-md"
              aria-label={`Download sprite ${index}`}
            >
              <DownloadIcon size={14} />
            </button>
          </div>
        </div>
      ))}
      {originalImage && (
        <div
          className="bg-gray-50 dark:bg-gray-900 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-2 cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
          onClick={handleAddNewSprite}
        >
          <div className="aspect-square flex flex-col items-center justify-center gap-2">
            <PlusIcon className="w-8 h-8 text-gray-400 dark:text-gray-600" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Add Sprite</span>
          </div>
        </div>
      )}

      {selectedSprite && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedSprite(null)}>
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-gray-200 dark:border-gray-700 p-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold">Sprite Details</h3>
              <div className="flex items-center gap-2">
                {isEditing && (
                  <>
                    <div className="flex items-center gap-2 mr-4">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Eraser Size:</span>
                      <input
                        type="range"
                        min="2"
                        max="50"
                        value={eraserSize}
                        onChange={(e) => setEraserSize(parseInt(e.target.value))}
                        className="w-24"
                      />
                    </div>
                    <button
                      onClick={undo}
                      disabled={undoStack.length <= 1}
                      className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-md disabled:opacity-50"
                      title="Undo"
                    >
                      <UndoIcon size={18} />
                    </button>
                    <button
                      onClick={redo}
                      disabled={redoStack.length === 0}
                      className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-md disabled:opacity-50"
                      title="Redo"
                    >
                      <RedoIcon size={18} />
                    </button>
                  </>
                )}
                {!isEditing && !isCropping && (
                  <>
                    <button
                      onClick={zoomOut}
                      className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-md"
                      disabled={zoomLevel <= 0.5}
                      aria-label="Zoom out"
                    >
                      <ZoomOutIcon size={18} />
                    </button>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {Math.round(zoomLevel * 100)}%
                    </span>
                    <button
                      onClick={zoomIn}
                      className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-md"
                      disabled={zoomLevel >= 4}
                      aria-label="Zoom in"
                    >
                      <ZoomInIcon size={18} />
                    </button>
                  </>
                )}
                {(isEditing || isCropping) && (
                  <button
                    onClick={saveEdits}
                    className="p-1.5 text-green-600 hover:text-green-700 transition-colors rounded-md flex items-center gap-1"
                  >
                    <SaveIcon size={18} />
                    Save
                  </button>
                )}
                <button
                  onClick={() => setSelectedSprite(null)}
                  className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-red-600 transition-colors rounded-md"
                >
                  <XIcon size={18} />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-auto max-h-[calc(90vh-8rem)]">
              <div className="flex flex-col gap-4">
                <div 
                  ref={containerRef}
                  className="bg-[url('/checkerboard.png')] bg-repeat flex items-center justify-center p-4 rounded-lg relative"
                  onMouseDown={handleCropMouseDown}
                  onMouseMove={handleCropMouseMove}
                  onMouseUp={handleCropMouseUp}
                  onMouseLeave={handleCropMouseUp}
                >
                  {!isCropping && (
                    <>
                      <canvas
                        ref={canvasRef}
                        style={{ 
                          transform: `scale(${zoomLevel})`,
                          transformOrigin: 'center',
                          cursor: isEditing ? 'none' : 'default'
                        }}
                        className="transition-transform relative"
                        onMouseDown={startErasing}
                        onMouseMove={handleMouseMove}
                        onMouseUp={stopErasing}
                        onMouseLeave={stopErasing}
                      />
                      {isEditing && (
                        <div 
                          className="absolute pointer-events-none border-2 border-white/80 rounded-full bg-white/30 z-10"
                          style={{
                            width: `${eraserSize}px`,
                            height: `${eraserSize}px`,
                            left: `${cursorPosition.x - eraserSize/2}px`,
                            top: `${cursorPosition.y - eraserSize/2}px`,
                            boxShadow: '0 0 0 1px rgba(0,0,0,0.3)'
                          }}
                        />
                      )}
                    </>
                  )}
                  
                  {isCropping && originalImage && (
                    <div className="relative">
                      <img
                        ref={imageRef}
                        src={originalImage.src}
                        alt="Spritesheet for cropping"
                        className="max-w-full h-auto"
                      />
                      <div
                        className="absolute border-2 border-blue-500 bg-blue-500/10"
                        style={{
                          left: `${cropBounds.x * (imageRef.current?.clientWidth || 1) / originalImage.width}px`,
                          top: `${cropBounds.y * (imageRef.current?.clientHeight || 1) / originalImage.height}px`,
                          width: `${cropBounds.width * (imageRef.current?.clientWidth || 1) / originalImage.width}px`,
                          height: `${cropBounds.height * (imageRef.current?.clientHeight || 1) / originalImage.height}px`,
                          cursor: isDragging ? 'grabbing' : 'grab'
                        }}
                      >
                        <div className="absolute -left-1 -top-1 w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-nw-resize" />
                        <div className="absolute -right-1 -top-1 w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-ne-resize" />
                        <div className="absolute -left-1 -bottom-1 w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-sw-resize" />
                        <div className="absolute -right-1 -bottom-1 w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-se-resize" />
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Dimensions
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedSprite.bounds.width} × {selectedSprite.bounds.height} pixels
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Position in Spritesheet
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      X: {selectedSprite.bounds.x}, Y: {selectedSprite.bounds.y}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="border-t border-gray-200 dark:border-gray-700 p-4 flex justify-between">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setIsEditing(!isEditing);
                    setIsCropping(false);
                  }}
                  className={`px-4 py-2 rounded-md text-sm flex items-center gap-2 ${
                    isEditing 
                      ? 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  } transition-colors`}
                >
                  {isEditing ? (
                    <>
                      <Eraser size={16} />
                      Erasing Mode
                    </>
                  ) : (
                    <>
                      <Edit2Icon size={16} />
                      Edit Sprite
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setIsCropping(!isCropping);
                    setIsEditing(false);
                  }}
                  className={`px-4 py-2 rounded-md text-sm flex items-center gap-2 ${
                    isCropping 
                      ? 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  } transition-colors`}
                >
                  <CropIcon size={16} />
                  {isCropping ? 'Cancel Crop' : 'Crop Sprite'}
                </button>
              </div>
              <button
                onClick={() => {
                  const index = sprites.findIndex(s => s.id === selectedSprite.id);
                  downloadSprite(selectedSprite, index);
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm flex items-center gap-2"
              >
                <DownloadIcon size={16} />
                Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}