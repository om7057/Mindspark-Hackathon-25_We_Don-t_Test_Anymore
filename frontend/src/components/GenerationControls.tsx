import React, { useState } from 'react';
import { FaCarSide } from 'react-icons/fa6';

interface GenerationControlsProps {
  onGenerate: (count: number) => void;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
  isGenerated: boolean;
  isRunning: boolean;
  generatedCount: number;
}

export const GenerationControls: React.FC<GenerationControlsProps> = ({
  onGenerate,
  onStart,
  onStop,
  onReset,
  isGenerated,
  isRunning,
  generatedCount
}) => {
  const [inputCount, setInputCount] = useState<string>('100');

  const handleGenerate = () => {
    const count = parseInt(inputCount, 10);
    if (count > 0 && count <= 720) {
      onGenerate(count);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || (parseInt(value, 10) >= 0 && parseInt(value, 10) <= 720)) {
      setInputCount(value);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-gray-200">
      <div className="flex items-center space-x-3 mb-6">
        <FaCarSide className="text-2xl text-blue-600" />
        <h2 className="text-2xl font-semibold text-gray-800 font-['Inter']">
          Smart Sequencing for Conveyor & Buffer Management
        </h2>
      </div>
      
      <div className="space-y-4">
        {/* Car Generation Section */}
        <div className="flex items-center space-x-4 flex-wrap gap-4">
          <div className="flex items-center space-x-3">
            <label htmlFor="carCount" className="text-sm font-medium text-gray-700 font-['Inter']">
              Number of Cars:
            </label>
            <input
              id="carCount"
              type="number"
              min="1"
              max="720"
              value={inputCount}
              onChange={handleInputChange}
              disabled={isGenerated && !isRunning}
              className="w-24 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 font-['Inter'] transition-all"
            />
            <span className="text-xs text-gray-500 font-['Inter']">
              (max 720)
            </span>
          </div>
          
          <button
            onClick={handleGenerate}
            disabled={isGenerated || isRunning || !inputCount || parseInt(inputCount) === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium font-['Inter']"
          >
            Generate Cars
          </button>
        </div>

        {/* Status Display */}
        {isGenerated && (
          <div className="bg-green-50 border border-green-200 rounded-md p-3">
            <div className="flex items-center space-x-2 text-green-800 text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="font-['Inter']">
                Generated {generatedCount} cars with percentage-wise random sequence
              </span>
            </div>
          </div>
        )}

        {/* Simulation Controls */}
        <div className="flex items-center space-x-3 pt-3 border-t border-gray-200">
          <button
            onClick={onStart}
            disabled={!isGenerated || isRunning}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium font-['Inter']"
          >
            Start Simulation
          </button>
          
          <button
            onClick={onStop}
            disabled={!isRunning}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium font-['Inter']"
          >
            Stop
          </button>
          
          <button
            onClick={onReset}
            disabled={isRunning}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium font-['Inter']"
          >
            Reset
          </button>
          
          {/* Status Indicator */}
          <div className="flex items-center space-x-2 ml-4">
            <div className={`w-2 h-2 rounded-full ${
              isRunning ? 'bg-green-500' : 'bg-gray-400'
            }`} />
            <span className="text-sm text-gray-600 font-['Inter']">
              {isRunning ? 'Running' : 'Stopped'}
            </span>
            {isGenerated && (
              <span className="text-sm text-gray-500 font-['Inter'] ml-2">
                | {generatedCount} cars in queue
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};