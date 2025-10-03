export type Color = 'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'C6' | 'C7' | 'C8' | 'C9' | 'C10' | 'C11' | 'C12';

export interface Vehicle {
  id: string;
  color: Color;
  entryTime: number;
  currentStage: 'input_buffer' | 'oven1' | 'oven2' | 'buffer_line' | 'main_conveyor' | 'completed';
  bufferLineId?: string;
}

export interface BufferLine {
  id: string;
  name: string;
  capacity: number;
  vehicles: Vehicle[];
  isActive: boolean;
  isAvailable: boolean;
  ovenSource: 'O1' | 'O2';
}

export interface Oven {
  id: 'O1' | 'O2';
  name: string;
  isActive: boolean;
  currentVehicle: Vehicle | null;
  processingTime: number;
  remainingTime: number;
}

export interface InputBuffer {
  capacity: number;
  vehicles: Vehicle[];
}

export interface MainConveyor {
  isActive: boolean;
  currentVehicle: Vehicle | null;
  speed: number;
  pickingFromBuffer: string | null;
}

export interface ColorDistribution {
  [key: string]: number;
}

export const COLOR_PERCENTAGES: ColorDistribution = {
  C1: 40,
  C2: 25,
  C3: 12,
  C4: 8,
  C5: 3,
  C6: 2,
  C7: 2,
  C8: 2,
  C9: 2,
  C10: 2,
  C11: 2,
  C12: 1,
};

export const COLOR_CODES: Record<Color, string> = {
  C1: '#FF0000', // Red
  C2: '#0000FF', // Blue
  C3: '#00FF00', // Green
  C4: '#FFFF00', // Yellow
  C5: '#FF00FF', // Magenta
  C6: '#00FFFF', // Cyan
  C7: '#FFA500', // Orange
  C8: '#800080', // Purple
  C9: '#FFC0CB', // Pink
  C10: '#A52A2A', // Brown
  C11: '#808080', // Gray
  C12: '#000000', // Black
};

export interface SimulationState {
  inputBuffer: InputBuffer;
  ovens: Record<string, Oven>;
  bufferLines: Record<string, BufferLine>;
  mainConveyor: MainConveyor;
  completedVehicles: Vehicle[];
  totalVehiclesProcessed: number;
  simulationSpeed: number;
  isRunning: boolean;
  currentTime: number;
  statistics: {
    throughput: number;
    avgWaitTime: number;
    bufferUtilization: number;
    colorChangeovers: number;
    totalProcessingTime: number;
  };
}

export interface AlgorithmConfig {
  inputAlgorithm: 'random' | 'balanced' | 'priority';
  outputAlgorithm: 'fifo' | 'color_grouping' | 'shortest_queue' | 'priority';
  prioritizeColorGrouping: boolean;
  preventOverflow: boolean;
  minimizeChangeover: boolean;
}
