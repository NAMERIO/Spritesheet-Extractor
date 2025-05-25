import React, { useCallback, useState } from 'react';
import { UploadIcon } from 'lucide-react';

interface FileUploaderProps {
  onImageUpload: (image: HTMLImageElement) => void;
}

export function FileUploader({ onImageUpload }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const handleFileUpload = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file.');
      return;
    }
    
    setIsLoading(true);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        onImageUpload(img);
        setIsLoading(false);
      };
      img.onerror = () => {
        alert('Failed to load the image. Please try a different file.');
        setIsLoading(false);
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      alert('Failed to read the file. Please try again.');
      setIsLoading(false);
    };
    reader.readAsDataURL(file);
  }, [onImageUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  }, [handleFileUpload]);

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors
        ${isDragging 
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
          : 'border-gray-300 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500'}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-blue-600 dark:text-blue-400">
          <UploadIcon size={28} />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Upload Spritesheet</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Drag and drop your spritesheet image here, or click to browse
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            Supports PNG, JPG, GIF, WEBP
          </p>
        </div>
        
        <label className="relative">
          <input
            type="file"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            accept="image/*"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleFileUpload(e.target.files[0]);
              }
            }}
          />
          <button
            type="button"
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : 'Select Image'}
          </button>
        </label>
      </div>
    </div>
  );
}