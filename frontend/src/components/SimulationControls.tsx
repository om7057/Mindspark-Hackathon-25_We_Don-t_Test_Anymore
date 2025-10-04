import { FaPlay, FaStop, FaCheckCircle, FaExclamationTriangle, FaSpinner, FaCrosshairs, FaBolt } from 'react-icons/fa';

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
    <div className="bg-slate-800 rounded-xl shadow-xl p-6 space-y-4 border border-slate-700">
      <h2 className="text-xl font-bold text-slate-100">Simulation Controls</h2>
      
      <div className="space-y-3">
        <div className="text-sm bg-slate-700/50 rounded-lg p-3">
          {isGenerated ? (
            <p className="text-green-400 font-medium flex items-center gap-2">
              <FaCheckCircle /> {generatedJobCount} jobs generated and ready
            </p>
          ) : (
            <p className="text-yellow-400 font-medium flex items-center gap-2">
              <FaExclamationTriangle /> Generate jobs first
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onStart}
            disabled={!isGenerated || isSimulating || isDraining}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold text-white transition-all flex items-center justify-center gap-2 ${
              !isGenerated || isSimulating || isDraining
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-500 active:scale-95 shadow-lg shadow-green-600/30'
            }`}
          >
            {isDraining ? (
              <><FaSpinner className="animate-spin" /> Draining...</>
            ) : isSimulating ? (
              <><FaBolt /> Running...</>
            ) : (
              <><FaPlay /> Start</>
            )}
          </button>

          <button
            onClick={onStop}
            disabled={!isSimulating}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold text-white transition-all flex items-center justify-center gap-2 ${
              !isSimulating
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-500 active:scale-95 shadow-lg shadow-red-600/30'
            }`}
          >
            <FaStop /> Stop
          </button>
        </div>
      </div>

      {(isSimulating || isDraining) && (
        <div className="mt-4 p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
          <div className="flex items-center gap-3">
            <div className="animate-pulse w-2 h-2 bg-blue-500 rounded-full"></div>
            <p className="text-sm text-blue-300 flex items-center gap-2">
              {isDraining ? (
                <><FaCrosshairs /> Drain mode - Optimally emptying buffers</>
              ) : (
                <><FaBolt /> Simulation running - Processing jobs</>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
