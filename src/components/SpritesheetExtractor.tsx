import React, { useState, useRef, useCallback } from 'react';
import { ImageProcessor } from '../utils/ImageProcessor';
import { FileUploader } from './FileUploader';
import { SpritePreview } from './SpritePreview';
import { DetectionSettings } from './DetectionSettings';
import { Settings2Icon, ImageIcon, DownloadIcon } from 'lucide-react';
import JSZip from 'jszip';

export interface Sprite {
  id: string;
  imageData: ImageData;
  canvas: HTMLCanvasElement;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export function SpritesheetExtractor() {
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [sprites, setSprites] = useState<Sprite[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    threshold: 128,
    minSize: 20,
    padding: 1,
  });
  
  const imageProcessor = useRef(new ImageProcessor());
  
  const handleImageUpload = useCallback((image: HTMLImageElement) => {
    setOriginalImage(image);
    setSprites([]);
    processImage(image);
  }, []);
  
  const processImage = useCallback(async (image: HTMLImageElement) => {
    setIsProcessing(true);
    
    try {
      const extractedSprites = await imageProcessor.current.processImage(
        image,
        settings.threshold,
        settings.minSize,
        settings.padding
      );
      
      setSprites(extractedSprites);
    } catch (error) {
      console.error('Error processing image:', error);
      alert('Failed to process the image. Please try a different image or adjust settings.');
    } finally {
      setIsProcessing(false);
    }
  }, [settings]);
  
  const handleSettingsChange = useCallback((newSettings: typeof settings) => {
    setSettings(newSettings);
  }, []);
  
  const handleApplySettings = useCallback(() => {
    if (originalImage) {
      processImage(originalImage);
    }
  }, [originalImage, processImage]);

  const downloadAllAsZip = useCallback(async () => {
    const zip = new JSZip();
    
    sprites.forEach((sprite, index) => {
      const dataUrl = sprite.canvas.toDataURL('image/png');
      const data = dataUrl.split(',')[1];
      zip.file(`sprite_${index}.png`, data, { base64: true });
    });
    
    const content = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.download = 'sprites.zip';
    link.href = URL.createObjectURL(content);
    link.click();
    URL.revokeObjectURL(link.href);
  }, [sprites]);

  return (
    <div className="flex flex-col gap-8">
      <div className="grid md:grid-cols-[1fr_auto] gap-6">
        <div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden transition-all">
            <div className="border-b border-gray-200 dark:border-gray-700 p-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <ImageIcon size={20} />
                Spritesheet
              </h2>
            </div>
            
            <div className="p-6">
              {!originalImage ? (
                <FileUploader onImageUpload={handleImageUpload} />
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="relative border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900">
                    <img 
                      src={originalImage.src} 
                      alt="Original spritesheet" 
                      className="max-w-full h-auto"
                    />
                    
                    <svg className="absolute top-0 left-0 w-full h-full pointer-events-none">
                      {sprites.map((sprite) => (
                        <rect
                          key={sprite.id}
                          x={sprite.bounds.x}
                          y={sprite.bounds.y}
                          width={sprite.bounds.width}
                          height={sprite.bounds.height}
                          fill="none"
                          stroke="rgba(59, 130, 246, 0.7)"
                          strokeWidth="1"
                          strokeDasharray="4 2"
                        />
                      ))}
                    </svg>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setOriginalImage(null)}
                      
                      className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm"
                    >
                      Upload new image
                    </button>
                    <button
                      onClick={() => setShowSettings(!showSettings)}
                      className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm flex items-center gap-2"
                    >
                      <Settings2Icon size={16} />
                      {showSettings ? 'Hide settings' : 'Show settings'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {showSettings && originalImage && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden min-w-[250px]">
            <div className="border-b border-gray-200 dark:border-gray-700 p-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Settings2Icon size={20} />
                Settings
              </h2>
            </div>
            <div className="p-6">
              <DetectionSettings 
                settings={settings} 
                onSettingsChange={handleSettingsChange}
                onApplySettings={handleApplySettings}
                isProcessing={isProcessing}
              />
            </div>
          </div>
        )}
      </div>
      
      {sprites.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="border-b border-gray-200 dark:border-gray-700 p-4 flex justify-between items-center">
            <h2 className="text-xl font-semibold">Extracted Sprites ({sprites.length})</h2>
            <button
              onClick={downloadAllAsZip}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm flex items-center gap-2"
              disabled={isProcessing}
            >
              <DownloadIcon size={16} />
              Download as ZIP
            </button>
          </div>
          
          <div className="p-6">
            <SpritePreview sprites={sprites} originalImage={originalImage} />
          </div>
        </div>
      )}
    </div>
  );
}