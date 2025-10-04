import { useState } from 'react';
import { FaCarSide } from 'react-icons/fa6';

interface GenerationControlsProps {
  onGenerate: (count: number) => void;
  onReset: () => void;
  isGenerated: boolean;
  generatedCount: number;
}

export const GenerationControls: React.FC<GenerationControlsProps> = ({
  onGenerate,
  onReset,
  isGenerated,
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
    <div className="bg-slate-800 rounded-xl shadow-xl p-6 mb-6 border border-slate-700">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-blue-500/10 rounded-lg">
          <FaCarSide className="text-2xl text-blue-400" />
        </div>
        <h2 className="text-xl font-semibold text-slate-100 font-['Inter']">
          Job Generation
        </h2>
      </div>
      
      <div className="space-y-4">
        {/* Car Generation Section */}
        <div className="flex items-center space-x-4 flex-wrap gap-4">
          <div className="flex items-center space-x-3">
            <label htmlFor="carCount" className="text-sm font-medium text-slate-300 font-['Inter']">
              Cars:
            </label>
            <input
              id="carCount"
              type="number"
              min="1"
              max="720"
              value={inputCount}
              onChange={handleInputChange}
              disabled={isGenerated}
              className="w-24 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-900 disabled:text-slate-500 font-['Inter'] transition-all"
            />
            <span className="text-xs text-slate-400 font-['Inter']">
              (max 720)
            </span>
          </div>
          
          <button
            onClick={handleGenerate}
            disabled={isGenerated || !inputCount || parseInt(inputCount) === 0}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed transition-all text-sm font-medium font-['Inter'] shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 disabled:shadow-none"
          >
            Generate Jobs
          </button>

          <button
            onClick={onReset}
            className="px-5 py-2.5 bg-slate-700 text-slate-200 rounded-lg hover:bg-slate-600 transition-all text-sm font-medium font-['Inter']"
          >
            Reset
          </button>
        </div>

        {/* Status Display */}
        {isGenerated && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
            <div className="flex items-center space-x-2 text-green-400 text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="font-['Inter'] font-medium">
                Generated {generatedCount} jobs ready
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};