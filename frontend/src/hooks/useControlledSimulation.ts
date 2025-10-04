import { useState, useCallback, useEffect, useRef } from "react";
import type { Color, FrontendSimulationState, Job } from "../types";
import { COLOR_PERCENTAGES } from "../types";
import { v4 as uuidv4 } from "uuid";
import {
    getState,
    addArrival,
    triggerPick,
    reset,
    enterDrainMode,
    exitDrainMode,
    getDrainStatus,
    toggleOven,
    setBufferState,
    toggleMainConveyor,
} from "../services/api";

function generateJobsByCount(count: number): Job[] {
    const jobs: Job[] = [];
    const colors = Object.keys(COLOR_PERCENTAGES) as Color[];

    // Calculate how many of each color we need
    const colorCounts: Record<Color, number> = {} as Record<Color, number>;
    colors.forEach((color) => {
        colorCounts[color] = Math.round(
            (COLOR_PERCENTAGES[color] / 100) * count
        );
    });

    // Adjust for rounding errors to ensure exact count
    let totalAssigned = Object.values(colorCounts).reduce(
        (sum, count) => sum + count,
        0
    );
    if (totalAssigned !== count) {
        const diff = count - totalAssigned;
        colorCounts["C1"] += diff;
    }

    // Create jobs array
    const now = Date.now() / 1000;
    colors.forEach((color) => {
        for (let i = 0; i < colorCounts[color]; i++) {
            jobs.push({
                id: uuidv4(),
                color,
                origin: "O1",
                arrival_ts: now + i * 0.001,
                assigned_buffer: null,
                hold_since: null,
            });
        }
    });

    // Shuffle the array
    for (let i = jobs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [jobs[i], jobs[j]] = [jobs[j], jobs[i]];
    }

    // Alternate origins
    for (let i = 0; i < jobs.length; i++) {
        jobs[i].origin = i % 2 === 0 ? "O1" : "O2";
    }

    return jobs;
}

const INITIAL_STATE: FrontendSimulationState = {
    jobs: [],
    curJobIndex: 0,
    plantState: {
        buffers: {
            L1: {
                id: "L1",
                capacity: 14,
                occupancy: 0,
                input_available: true,
                output_available: true,
                queue: [],
                reserve_headroom: 0,
            },
            L2: {
                id: "L2",
                capacity: 14,
                occupancy: 0,
                input_available: true,
                output_available: true,
                queue: [],
                reserve_headroom: 0,
            },
            L3: {
                id: "L3",
                capacity: 14,
                occupancy: 0,
                input_available: true,
                output_available: true,
                queue: [],
                reserve_headroom: 0,
            },
            L4: {
                id: "L4",
                capacity: 14,
                occupancy: 0,
                input_available: true,
                output_available: true,
                queue: [],
                reserve_headroom: 0,
            },
            L5: {
                id: "L5",
                capacity: 16,
                occupancy: 0,
                input_available: true,
                output_available: true,
                queue: [],
                reserve_headroom: 1,
            },
            L6: {
                id: "L6",
                capacity: 16,
                occupancy: 0,
                input_available: true,
                output_available: true,
                queue: [],
                reserve_headroom: 1,
            },
            L7: {
                id: "L7",
                capacity: 16,
                occupancy: 0,
                input_available: true,
                output_available: true,
                queue: [],
                reserve_headroom: 1,
            },
            L8: {
                id: "L8",
                capacity: 16,
                occupancy: 0,
                input_available: true,
                output_available: true,
                queue: [],
                reserve_headroom: 1,
            },
            L9: {
                id: "L9",
                capacity: 16,
                occupancy: 0,
                input_available: true,
                output_available: true,
                queue: [],
                reserve_headroom: 1,
            },
        },
        oven_states: { O1: true, O2: true }, // O1 is always on
        main_conveyor_busy: false,
        main_conveyor_history: [],
    },
    isRunning: false,
    isSimulating: false,
    autoMode: false,
    pollInterval: 1000,
    statistics: { throughput: 0, changeovers: 0, overflows: 0, cross_sends: 0 },
    lastUpdate: Date.now(),
};

