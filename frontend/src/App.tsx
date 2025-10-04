import { useControlledSimulation } from './hooks/useControlledSimulation';
import { GenerationControls, SimulationControls, EnhancedSimulationDisplay } from './components';
import { FaCarSide } from 'react-icons/fa6';

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
    <div className="min-h-screen bg-slate-900 p-4 md:p-6 font-['Inter']">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-2">
            <FaCarSide className="text-4xl md:text-5xl text-blue-400" />
            <h1 className="text-4xl md:text-5xl font-bold text-slate-100">
              Smart Vehicle Sequencing
            </h1>
          </div>
          <p className="text-slate-400">Paint Shop Optimization System</p>
        </div>
        
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