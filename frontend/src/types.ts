export type Color =
    | "C1"
    | "C2"
    | "C3"
    | "C4"
    | "C5"
    | "C6"
    | "C7"
    | "C8"
    | "C9"
    | "C10"
    | "C11"
    | "C12";

// Backend model: Job
export interface Job {
    id: string;
    color: string;
    origin: string; // 'O1' or 'O2'
    arrival_ts: number;
    assigned_buffer: string | null;
    hold_since: number | null;
}

// Backend model: BufferLine
export interface BufferLine {
    id: string;
    capacity: number;
    occupancy: number;
    input_available: boolean;
    output_available: boolean;
    queue: Job[];
    reserve_headroom: number;
}

// Backend model: Main Conveyor History Item
export interface MainConveyorHistoryItem {
    timestamp?: number;
    buffer_id: string;
    n: number;
    colors: string[];
    operator: string;
}

// Backend model: PlantState
export interface PlantState {
    buffers: Record<string, BufferLine>;
    oven_states?: Record<string, boolean>;
    main_conveyor_busy?: boolean;
    main_conveyor_history: MainConveyorHistoryItem[];
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
    C1: "#FF0000", // Red
    C2: "#0000FF", // Blue
    C3: "#00FF00", // Green
    C4: "#FFFF00", // Yellow
    C5: "#FF00FF", // Magenta
    C6: "#00FFFF", // Cyan
    C7: "#FFA500", // Orange
    C8: "#800080", // Purple
    C9: "#FFC0CB", // Pink
    C10: "#A52A2A", // Brown
    C11: "#808080", // Gray
    C12: "#000000", // Black
};

// API Response types
export interface BackendStateResponse {
    buffers: Record<string, BufferLine>;
    main_history: MainConveyorHistoryItem[];
    total_capacity: number;
    total_occupancy: number;
}

export interface ArrivalResponse {
    job_id: string;
    assigned_buffer: string | null;
    job: Job;
}

export interface PickResponse {
    status?: string;
    picked_n?: number;
    colors?: string[];
}

export interface SimulationStats {
    throughput: number;
    changeovers: number;
    overflows: number;
    cross_sends: number;
}

export interface SimulationResponse {
    stats: SimulationStats;
    final_buffers: Record<string, BufferLine>;
}

// Frontend-only state management (not from backend)
export interface FrontendSimulationState {
    jobs: Job[];
    curJobIndex: number ;
    plantState: PlantState | null;
    isRunning: boolean;
    isSimulating: boolean;
    autoMode: boolean;
    pollInterval: number;
    statistics: SimulationStats;
    lastUpdate: number;
}
