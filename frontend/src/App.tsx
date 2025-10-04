import { useControlledSimulation } from './hooks/useControlledSimulation';
import { GenerationControls, SimulationControls, EnhancedSimulationDisplay } from './components';

function App() {
  const {
    state,
    generatedJobCount,
    isGenerated,
    isSimulating,
    isDraining,
    generateJobs,
    startSimulation,
    stopSimulation,
    resetSimulation,
    handleToggleOven,
    handleToggleBufferLine,
    handleToggleMainConveyor,
  } = useControlledSimulation();

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-['Inter']">
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-800 text-center">
          🚗 Smart Vehicle Sequencing - Paint Shop Simulation
        </h1>
        
        <GenerationControls
          onGenerate={generateJobs}
          onReset={resetSimulation}
          isGenerated={isGenerated}
          generatedCount={generatedJobCount}
        />

        <SimulationControls
          isGenerated={isGenerated}
          isSimulating={isSimulating}
          isDraining={isDraining}
          onStart={startSimulation}
          onStop={stopSimulation}
          generatedJobCount={generatedJobCount}
        />
        
        <EnhancedSimulationDisplay 
          state={state}
          onToggleOven={handleToggleOven}
          onToggleBufferLine={handleToggleBufferLine}
          onToggleMainConveyor={handleToggleMainConveyor}
        />
      </div>
    </div>
  );
}

export default App;