export function useControlledSimulation() {
    const [state, setState] = useState<FrontendSimulationState>(INITIAL_STATE);
    const [generatedJobCount, setGeneratedJobCount] = useState(0);
    const [isGenerated, setIsGenerated] = useState(false);
    const [isSimulating, setIsSimulating] = useState(false);
    const [isDraining, setIsDraining] = useState(false);

    const simulationIntervalRef = useRef<number | null>(null);
    const stateSyncIntervalRef = useRef<number | null>(null);
    const currentJobIndexRef = useRef(0);

    // Sync state from backend every second
    const syncStateFromBackend = useCallback(async () => {
        try {
            const response = await getState();
            setState((prev) => ({
                ...prev,
                plantState: {
                    buffers: response.buffers,
                    oven_states: {
                        O1: true, // O1 is always active
                        O2: response.oven_states?.O2 ?? true,
                    },
                    main_conveyor_busy:
                        response.main_conveyor_busy ||
                        prev.plantState?.main_conveyor_busy ||
                        false,
                    main_conveyor_history: response.main_history || [],
                },
            }));
        } catch (error) {
            console.error("Failed to sync state:", error);
        }
    }, []);

    // Generate jobs on frontend
    const generateJobs = useCallback((count: number) => {
        if (count > 720) count = 720;
        const jobs = generateJobsByCount(count);
        setState((prev) => ({ ...prev, jobs: jobs, curJobIndex: 0 }));
        setGeneratedJobCount(count);
        setIsGenerated(true);
        currentJobIndexRef.current = 0;
    }, []);

    // Process next job in the queue
    const processNextJob = useCallback(async () => {
        const currentIndex = currentJobIndexRef.current;

        if (currentIndex >= state.jobs.length) {
            // All jobs processed, stop normal simulation
            if (simulationIntervalRef.current) {
                clearInterval(simulationIntervalRef.current);
                simulationIntervalRef.current = null;
            }
            if (stateSyncIntervalRef.current) {
                clearInterval(stateSyncIntervalRef.current);
                stateSyncIntervalRef.current = null;
            }

            // Check if there are jobs in buffers that need to be emptied
            const currentState = await getState();
            let totalInBuffers = 0;
            if (currentState.buffers) {
                totalInBuffers = Object.values(currentState.buffers).reduce(
                    (sum: number, buf: any) => sum + (buf?.queue?.length || 0),
                    0
                );
            }

            if (totalInBuffers > 0) {
                // Automatically trigger drain mode to empty buffers optimally
                console.log(
                    `All jobs processed. ${totalInBuffers} jobs remaining in buffers. Starting drain mode...`
                );
                setTimeout(() => {
                    startDrainMode();
                }, 500);
            } else {
                setIsSimulating(false);
            }
            return;
        }

        const job = state.jobs[currentIndex];

        try {
            // Step 1: Move job to oven (visualize on frontend)
            if (state.plantState?.oven_states?.[job.origin] === false) {
                job.origin = job.origin === "O1" ? "O2" : "O1"; // Switch to the other oven if current is off
            }
            setState((prev) => ({
                ...prev,
                plantState: prev.plantState
                    ? {
                          ...prev.plantState,
                          oven_states: {
                              ...(prev.plantState.oven_states || {}),
                              // [job.origin]: true,
                          },
                      }
                    : prev.plantState,
            }));

            // Step 2: Call arrival API to assign job to buffer
            await new Promise((resolve) => setTimeout(resolve, 500)); // Wait 500ms for visualization
            const arrivalResponse = await addArrival(
                job.origin as "O1" | "O2",
                job.color
            );

            // Step 3: Update job with assigned buffer
            setState((prev) => {
                const updatedJobs = [...prev.jobs];
                updatedJobs[currentIndex] = {
                    ...updatedJobs[currentIndex],
                    assigned_buffer: arrivalResponse.assigned_buffer,
                };
                return {
                    ...prev,
                    jobs: updatedJobs,
                    curJobIndex: currentIndex + 1,
                    plantState: prev.plantState
                        ? {
                              ...prev.plantState,
                              oven_states: {
                                  ...(prev.plantState.oven_states || {}),
                                  [job.origin]: false,
                              },
                          }
                        : prev.plantState,
                };
            });

            currentJobIndexRef.current = currentIndex + 1;

            // Step 4: Sync state to show job in buffer
            await syncStateFromBackend();
        } catch (error) {
            console.error("Failed to process job:", error);
        }
    }, [state.jobs, syncStateFromBackend]);

    // Main conveyor picks jobs every second
    const triggerConveyorPick = useCallback(async () => {
        try {
            await triggerPick(); // Let backend controller decide which buffer
            await syncStateFromBackend();
        } catch (error) {
            console.error("Failed to trigger pick:", error);
        }
    }, [syncStateFromBackend]);

    // Start simulation
    const startSimulation = useCallback(async () => {
        if (!isGenerated || state.jobs.length === 0) {
            alert("Please generate jobs first!");
            return;
        }

        setIsSimulating(true);
        setIsDraining(false);

        // Reset backend state
        await reset();
        await syncStateFromBackend();

        let arrivalTurn = true; // Alternate between arrivals and picks

        // Alternate between job arrivals and conveyor picks
        simulationIntervalRef.current = setInterval(async () => {
            if (arrivalTurn) {
                // Process next job arrival
                await processNextJob();
            } else {
                // Trigger conveyor pick
                await triggerConveyorPick();
            }
            arrivalTurn = !arrivalTurn; // Switch turns
        }, 1000);
    }, [
        isGenerated,
        state.jobs,
        syncStateFromBackend,
        processNextJob,
        triggerConveyorPick,
    ]);

    // Stop simulation
    const stopSimulation = useCallback(async () => {
        setIsSimulating(false);
        setIsDraining(false);

        if (simulationIntervalRef.current) {
            clearInterval(simulationIntervalRef.current);
            simulationIntervalRef.current = null;
        }

        if (stateSyncIntervalRef.current) {
            clearInterval(stateSyncIntervalRef.current);
            stateSyncIntervalRef.current = null;
        }

        // Exit drain mode if active
        try {
            await exitDrainMode();
        } catch (error) {
            // Ignore error if not in drain mode
        }
    }, []);

    // Reset everything
    const resetSimulation = useCallback(async () => {
        stopSimulation();
        setState(INITIAL_STATE);
        setGeneratedJobCount(0);
        setIsGenerated(false);
        currentJobIndexRef.current = 0;

        try {
            await reset();
        } catch (error) {
            console.error("Failed to reset backend:", error);
        }
    }, [stopSimulation]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (simulationIntervalRef.current) {
                clearInterval(simulationIntervalRef.current);
            }
            if (stateSyncIntervalRef.current) {
                clearInterval(stateSyncIntervalRef.current);
            }
        };
    }, []);

    const toggleAutoMode = useCallback(() => {
        setState((prev) => ({ ...prev, autoMode: !prev.autoMode }));
    }, []);

    const toggleRunning = useCallback(() => {
        setState((prev) => ({ ...prev, isRunning: !prev.isRunning }));
    }, []);

    // Enter drain mode (when all jobs processed, empty buffers optimally)
    const startDrainMode = useCallback(async () => {
        try {
            console.log("Entering drain mode...");
            setIsSimulating(true);
            setIsDraining(true);

            const drainResult = await enterDrainMode(true); // Use MILP for optimal draining
            console.log("Drain mode entered:", drainResult);

            // Continue triggering picks to execute the drain plan (only picks, no arrivals)
            stateSyncIntervalRef.current = window.setInterval(async () => {
                try {
                    // Check if drain is complete first
                    const status = await getDrainStatus();
                    console.log("Drain status:", status);

                    if (!status.drain_mode || status.plan_len === 0) {
                        // All buffers emptied
                        console.log("Drain mode complete!");
                        setIsSimulating(false);
                        setIsDraining(false);
                        if (stateSyncIntervalRef.current) {
                            clearInterval(stateSyncIntervalRef.current);
                            stateSyncIntervalRef.current = null;
                        }
                        await exitDrainMode();
                        return;
                    }

                    // Trigger next pick from drain plan
                    await triggerConveyorPick();
                } catch (err) {
                    console.error("Error in drain loop:", err);
                }
            }, 1000);
        } catch (error) {
            console.error("Failed to start drain mode:", error);
            setIsSimulating(false);
            setIsDraining(false);
        }
    }, [triggerConveyorPick]);

    // Stop drain mode
    const stopDrainMode = useCallback(async () => {
        try {
            await exitDrainMode();
            setIsSimulating(false);
            setIsDraining(false);
            if (stateSyncIntervalRef.current) {
                clearInterval(stateSyncIntervalRef.current);
                stateSyncIntervalRef.current = null;
            }
        } catch (error) {
            console.error("Failed to stop drain mode:", error);
        }
    }, []);

    // Toggle oven on/off
    const handleToggleOven = useCallback(
        async (ovenId: "O1" | "O2") => {
            try {
                const response = await toggleOven(ovenId);
                console.log(`Oven ${ovenId} toggled:`, response.message);
                await syncStateFromBackend();
            } catch (error) {
                console.error(`Failed to toggle oven ${ovenId}:`, error);
            }
        },
        [syncStateFromBackend]
    );

    // Toggle buffer line on/off
    const handleToggleBufferLine = useCallback(
        async (bufferId: string) => {
            try {
                // Toggle both input and output together for simplicity
                const currentBuffer = state.plantState?.buffers[bufferId];
                const newState = !(
                    currentBuffer?.input_available &&
                    currentBuffer?.output_available
                );

                const response = await setBufferState(
                    bufferId,
                    newState,
                    newState
                );
                console.log(`Buffer ${bufferId} toggled:`, response);
                await syncStateFromBackend();
            } catch (error) {
                console.error(`Failed to toggle buffer ${bufferId}:`, error);
            }
        },
        [state.plantState?.buffers, syncStateFromBackend]
    );

    // Toggle main conveyor
    const handleToggleMainConveyor = useCallback(async () => {
        try {
            const response = await toggleMainConveyor();
            console.log("Main conveyor toggled:", response.message);
            await syncStateFromBackend();
        } catch (error) {
            console.error("Failed to toggle main conveyor:", error);
        }
    }, [syncStateFromBackend]);

    return {
        state,
        generatedJobCount,
        isGenerated,
        isSimulating,
        isDraining,
        generateJobs,
        startSimulation,
        stopSimulation,
        resetSimulation,
        startDrainMode,
        stopDrainMode,
        toggleAutoMode,
        toggleRunning,
        syncStateFromBackend,
        handleToggleOven,
        handleToggleBufferLine,
        handleToggleMainConveyor,
    };
}
