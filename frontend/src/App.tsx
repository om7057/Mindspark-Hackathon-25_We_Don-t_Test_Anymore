import { useControlledSimulation } from './hooks/useControlledSimulation';
import { GenerationControls } from './components/GenerationControls';
import { VisualSimulationDisplay } from './components/VisualSimulationDisplay';
// import './App.css';

function App() {
  const {
    state,
    generatedVehicleCount,
    isGenerated,
    generateVehicles,
    startSimulation,
    stopSimulation,
    resetSimulation,
    toggleOven,
    toggleBufferLine,
    toggleMainConveyor
  } = useControlledSimulation();

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-['Inter']">
      <div className="max-w-7xl mx-auto space-y-6">
        <GenerationControls
          onGenerate={generateVehicles}
          onStart={startSimulation}
          onStop={stopSimulation}
          onReset={resetSimulation}
          isGenerated={isGenerated}
          isRunning={state.isRunning}
          generatedCount={generatedVehicleCount}
        />
        
        <VisualSimulationDisplay
          state={state}
          onToggleOven={toggleOven}
          onToggleBufferLine={toggleBufferLine}
          onToggleMainConveyor={toggleMainConveyor}
        />
      </div>
    </div>
  );
}

export default App;
