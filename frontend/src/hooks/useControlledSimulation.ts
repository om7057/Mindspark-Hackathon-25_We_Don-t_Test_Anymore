import { useState, useEffect, useCallback, useRef } from 'react';
import type { SimulationState, Vehicle, Color } from '../types';
import { COLOR_PERCENTAGES } from '../types';

// Generate vehicles based on count and percentage distribution
function generateVehiclesByCount(count: number): Vehicle[] {
  const vehicles: Vehicle[] = [];
  const colors = Object.keys(COLOR_PERCENTAGES) as Color[];
  
  // Calculate how many of each color we need
  const colorCounts: Record<Color, number> = {} as Record<Color, number>;
  colors.forEach(color => {
    colorCounts[color] = Math.round((COLOR_PERCENTAGES[color] / 100) * count);
  });
  
  // Adjust for rounding errors to ensure exact count
  let totalAssigned = Object.values(colorCounts).reduce((sum, count) => sum + count, 0);
  if (totalAssigned !== count) {
    const diff = count - totalAssigned;
    colorCounts['C1'] += diff; // Add difference to most common color
  }
  
  // Create vehicles array
  colors.forEach(color => {
    for (let i = 0; i < colorCounts[color]; i++) {
      vehicles.push({
        id: `V-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        color,
        entryTime: Date.now(),
        currentStage: 'input_buffer'
      });
    }
  });
  
  // Shuffle the array to randomize sequence while maintaining percentages
  for (let i = vehicles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [vehicles[i], vehicles[j]] = [vehicles[j], vehicles[i]];
  }
  
  return vehicles;
}

const INITIAL_STATE: SimulationState = {
  inputBuffer: {
    capacity: 720,
    vehicles: []
  },
  ovens: {
    O1: {
      id: 'O1',
      name: 'Oven 1',
      isActive: false,
      currentVehicle: null,
      processingTime: 5000, // 5 seconds
      remainingTime: 0
    },
    O2: {
      id: 'O2',
      name: 'Oven 2',
      isActive: false,
      currentVehicle: null,
      processingTime: 5000, // 5 seconds
      remainingTime: 0
    }
  },
  bufferLines: {
    L1: { id: 'L1', name: 'Line 1', capacity: 14, vehicles: [], isActive: true, isAvailable: true, ovenSource: 'O1' },
    L2: { id: 'L2', name: 'Line 2', capacity: 14, vehicles: [], isActive: true, isAvailable: true, ovenSource: 'O1' },
    L3: { id: 'L3', name: 'Line 3', capacity: 14, vehicles: [], isActive: true, isAvailable: true, ovenSource: 'O1' },
    L4: { id: 'L4', name: 'Line 4', capacity: 14, vehicles: [], isActive: true, isAvailable: true, ovenSource: 'O1' },
    L5: { id: 'L5', name: 'Line 5', capacity: 16, vehicles: [], isActive: true, isAvailable: true, ovenSource: 'O2' },
    L6: { id: 'L6', name: 'Line 6', capacity: 16, vehicles: [], isActive: true, isAvailable: true, ovenSource: 'O2' },
    L7: { id: 'L7', name: 'Line 7', capacity: 16, vehicles: [], isActive: true, isAvailable: true, ovenSource: 'O2' },
    L8: { id: 'L8', name: 'Line 8', capacity: 16, vehicles: [], isActive: true, isAvailable: true, ovenSource: 'O2' },
    L9: { id: 'L9', name: 'Line 9', capacity: 16, vehicles: [], isActive: true, isAvailable: true, ovenSource: 'O2' }
  },
  mainConveyor: {
    isActive: false,
    currentVehicle: null,
    speed: 1,
    pickingFromBuffer: null
  },
  completedVehicles: [],
  totalVehiclesProcessed: 0,
  simulationSpeed: 1,
  isRunning: false,
  currentTime: 0,
  statistics: {
    throughput: 0,
    avgWaitTime: 0,
    bufferUtilization: 0,
    colorChangeovers: 0,
    totalProcessingTime: 0
  }
};

export function useControlledSimulation() {
  const [state, setState] = useState<SimulationState>(INITIAL_STATE);
  const [generatedVehicleCount, setGeneratedVehicleCount] = useState(0);
  const [isGenerated, setIsGenerated] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const nextOvenRef = useRef<'O1' | 'O2'>('O1'); // Alternate between ovens

  const simulationTick = useCallback(() => {
    setState(prevState => {
      const newState = { ...prevState };
      
      // Process ovens
      Object.values(newState.ovens).forEach(oven => {
        if (oven.isActive && oven.currentVehicle && oven.remainingTime > 0) {
          oven.remainingTime -= 100 * newState.simulationSpeed;
        }

        // Move vehicles from ovens to buffer lines
        if (oven.isActive && oven.currentVehicle && oven.remainingTime <= 0) {
          const vehicle = oven.currentVehicle;
          
          // Find available buffer lines for this oven
          const availableBuffers = Object.values(newState.bufferLines).filter(buffer => 
            buffer.ovenSource === oven.id && 
            buffer.isActive && 
            buffer.isAvailable && 
            buffer.vehicles.length < buffer.capacity
          );

          if (availableBuffers.length > 0) {
            // Select buffer with least vehicles to balance load
            const targetBuffer = availableBuffers.reduce((min, buffer) => 
              buffer.vehicles.length < min.vehicles.length ? buffer : min
            );
            
            vehicle.currentStage = 'buffer_line';
            vehicle.bufferLineId = targetBuffer.id;
            targetBuffer.vehicles.push(vehicle);
            oven.currentVehicle = null;
            oven.remainingTime = 0;
          }
        }

        // Load new vehicles into ovens from input buffer (alternating)
        if (oven.isActive && !oven.currentVehicle && newState.inputBuffer.vehicles.length > 0) {
          if (oven.id === nextOvenRef.current) {
            const vehicle = newState.inputBuffer.vehicles.shift()!;
            vehicle.currentStage = oven.id === 'O1' ? 'oven1' : 'oven2';
            oven.currentVehicle = vehicle;
            oven.remainingTime = oven.processingTime;
            
            // Alternate to next oven
            nextOvenRef.current = nextOvenRef.current === 'O1' ? 'O2' : 'O1';
          }
        }
      });

      // Process main conveyor
      if (newState.mainConveyor.isActive) {
        // If conveyor is empty, select next buffer (FIFO)
        if (!newState.mainConveyor.currentVehicle && !newState.mainConveyor.pickingFromBuffer) {
          const availableBuffers = Object.values(newState.bufferLines)
            .filter(buffer => buffer.isActive && buffer.vehicles.length > 0)
            .sort((a, b) => {
              const aOldest = Math.min(...a.vehicles.map(v => v.entryTime));
              const bOldest = Math.min(...b.vehicles.map(v => v.entryTime));
              return aOldest - bOldest;
            });
          
          if (availableBuffers.length > 0) {
            newState.mainConveyor.pickingFromBuffer = availableBuffers[0].id;
          }
        }

        // Pick vehicle from selected buffer
        if (newState.mainConveyor.pickingFromBuffer && !newState.mainConveyor.currentVehicle) {
          const bufferLine = newState.bufferLines[newState.mainConveyor.pickingFromBuffer];
          if (bufferLine && bufferLine.vehicles.length > 0) {
            const vehicle = bufferLine.vehicles.shift()!;
            vehicle.currentStage = 'main_conveyor';
            newState.mainConveyor.currentVehicle = vehicle;
            newState.mainConveyor.pickingFromBuffer = null;
          }
        }

        // Process vehicle on main conveyor
        if (newState.mainConveyor.currentVehicle) {
          setTimeout(() => {
            setState(prevState => {
              const updatedState = { ...prevState };
              if (updatedState.mainConveyor.currentVehicle) {
                const vehicle = updatedState.mainConveyor.currentVehicle;
                vehicle.currentStage = 'completed';
                updatedState.completedVehicles.push(vehicle);
                updatedState.totalVehiclesProcessed++;
                updatedState.mainConveyor.currentVehicle = null;
              }
              return updatedState;
            });
          }, 3000 / newState.simulationSpeed);
        }
      }

      // Update statistics
      newState.currentTime += 100 * newState.simulationSpeed;
      const totalVehicles = newState.completedVehicles.length;
      const totalBufferCapacity = Object.values(newState.bufferLines).reduce((sum, buffer) => sum + buffer.capacity, 0);
      const usedBufferCapacity = Object.values(newState.bufferLines).reduce((sum, buffer) => sum + buffer.vehicles.length, 0);
      
      newState.statistics = {
        throughput: totalVehicles,
        avgWaitTime: totalVehicles > 0 
          ? Math.round(newState.completedVehicles.reduce((sum, v) => sum + (Date.now() - v.entryTime), 0) / totalVehicles / 1000)
          : 0,
        bufferUtilization: Math.round((usedBufferCapacity / totalBufferCapacity) * 100),
        colorChangeovers: totalVehicles > 1 ? newState.completedVehicles.reduce((count, vehicle, index) => {
          if (index > 0 && vehicle.color !== newState.completedVehicles[index - 1].color) {
            return count + 1;
          }
          return count;
        }, 0) : 0,
        totalProcessingTime: newState.currentTime
      };

      return newState;
    });
  }, []);

  // Start/stop simulation
  useEffect(() => {
    if (state.isRunning) {
      intervalRef.current = setInterval(simulationTick, 100);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [state.isRunning, simulationTick]);

  // Control functions
  const generateVehicles = useCallback((count: number) => {
    if (count > 720) count = 720;
    const vehicles = generateVehiclesByCount(count);
    setState(prev => ({
      ...prev,
      inputBuffer: {
        ...prev.inputBuffer,
        vehicles: vehicles
      }
    }));
    setGeneratedVehicleCount(count);
    setIsGenerated(true);
  }, []);

  const startSimulation = useCallback(() => {
    setState(prev => ({ ...prev, isRunning: true }));
  }, []);

  const stopSimulation = useCallback(() => {
    setState(prev => ({ ...prev, isRunning: false }));
  }, []);

  const resetSimulation = useCallback(() => {
    setState(INITIAL_STATE);
    setGeneratedVehicleCount(0);
    setIsGenerated(false);
    nextOvenRef.current = 'O1';
  }, []);

  const toggleOven = useCallback((ovenId: 'O1' | 'O2') => {
    setState(prev => ({
      ...prev,
      ovens: {
        ...prev.ovens,
        [ovenId]: {
          ...prev.ovens[ovenId],
          isActive: !prev.ovens[ovenId].isActive
        }
      }
    }));
  }, []);

  const toggleBufferLine = useCallback((bufferId: string) => {
    setState(prev => ({
      ...prev,
      bufferLines: {
        ...prev.bufferLines,
        [bufferId]: {
          ...prev.bufferLines[bufferId],
          isActive: !prev.bufferLines[bufferId].isActive
        }
      }
    }));
  }, []);

  const toggleMainConveyor = useCallback(() => {
    setState(prev => ({
      ...prev,
      mainConveyor: {
        ...prev.mainConveyor,
        isActive: !prev.mainConveyor.isActive
      }
    }));
  }, []);

  const setSimulationSpeed = useCallback((speed: number) => {
    setState(prev => ({ ...prev, simulationSpeed: speed }));
  }, []);

  return {
    state,
    generatedVehicleCount,
    isGenerated,
    generateVehicles,
    startSimulation,
    stopSimulation,
    resetSimulation,
    toggleOven,
    toggleBufferLine,
    toggleMainConveyor,
    setSimulationSpeed
  };
}