import { useState } from "react";
import type { FrontendSimulationState } from "../types";
import { COLOR_CODES } from "../types";
import { BigCarIcon } from "./BigCarIcon";
import { ContextMenu } from "./ContextMenu";

interface EnhancedSimulationDisplayProps {
    state: FrontendSimulationState;
    onToggleOven?: (ovenId: "O1" | "O2") => void;
    onToggleBufferLine?: (bufferId: string) => void;
    onToggleMainConveyor?: () => void;
}

export function EnhancedSimulationDisplay({
    state,
    onToggleOven,
    onToggleBufferLine,
    onToggleMainConveyor,
}: EnhancedSimulationDisplayProps) {
    const [contextMenu, setContextMenu] = useState<{
        show: boolean;
        x: number;
        y: number;
        type: "oven" | "buffer" | "conveyor";
        id: string;
    }>({ show: false, x: 0, y: 0, type: "oven", id: "" });

    const handleRightClick = (
        e: React.MouseEvent,
        type: "oven" | "buffer" | "conveyor",
        id: string
    ) => {
        e.preventDefault();

        // Only allow toggling O2, not O1
        if (type === "oven" && id === "O1") {
            return; // O1 cannot be toggled
        }

        setContextMenu({
            show: true,
            x: e.clientX,
            y: e.clientY,
            type,
            id,
        });
    };

    const handleContextMenuAction = (action: string) => {
        if (action === "toggle") {
            if (contextMenu.type === "oven" && onToggleOven) {
                onToggleOven(contextMenu.id as "O1" | "O2");
            } else if (contextMenu.type === "buffer" && onToggleBufferLine) {
                onToggleBufferLine(contextMenu.id);
            } else if (
                contextMenu.type === "conveyor" &&
                onToggleMainConveyor
            ) {
                onToggleMainConveyor();
            }
        }
        setContextMenu({ ...contextMenu, show: false });
    };

    const closeContextMenu = () => {
        setContextMenu({ ...contextMenu, show: false });
    };
    const buffers = state.plantState?.buffers || {};
    const history = state.plantState?.main_conveyor_history || [];

    // Separate buffers by oven
    // O1 (Oven 1) → L1-L4 only
    // O2 (Oven 2) → L5-L9 only
    const o1Buffers = ["L1", "L2", "L3", "L4"];
    const o2Buffers = ["L5", "L6", "L7", "L8", "L9"];

    // Get current job being processed
    const currentJob = state.jobs[state.curJobIndex];
    const pendingJobs = state.jobs.slice(state.curJobIndex + 1);

    // Calculate initial changeovers (from originally generated sequence)
    const calculateInitialChangeovers = () => {
        let changeovers = 0;
        for (let i = 1; i < state.jobs.length; i++) {
            if (state.jobs[i - 1].color !== state.jobs[i].color) {
                changeovers++;
            }
        }
        return changeovers;
    };

    // Calculate color changeovers from history (final sequence after optimization)
    const calculateFinalChangeovers = () => {
        let changeovers = 0;
        for (let i = 1; i < history.length; i++) {
            const prevColors = history[i - 1].colors;
            const currColors = history[i].colors;
            if (
                prevColors.length > 0 &&
                currColors.length > 0 &&
                prevColors[prevColors.length - 1] !== currColors[0]
            ) {
                changeovers++;
            }
        }
        return changeovers;
    };

    // Build final sequence from history
    const finalSequence: string[] = [];
    history.forEach((item) => {
        finalSequence.push(...item.colors);
    });

    // Get oven states
    const ovenStates = state.plantState?.oven_states || { O1: true, O2: true };

    return (
        <div className="space-y-6" onClick={closeContextMenu}>
            {/* Oven Status Section */}

            {/* Job Queue Section */}
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">
                    Job Queue
                </h2>

                {/* Current Job */}
                {currentJob && (
                    <div className="mb-4">
                        <h3 className="text-sm font-semibold text-gray-600 mb-2">
                            Current Job Processing
                        </h3>
                        <div className="bg-blue-50 border-2 border-blue-500 rounded-lg p-4 flex items-center gap-4">
                            <BigCarIcon
                                color={currentJob.color as any}
                                size="xl"
                                animate
                            />
                            <div className="flex-1">
                                <div className="text-sm text-gray-600">
                                    <span className="font-semibold">
                                        Origin:
                                    </span>{" "}
                                    {currentJob.origin}
                                </div>
                                <div className="text-sm text-gray-600">
                                    <span className="font-semibold">
                                        Color:
                                    </span>{" "}
                                    {currentJob.color}
                                </div>
                                {currentJob.assigned_buffer && (
                                    <div className="text-sm text-green-700 font-semibold">
                                        → Assigned to{" "}
                                        {currentJob.assigned_buffer}
                                    </div>
                                )}
                            </div>
                            <div className="animate-pulse text-2xl">⚡</div>
                        </div>
                    </div>
                )}

                {/* Initial Sequence (Pending Jobs) */}
                <div>
                    <h3 className="text-sm font-semibold text-gray-600 mb-2">
                        Pending Jobs ({pendingJobs.length})
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4 max-h-32 overflow-y-auto">
                        <div className="flex flex-wrap gap-2">
                            {pendingJobs.slice(0, 50).map((job) => (
                                <BigCarIcon
                                    key={job.id}
                                    color={job.color as any}
                                    size="small"
                                />
                            ))}
                            {pendingJobs.length > 50 && (
                                <div className="text-xs text-gray-500 self-center">
                                    +{pendingJobs.length - 50} more
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
                {/* Oven O1 */}
                <div
                    className={`bg-white rounded-lg shadow p-6 cursor-context-menu border-2 ${
                        ovenStates.O1 ? "border-orange-500" : "border-gray-400"
                    }`}
                    onContextMenu={(e) => handleRightClick(e, "oven", "O1")}
                    title="Right-click to toggle oven"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div
                                className={`w-4 h-4 rounded-full ${
                                    ovenStates.O1
                                        ? "bg-green-500 animate-pulse"
                                        : "bg-red-500"
                                }`}
                            />
                            <h2 className="text-xl font-bold text-orange-700">
                                🔥 Oven O1
                            </h2>
                        </div>
                        <span
                            className={`text-xs px-3 py-1 rounded font-semibold ${
                                ovenStates.O1
                                    ? "bg-green-100 text-green-700"
                                    : "bg-red-100 text-red-700"
                            }`}
                        >
                            {ovenStates.O1 ? "🟢 ACTIVE" : "🔴 INACTIVE"}
                        </span>
                    </div>
                </div>

                {/* Oven O2 */}
                <div
                    className={`bg-white rounded-lg shadow p-6 cursor-context-menu border-2 ${
                        ovenStates.O2 ? "border-blue-500" : "border-gray-400"
                    }`}
                    onContextMenu={(e) => handleRightClick(e, "oven", "O2")}
                    title="Right-click to toggle oven"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div
                                className={`w-4 h-4 rounded-full ${
                                    ovenStates.O2
                                        ? "bg-green-500 animate-pulse"
                                        : "bg-red-500"
                                }`}
                            />
                            <h2 className="text-xl font-bold text-blue-700">
                                🔥 Oven O2
                            </h2>
                        </div>
                        <span
                            className={`text-xs px-3 py-1 rounded font-semibold ${
                                ovenStates.O2
                                    ? "bg-green-100 text-green-700"
                                    : "bg-red-100 text-red-700"
                            }`}
                        >
                            {ovenStates.O2 ? "🟢 ACTIVE" : "🔴 INACTIVE"}
                        </span>
                    </div>
                </div>
            </div>
            {/* Buffer Lines - Divided by Oven */}
            <div className="grid grid-cols-2 gap-6">
                {/* O1 Buffers */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-bold text-orange-700 mb-4">
                        🏭 Oven O1 Buffers
                    </h2>
                    <div className="space-y-4">
                        {o1Buffers.map((bufferId) => {
                            const buffer = buffers[bufferId];
                            if (!buffer) return null;

                            const isActive =
                                buffer.input_available &&
                                buffer.output_available;

                            return (
                                <div
                                    key={bufferId}
                                    className={`border ${
                                        isActive
                                            ? "border-orange-200"
                                            : "border-gray-400 bg-gray-100"
                                    } rounded-lg p-3 cursor-context-menu`}
                                    onContextMenu={(e) =>
                                        handleRightClick(e, "buffer", bufferId)
                                    }
                                    title="Right-click to toggle buffer"
                                >
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-bold text-gray-800">
                                                {bufferId}
                                            </h4>
                                            <span
                                                className={`text-xs px-2 py-0.5 rounded ${
                                                    isActive
                                                        ? "bg-green-100 text-green-700"
                                                        : "bg-red-100 text-red-700"
                                                }`}
                                            >
                                                {isActive ? "🟢 ON" : "🔴 OFF"}
                                            </span>
                                        </div>
                                        <span
                                            className={`text-sm font-semibold ${
                                                buffer.occupancy >=
                                                buffer.capacity
                                                    ? "text-red-600"
                                                    : "text-green-600"
                                            }`}
                                        >
                                            {buffer.occupancy}/{buffer.capacity}
                                        </span>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                                        <div
                                            className={`h-2 rounded-full transition-all ${
                                                buffer.occupancy >=
                                                buffer.capacity
                                                    ? "bg-red-500"
                                                    : buffer.occupancy >=
                                                      buffer.capacity * 0.8
                                                    ? "bg-yellow-500"
                                                    : "bg-green-500"
                                            }`}
                                            style={{
                                                width: `${Math.min(
                                                    (buffer.occupancy /
                                                        buffer.capacity) *
                                                        100,
                                                    100
                                                )}%`,
                                            }}
                                        />
                                    </div>

                                    {/* Jobs in Queue */}
                                    <div className="flex flex-wrap gap-1 min-h-[40px] bg-gray-50 rounded p-2">
                                        {buffer.queue.map((job) => (
                                            <BigCarIcon
                                                key={job.id}
                                                color={job.color as any}
                                                size="small"
                                            />
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* O2 Buffers */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-bold text-blue-700 mb-4">
                        🏭 Oven O2 Buffers
                    </h2>
                    <div className="space-y-4">
                        {o2Buffers.map((bufferId) => {
                            const buffer = buffers[bufferId];
                            if (!buffer) return null;

                            const isActive =
                                buffer.input_available &&
                                buffer.output_available;

                            return (
                                <div
                                    key={bufferId}
                                    className={`border ${
                                        isActive
                                            ? "border-blue-200"
                                            : "border-gray-400 bg-gray-100"
                                    } rounded-lg p-3 cursor-context-menu`}
                                    onContextMenu={(e) =>
                                        handleRightClick(e, "buffer", bufferId)
                                    }
                                    title="Right-click to toggle buffer"
                                >
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-bold text-gray-800">
                                                {bufferId}
                                            </h4>
                                            <span
                                                className={`text-xs px-2 py-0.5 rounded ${
                                                    isActive
                                                        ? "bg-green-100 text-green-700"
                                                        : "bg-red-100 text-red-700"
                                                }`}
                                            >
                                                {isActive ? "🟢 ON" : "🔴 OFF"}
                                            </span>
                                        </div>
                                        <span
                                            className={`text-sm font-semibold ${
                                                buffer.occupancy >=
                                                buffer.capacity
                                                    ? "text-red-600"
                                                    : "text-green-600"
                                            }`}
                                        >
                                            {buffer.occupancy}/{buffer.capacity}
                                        </span>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                                        <div
                                            className={`h-2 rounded-full transition-all ${
                                                buffer.occupancy >=
                                                buffer.capacity
                                                    ? "bg-red-500"
                                                    : buffer.occupancy >=
                                                      buffer.capacity * 0.8
                                                    ? "bg-yellow-500"
                                                    : "bg-green-500"
                                            }`}
                                            style={{
                                                width: `${Math.min(
                                                    (buffer.occupancy /
                                                        buffer.capacity) *
                                                        100,
                                                    100
                                                )}%`,
                                            }}
                                        />
                                    </div>

                                    {/* Jobs in Queue */}
                                    <div className="flex flex-wrap gap-1 min-h-[40px] bg-gray-50 rounded p-2">
                                        {buffer.queue.map((job) => (
                                            <BigCarIcon
                                                key={job.id}
                                                color={job.color as any}
                                                size="small"
                                            />
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Final Sequence & Statistics */}
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">
                    Final Sequence & Statistics
                </h2>

                {/* Statistics */}
                <div className="grid grid-cols-4 gap-4 mb-4">
                    <div className="bg-purple-50 rounded-lg p-4">
                        <div className="text-sm text-gray-600">
                            Total Processed
                        </div>
                        <div className="text-3xl font-bold text-purple-700">
                            {finalSequence.length}
                        </div>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-4">
                        <div className="text-sm text-gray-600">
                            Initial Changeovers
                        </div>
                        <div className="text-3xl font-bold text-yellow-700">
                            {calculateInitialChangeovers()}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                            Original sequence
                        </div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                        <div className="text-sm text-gray-600">
                            Final Changeovers
                        </div>
                        <div className="text-3xl font-bold text-green-700">
                            {calculateFinalChangeovers()}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                            After optimization
                        </div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4">
                        <div className="text-sm text-gray-600">Improvement</div>
                        <div className="text-3xl font-bold text-blue-700">
                            {calculateInitialChangeovers() > 0
                                ? (
                                      (1 -
                                          calculateFinalChangeovers() /
                                              calculateInitialChangeovers()) *
                                      100
                                  ).toFixed(1)
                                : "0"}
                            %
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                            Reduction
                        </div>
                    </div>
                </div>

                {/* Final Sequence Display */}
                {finalSequence.length > 0 && (
                    <div>
                        <h3 className="text-sm font-semibold text-gray-600 mb-2">
                            Final Sequence (Last{" "}
                            {Math.min(finalSequence.length, 100)} jobs)
                        </h3>
                        <div className="bg-gray-50 rounded-lg p-4 max-h-48 overflow-y-auto">
                            <div className="flex flex-wrap gap-1">
                                {finalSequence.slice(-100).map((color, idx) => (
                                    <div
                                        key={idx}
                                        className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold text-white shadow-sm"
                                        style={{
                                            backgroundColor:
                                                COLOR_CODES[
                                                    color as keyof typeof COLOR_CODES
                                                ],
                                        }}
                                        title={color}
                                    >
                                        {color.replace("C", "")}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Context Menu */}
            {contextMenu.show && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    onClose={closeContextMenu}
                    actions={[
                        {
                            label:
                                contextMenu.type === "buffer"
                                    ? buffers[contextMenu.id]
                                          ?.input_available &&
                                      buffers[contextMenu.id]?.output_available
                                        ? "🛑 Close Buffer (Input & Output)"
                                        : "▶️ Open Buffer (Input & Output)"
                                    : contextMenu.type === "oven"
                                    ? state.plantState?.oven_states?.[
                                          contextMenu.id
                                      ]
                                        ? "🛑 Shut Down Oven"
                                        : "▶️ Start Oven"
                                    : state.plantState?.main_conveyor_busy
                                    ? "🛑 Stop Conveyor"
                                    : "▶️ Start Conveyor",
                            onClick: () => handleContextMenuAction("toggle"),
                            icon:
                                contextMenu.type === "buffer"
                                    ? buffers[contextMenu.id]
                                          ?.input_available &&
                                      buffers[contextMenu.id]?.output_available
                                        ? "🛑"
                                        : "▶️"
                                    : contextMenu.type === "oven"
                                    ? state.plantState?.oven_states?.[
                                          contextMenu.id
                                      ]
                                        ? "🛑"
                                        : "▶️"
                                    : state.plantState?.main_conveyor_busy
                                    ? "🛑"
                                    : "▶️",
                        },
                    ]}
                />
            )}
        </div>
    );
}
