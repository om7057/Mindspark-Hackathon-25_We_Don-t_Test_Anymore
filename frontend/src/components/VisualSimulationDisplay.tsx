import React, { useState } from 'react';
import type { SimulationState } from '../types';
import { BigCarIcon, VehicleDisplay } from './BigCarIcon';
import { ContextMenu } from './ContextMenu';

interface VisualSimulationDisplayProps {
  state: SimulationState;
  onToggleOven: (ovenId: 'O1' | 'O2') => void;
  onToggleBufferLine: (bufferId: string) => void;
  onToggleMainConveyor: () => void;
}

export const VisualSimulationDisplay: React.FC<VisualSimulationDisplayProps> = ({
  state,
  onToggleOven,
  onToggleBufferLine,
  onToggleMainConveyor
}) => {
  const [contextMenu, setContextMenu] = useState<{
    show: boolean;
    x: number;
    y: number;
    type: 'oven' | 'buffer' | 'conveyor';
    id: string;
  }>({ show: false, x: 0, y: 0, type: 'oven', id: '' });

  const handleRightClick = (
    e: React.MouseEvent,
    type: 'oven' | 'buffer' | 'conveyor',
    id: string
  ) => {
    e.preventDefault();
    setContextMenu({
      show: true,
      x: e.clientX,
      y: e.clientY,
      type,
      id
    });
  };

  const handleContextMenuAction = (action: string) => {
    if (action === 'toggle') {
      if (contextMenu.type === 'oven') {
        onToggleOven(contextMenu.id as 'O1' | 'O2');
      } else if (contextMenu.type === 'buffer') {
        onToggleBufferLine(contextMenu.id);
      } else if (contextMenu.type === 'conveyor') {
        onToggleMainConveyor();
      }
    }
    setContextMenu({ ...contextMenu, show: false });
  };

  const closeContextMenu = () => {
    setContextMenu({ ...contextMenu, show: false });
  };

  return (
    <div className="space-y-6 p-6 bg-gray-50 rounded-lg">
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <VehicleDisplay
          vehicles={state.inputBuffer.vehicles}
          title="Input Buffer"
          maxDisplay={20}
          isMoving={state.isRunning}
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <div
            className={`bg-white rounded-lg p-5 shadow-sm border-2 transition-all ${
              state.ovens.O1.isActive 
                ? 'border-blue-400 bg-blue-50' 
                : 'border-gray-300 bg-gray-50'
            }`}
            onContextMenu={(e) => handleRightClick(e, 'oven', 'O1')}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${
                  state.ovens.O1.isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                }`} />
                <h3 className="text-lg font-semibold text-gray-800 font-['Inter']">
                  Oven 1
                </h3>
              </div>
              <span className={`text-xs px-2 py-1 rounded font-['Inter'] ${
                state.ovens.O1.isActive 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-gray-100 text-gray-500'
              }`}>
                {state.ovens.O1.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            
            <div className="min-h-[100px] flex items-center justify-center">
              {state.ovens.O1.currentVehicle ? (
                <div className="w-full">
                  <div className="flex items-center space-x-3 p-4 bg-white rounded-lg border border-blue-200">
                    <BigCarIcon 
                      color={state.ovens.O1.currentVehicle.color} 
                      size="large"
                      processingProgress={100 - (state.ovens.O1.remainingTime / state.ovens.O1.processingTime) * 100}
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-700 font-['Inter']">
                        {state.ovens.O1.currentVehicle.id}
                      </div>
                      <div className="text-xs text-gray-500 font-['Inter']">
                        {Math.ceil(state.ovens.O1.remainingTime / 1000)}s remaining
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                        <div 
                          className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                          style={{ 
                            width: `${100 - (state.ovens.O1.remainingTime / state.ovens.O1.processingTime) * 100}%` 
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400 text-sm font-['Inter']">
                  {state.ovens.O1.isActive ? 'Waiting for vehicle' : 'Oven disabled'}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm border border-blue-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-700 font-['Inter']">
                Buffer Lines (L1-L4)
              </h4>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                <span className="text-xs text-gray-500 font-['Inter']">Oven 1</span>
              </div>
            </div>
            
            <div className="space-y-2">
              {Object.values(state.bufferLines).slice(0, 4).map((buffer) => (
                <div
                  key={buffer.id}
                  className={`p-3 rounded-lg border transition-all ${
                    buffer.isActive 
                      ? 'border-blue-200 bg-blue-50' 
                      : 'border-gray-200 bg-gray-100'
                  }`}
                  onContextMenu={(e) => handleRightClick(e, 'buffer', buffer.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        buffer.isActive ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      <span className="text-xs font-medium text-gray-700 font-['Inter']">
                        {buffer.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-['Inter'] ${
                        buffer.isActive 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-600'
                      }`}>
                        {buffer.isActive ? 'ON' : 'OFF'}
                      </span>
                      <span className="text-xs text-gray-500 font-['Inter']">
                        {buffer.vehicles.length}/{buffer.capacity}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex gap-1 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {Array.from({ length: buffer.capacity }).map((_, index) => (
                      <div
                        key={index}
                        className={`w-8 h-8 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                          buffer.vehicles[index]
                            ? 'border-blue-300 bg-white'
                            : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        {buffer.vehicles[index] && (
                          <BigCarIcon 
                            color={buffer.vehicles[index].color} 
                            size="small"
                            isMoving={buffer.isActive && state.isRunning}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div
            className={`bg-white rounded-lg p-5 shadow-sm border-2 transition-all ${
              state.ovens.O2.isActive 
                ? 'border-purple-400 bg-purple-50' 
                : 'border-gray-300 bg-gray-50'
            }`}
            onContextMenu={(e) => handleRightClick(e, 'oven', 'O2')}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${
                  state.ovens.O2.isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                }`} />
                <h3 className="text-lg font-semibold text-gray-800 font-['Inter']">
                  Oven 2
                </h3>
              </div>
              <span className={`text-xs px-2 py-1 rounded font-['Inter'] ${
                state.ovens.O2.isActive 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-gray-100 text-gray-500'
              }`}>
                {state.ovens.O2.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            
            <div className="min-h-[100px] flex items-center justify-center">
              {state.ovens.O2.currentVehicle ? (
                <div className="w-full">
                  <div className="flex items-center space-x-3 p-4 bg-white rounded-lg border border-purple-200">
                    <BigCarIcon 
                      color={state.ovens.O2.currentVehicle.color} 
                      size="large"
                      processingProgress={100 - (state.ovens.O2.remainingTime / state.ovens.O2.processingTime) * 100}
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-700 font-['Inter']">
                        {state.ovens.O2.currentVehicle.id}
                      </div>
                      <div className="text-xs text-gray-500 font-['Inter']">
                        {Math.ceil(state.ovens.O2.remainingTime / 1000)}s remaining
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                        <div 
                          className="bg-purple-500 h-1.5 rounded-full transition-all duration-500"
                          style={{ 
                            width: `${100 - (state.ovens.O2.remainingTime / state.ovens.O2.processingTime) * 100}%` 
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400 text-sm font-['Inter']">
                  {state.ovens.O2.isActive ? 'Waiting for vehicle' : 'Oven disabled'}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm border border-purple-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-700 font-['Inter']">
                Buffer Lines (L5-L9)
              </h4>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full" />
                <span className="text-xs text-gray-500 font-['Inter']">Oven 2</span>
              </div>
            </div>
            
            <div className="space-y-2">
              {Object.values(state.bufferLines).slice(4).map((buffer) => (
                <div
                  key={buffer.id}
                  className={`p-3 rounded-lg border transition-all ${
                    buffer.isActive 
                      ? 'border-purple-200 bg-purple-50' 
                      : 'border-gray-200 bg-gray-100'
                  }`}
                  onContextMenu={(e) => handleRightClick(e, 'buffer', buffer.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        buffer.isActive ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      <span className="text-xs font-medium text-gray-700 font-['Inter']">
                        {buffer.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-['Inter'] ${
                        buffer.isActive 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-600'
                      }`}>
                        {buffer.isActive ? 'ON' : 'OFF'}
                      </span>
                      <span className="text-xs text-gray-500 font-['Inter']">
                        {buffer.vehicles.length}/{buffer.capacity}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex gap-1 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {Array.from({ length: buffer.capacity }).map((_, index) => (
                      <div
                        key={index}
                        className={`w-8 h-8 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                          buffer.vehicles[index]
                            ? 'border-purple-300 bg-white'
                            : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        {buffer.vehicles[index] && (
                          <BigCarIcon 
                            color={buffer.vehicles[index].color} 
                            size="small"
                            isMoving={buffer.isActive && state.isRunning}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div 
        className={`bg-white rounded-lg p-4 shadow-sm border transition-all ${
          state.mainConveyor.isActive 
            ? 'border-green-300 bg-green-50' 
            : 'border-gray-300 bg-gray-50'
        }`}
        onContextMenu={(e) => handleRightClick(e, 'conveyor', 'main')}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-800 font-['Inter']">
            Main Conveyor
          </h3>
          <div className={`w-2 h-2 rounded-full ${
            state.mainConveyor.isActive ? 'bg-green-500' : 'bg-gray-400'
          }`} />
        </div>
        
        <div className="py-4">
          {state.mainConveyor.currentVehicle ? (
            <div className="flex items-center justify-center space-x-4 p-3 bg-white rounded border">
              <BigCarIcon 
                color={state.mainConveyor.currentVehicle.color} 
                size="large"
                isMoving={true}
              />
              <div className="text-center">
                <div className="text-sm font-medium text-gray-700 font-['Inter']">
                  {state.mainConveyor.currentVehicle.id}
                </div>
                <div className="text-xs text-gray-500 font-['Inter']">
                  Moving to completion
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-400 text-sm font-['Inter']">
              {state.mainConveyor.isActive ? 'Waiting for vehicle' : 'Stopped'}
            </div>
          )}
          
          {state.mainConveyor.pickingFromBuffer && (
            <div className="text-center text-xs text-blue-600 font-['Inter'] mt-2">
              Picking from {state.bufferLines[state.mainConveyor.pickingFromBuffer]?.name}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <VehicleDisplay
          vehicles={state.completedVehicles.slice(-20)}
          title="Completed Vehicles"
          maxDisplay={20}
        />
      </div>

      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 font-['Inter']">
          Performance Statistics
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded">
            <div className="text-xl font-semibold text-gray-700 font-['Inter']">
              {state.statistics.throughput}
            </div>
            <div className="text-xs text-gray-500 font-['Inter']">
              Processed
            </div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded">
            <div className="text-xl font-semibold text-gray-700 font-['Inter']">
              {state.statistics.avgWaitTime}s
            </div>
            <div className="text-xs text-gray-500 font-['Inter']">
              Avg Wait
            </div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded">
            <div className="text-xl font-semibold text-gray-700 font-['Inter']">
              {state.statistics.bufferUtilization}%
            </div>
            <div className="text-xs text-gray-500 font-['Inter']">
              Buffer Usage
            </div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded">
            <div className="text-xl font-semibold text-gray-700 font-['Inter']">
              {state.statistics.colorChangeovers}
            </div>
            <div className="text-xs text-gray-500 font-['Inter']">
              Color Changes
            </div>
          </div>
        </div>
      </div>

      {contextMenu.show && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={closeContextMenu}
          actions={[
            {
              label: contextMenu.type === 'oven' 
                ? (state.ovens[contextMenu.id as 'O1' | 'O2']?.isActive ? 'Disable Oven' : 'Enable Oven')
                : contextMenu.type === 'buffer'
                ? (state.bufferLines[contextMenu.id]?.isActive ? 'Disable Buffer' : 'Enable Buffer')
                : (state.mainConveyor.isActive ? 'Stop Conveyor' : 'Start Conveyor'),
              onClick: () => handleContextMenuAction('toggle'),
              icon: contextMenu.type === 'oven' 
                ? (state.ovens[contextMenu.id as 'O1' | 'O2']?.isActive ? '🛑' : '▶️')
                : contextMenu.type === 'buffer'
                ? (state.bufferLines[contextMenu.id]?.isActive ? '🛑' : '▶️')
                : (state.mainConveyor.isActive ? '🛑' : '▶️')
            }
          ]}
        />
      )}
    </div>
  );
};