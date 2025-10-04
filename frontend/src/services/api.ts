// API Service - Functions to communicate with the backend

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Type Definitions

export interface Job {
  id: string;
  color: string;
  origin: string; // 'O1' or 'O2'
  arrival_ts: number;
  assigned_buffer: string | null;
  hold_since: number | null;
}

export interface BufferLine {
  id: string;
  capacity: number;
  occupancy: number;
  input_available: boolean;
  output_available: boolean;
  queue: Job[];
  reserve_headroom: number;
}

export interface MainConveyorHistoryItem {
  timestamp?: number;
  buffer_id: string;
  n: number;
  colors: string[];
  operator: string;
}

// API Functions

// Get current state of all buffers and conveyor history
export async function getState() {
  const response = await fetch(`${API_BASE_URL}/state`);
  if (!response.ok) {
    throw new Error(`Failed to get state: ${response.statusText}`);
  }
  return response.json();
}

// Add new vehicle arrival from oven (optional: specify color)
export async function addArrival(oven: 'O1' | 'O2', color?: string) {
  const url = `${API_BASE_URL}/arrival?oven=${oven}${color ? `&color=${color}` : ''}`;
  
  const response = await fetch(url, {
    method: 'POST',
  });
  
  if (!response.ok) {
    throw new Error(`Failed to add arrival: ${response.statusText}`);
  }
  
  return response.json();
}

// Pick jobs from buffer (optional: specify buffer and count)
export async function triggerPick(bufferId?: string, n: number = 1) {
  let url = `${API_BASE_URL}/trigger_pick?n=${n}`;
  if (bufferId) {
    url += `&buffer_id=${bufferId}`;
  }
  
  const response = await fetch(url, {
    method: 'POST',
  });
  
  if (!response.ok) {
    throw new Error(`Failed to trigger pick: ${response.statusText}`);
  }
  
  return response.json();
}

// Run complete simulation (seconds, o1_rate, o2_rate)
export async function runSimulation(
  seconds: number = 3600,
  o1Rate: number = 6.0,
  o2Rate: number = 6.0
) {
  const url = `${API_BASE_URL}/run_sim?seconds=${seconds}&o1_rate=${o1Rate}&o2_rate=${o2Rate}`;
  
  const response = await fetch(url, {
    method: 'POST',
  });
  
  if (!response.ok) {
    throw new Error(`Failed to run simulation: ${response.statusText}`);
  }
  
  return response.json();
}

// Run MILP optimization algorithm
export async function runMILP(horizonSlots: number = 50) {
  const url = `${API_BASE_URL}/milp?horizon_slots=${horizonSlots}`;
  
  const response = await fetch(url, {
    method: 'POST',
  });
  
  if (!response.ok) {
    throw new Error(`Failed to run MILP: ${response.statusText}`);
  }
  
  return response.json();
}

// Reset plant to initial state
export async function reset() {
  const response = await fetch(`${API_BASE_URL}/reset`, {
    method: 'POST',
  });
  
  if (!response.ok) {
    throw new Error(`Failed to reset: ${response.statusText}`);
  }
  
  return response.json();
}

// Check if backend is running
export async function checkBackendHealth(): Promise<boolean> {
  try {
    await getState();
    return true;
  } catch {
    return false;
  }
}

// Enter drain mode (when ovens stop, empty buffers optimally)
export async function enterDrainMode(useMilp: boolean = true) {
  const url = `${API_BASE_URL}/enter_drain?use_milp=${useMilp}`;
  
  const response = await fetch(url, {
    method: 'POST',
  });
  
  if (!response.ok) {
    throw new Error(`Failed to enter drain mode: ${response.statusText}`);
  }
  
  return response.json();
}

// Exit drain mode
export async function exitDrainMode() {
  const response = await fetch(`${API_BASE_URL}/exit_drain`, {
    method: 'POST',
  });
  
  if (!response.ok) {
    throw new Error(`Failed to exit drain mode: ${response.statusText}`);
  }
  
  return response.json();
}

// Get drain mode status
export async function getDrainStatus() {
  const response = await fetch(`${API_BASE_URL}/drain_status`);
  
  if (!response.ok) {
    throw new Error(`Failed to get drain status: ${response.statusText}`);
  }
  
  return response.json();
}

// Toggle oven state (O1 or O2)
export async function toggleOven(ovenId: 'O1' | 'O2') {
  const response = await fetch(`${API_BASE_URL}/toggle_oven?oven_id=${ovenId}`, {
    method: 'POST',
  });
  
  if (!response.ok) {
    throw new Error(`Failed to toggle oven: ${response.statusText}`);
  }
  
  return response.json();
}

// Toggle buffer input or output availability
export async function toggleBuffer(bufferId: string, field: 'input_available' | 'output_available' = 'input_available') {
  const response = await fetch(`${API_BASE_URL}/toggle_buffer?buffer_id=${bufferId}&field=${field}`, {
    method: 'POST',
  });
  
  if (!response.ok) {
    throw new Error(`Failed to toggle buffer: ${response.statusText}`);
  }
  
  return response.json();
}

// Set buffer state (both input and output)
export async function setBufferState(
  bufferId: string,
  inputAvailable?: boolean,
  outputAvailable?: boolean
) {
  const params = new URLSearchParams({ buffer_id: bufferId });
  if (inputAvailable !== undefined) params.append('input_available', String(inputAvailable));
  if (outputAvailable !== undefined) params.append('output_available', String(outputAvailable));
  
  const response = await fetch(`${API_BASE_URL}/set_buffer_state?${params}`, {
    method: 'POST',
  });
  
  if (!response.ok) {
    throw new Error(`Failed to set buffer state: ${response.statusText}`);
  }
  
  return response.json();
}

// Toggle main conveyor busy state
export async function toggleMainConveyor() {
  const response = await fetch(`${API_BASE_URL}/toggle_main_conveyor`, {
    method: 'POST',
  });
  
  if (!response.ok) {
    throw new Error(`Failed to toggle main conveyor: ${response.statusText}`);
  }
  
  return response.json();
}

// Export all functions as a single object
export const api = {
  getState,
  addArrival,
  triggerPick,
  runSimulation,
  runMILP,
  reset,
  checkBackendHealth,
  enterDrainMode,
  exitDrainMode,
  getDrainStatus,
  toggleOven,
  toggleBuffer,
  setBufferState,
  toggleMainConveyor,
  baseUrl: API_BASE_URL,
};
