import React, { useState, useEffect } from 'react';

interface DetectionSettingsProps {
  settings: {
    threshold: number;
    minSize: number;
    padding: number;
  };
  onSettingsChange: (newSettings: { threshold: number; minSize: number; padding: number }) => void;
  onApplySettings: () => void;
  isProcessing: boolean;
}

export function DetectionSettings({ settings, onSettingsChange, onApplySettings, isProcessing }: DetectionSettingsProps) {
  const [localSettings, setLocalSettings] = useState(settings);
  const [hasChanges, setHasChanges] = useState(false);
  useEffect(() => {
    setLocalSettings(settings);
    setHasChanges(false);
  }, [settings]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = parseInt(value, 10);
    
    setLocalSettings(prev => ({
      ...prev,
      [name]: numValue
    }));
    setHasChanges(true);
  };
  
  const handleApply = () => {
    onSettingsChange(localSettings);
    onApplySettings();
    setHasChanges(false);
  };
  
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Threshold: {localSettings.threshold}
        </label>
        <input
          type="range"
          name="threshold"
          min="0"
          max="255"
          value={localSettings.threshold}
          onChange={handleChange}
          disabled={isProcessing}
          className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Determines how pixels are classified as sprite vs background
        </p>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Minimum Size: {localSettings.minSize}px
        </label>
        <input
          type="range"
          name="minSize"
          min="1"
          max="100"
          value={localSettings.minSize}
          onChange={handleChange}
          disabled={isProcessing}
          className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Ignores sprites smaller than this size
        </p>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Padding: {localSettings.padding}px
        </label>
        <input
          type="range"
          name="padding"
          min="0"
          max="10"
          value={localSettings.padding}
          onChange={handleChange}
          disabled={isProcessing}
          className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Extra space around detected sprites
        </p>
      </div>
      
      <div className="pt-4 space-y-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleApply}
          className={`w-full px-4 py-2 ${
            hasChanges 
              ? 'bg-blue-600 text-white hover:bg-blue-700' 
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          } rounded-md transition-colors text-sm font-medium disabled:opacity-50`}
          disabled={isProcessing || !hasChanges}
        >
          Apply Settings
        </button>
        
        <button
          onClick={() => {
            setLocalSettings({ threshold: 128, minSize: 20, padding: 1 });
            setHasChanges(true);
          }}
          className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm"
          disabled={isProcessing}
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  );
}