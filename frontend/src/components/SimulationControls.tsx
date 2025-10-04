interface SimulationControlsProps {
  isGenerated: boolean;
  isSimulating: boolean;
  isDraining: boolean;
  onStart: () => void;
  onStop: () => void;
  generatedJobCount: number;
}

export function SimulationControls({
  isGenerated,
  isSimulating,
  isDraining,
  onStart,
  onStop,
  generatedJobCount,
}: SimulationControlsProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-4">
      <h2 className="text-xl font-bold text-gray-800">Simulation Controls</h2>
      
      <div className="space-y-3">
        <div className="text-sm text-gray-600">
          {isGenerated ? (
            <p>✅ {generatedJobCount} jobs generated and ready</p>
          ) : (
            <p>⚠️ Generate jobs first before starting simulation</p>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onStart}
            disabled={!isGenerated || isSimulating || isDraining}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold text-white transition-all ${
              !isGenerated || isSimulating || isDraining
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 active:scale-95'
            }`}
          >
            {isDraining ? '🔄 Draining Buffers...' : isSimulating ? '🚀 Running...' : '▶️ Start Simulation'}
          </button>

          <button
            onClick={onStop}
            disabled={!isSimulating}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold text-white transition-all ${
              !isSimulating
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-700 active:scale-95'
            }`}
          >
            ⏹️ Stop Simulation
          </button>
        </div>
      </div>

      {(isSimulating || isDraining) && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2">
            <div className="animate-pulse w-3 h-3 bg-blue-600 rounded-full"></div>
            <p className="text-sm text-blue-800">
              {isDraining 
                ? 'Drain mode active - Optimally emptying remaining buffers'
                : 'Simulation running - Jobs are being processed and state is syncing with backend'
              }
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
