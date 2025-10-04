import type { FrontendSimulationState } from "../types";
import { COLOR_CODES } from "../types";

interface BackendStateDisplayProps {
  state: FrontendSimulationState;
}

export function BackendStateDisplay({ state }: BackendStateDisplayProps) {
  const buffers = state.plantState?.buffers || {};
  const history = state.plantState?.main_conveyor_history || [];

  // Calculate total stats
  const totalCapacity = Object.values(buffers).reduce(
    (sum, buffer) => sum + buffer.capacity,
    0
  );
  const totalOccupancy = Object.values(buffers).reduce(
    (sum, buffer) => sum + buffer.occupancy,
    0
  );
  const utilizationPercent =
    totalCapacity > 0 ? ((totalOccupancy / totalCapacity) * 100).toFixed(1) : "0";

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-6">
      <h2 className="text-xl font-bold text-gray-800">Plant State</h2>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-sm text-gray-600">Total Capacity</div>
          <div className="text-2xl font-bold text-blue-700">{totalCapacity}</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-sm text-gray-600">Total Occupancy</div>
          <div className="text-2xl font-bold text-green-700">{totalOccupancy}</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-sm text-gray-600">Utilization</div>
          <div className="text-2xl font-bold text-purple-700">{utilizationPercent}%</div>
        </div>
      </div>

      {/* Buffer Lines */}
      <div>
        <h3 className="text-lg font-semibold text-gray-700 mb-3">Buffer Lines</h3>
        <div className="grid grid-cols-3 gap-4">
          {Object.values(buffers).map((buffer) => (
            <div
              key={buffer.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-bold text-gray-800">{buffer.id}</h4>
                <span className="text-sm text-gray-500">
                  {buffer.occupancy}/{buffer.capacity}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                <div
                  className={`h-2 rounded-full transition-all ${
                    buffer.occupancy >= buffer.capacity
                      ? "bg-red-500"
                      : buffer.occupancy >= buffer.capacity * 0.8
                      ? "bg-yellow-500"
                      : "bg-green-500"
                  }`}
                  style={{
                    width: `${(buffer.occupancy / buffer.capacity) * 100}%`,
                  }}
                />
              </div>

              {/* Jobs in Queue */}
              {buffer.queue.length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs text-gray-600 mb-1">Jobs in queue:</div>
                  <div className="flex flex-wrap gap-1">
                    {buffer.queue.slice(0, 5).map((job) => (
                      <div
                        key={job.id}
                        className="w-6 h-6 rounded"
                        style={{
                          backgroundColor: COLOR_CODES[job.color as keyof typeof COLOR_CODES],
                        }}
                        title={`${job.color} from ${job.origin}`}
                      />
                    ))}
                    {buffer.queue.length > 5 && (
                      <div className="text-xs text-gray-500 self-center">
                        +{buffer.queue.length - 5} more
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Status Indicators */}
              <div className="flex gap-2 mt-3 text-xs">
                <span
                  className={`px-2 py-1 rounded ${
                    buffer.input_available
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  Input: {buffer.input_available ? "✓" : "✗"}
                </span>
                <span
                  className={`px-2 py-1 rounded ${
                    buffer.output_available
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  Output: {buffer.output_available ? "✓" : "✗"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Conveyor History */}
      {history.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-3">
            Recent Conveyor Picks
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {history.slice(-10).reverse().map((item, index) => (
              <div
                key={index}
                className="bg-gray-50 rounded p-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-gray-700">
                    {item.buffer_id}
                  </span>
                  <span className="text-sm text-gray-500">
                    picked {item.n} job{item.n !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex gap-1">
                  {item.colors.map((color, idx) => (
                    <div
                      key={idx}
                      className="w-5 h-5 rounded"
                      style={{
                        backgroundColor: COLOR_CODES[color as keyof typeof COLOR_CODES],
                      }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
