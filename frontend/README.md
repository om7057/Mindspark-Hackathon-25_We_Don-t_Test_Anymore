# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

# Smart Sequencing for Conveyor & Buffer Management

A comprehensive real-time simulation of an automotive paint shop conveyor system with intelligent scheduling algorithms.

## Features

### 🚗 Visual Simulation
- **Animated car icons** with different colors representing vehicle bodies
- **Real-time conveyor belt animations** showing vehicle movement
- **Visual flow display** from input buffer → ovens → buffer lines → main conveyor → completion
- **Interactive controls** for starting/stopping components
- **Delay and timing simulations** with configurable speed

### 🏭 System Components

#### Input Buffer
- Capacity: 120 vehicle bodies
- Random color distribution based on production percentages
- Real-time vehicle generation

#### Ovens (O1 & O2)
- Simultaneous operation capability
- Processing time simulation (3 seconds default)
- Start/stop individual oven controls
- Visual progress indicators

#### Buffer Lines
- **L1-L4**: Capacity 14 vehicles each (Oven 1 output)
- **L5-L9**: Capacity 16 vehicles each (Oven 2 output)
- Individual line activation/deactivation
- Overflow prevention and warnings
- Visual capacity utilization

#### Main Conveyor
- Picks from buffer lines using configurable algorithms
- Controlled picking speed with delays
- Transport to Top Coat Oven simulation

### 🎯 Intelligent Algorithms

#### Input Algorithms
- **Random**: Generates vehicles randomly based on color percentages
- **Balanced**: Maintains exact color distribution percentages
- **Priority**: Priority-based generation (extensible)

#### Output Algorithms
- **FIFO**: First In, First Out
- **Color Grouping**: Minimizes color changeovers by grouping similar colors
- **Shortest Queue**: Picks from buffer with least vehicles
- **Priority**: Custom priority-based selection (extensible)

### 📊 Analytics & Monitoring

#### Real-time Statistics
- **Jobs Per Hour (JPH)**: Throughput measurement
- **Buffer Utilization**: Percentage of total buffer capacity used
- **Color Changeovers**: Count of color changes (efficiency metric)
- **Average Wait Time**: Vehicle processing time
- **Total Completed**: Vehicles successfully processed

#### Color Distribution Analysis
- Target vs. actual percentage comparison
- Visual progress bars with deviation indicators
- Real-time accuracy monitoring

#### System Alerts
- Buffer overflow warnings
- Inactive component notifications
- Efficiency recommendations
- Utilization insights

### 🎮 Interactive Controls

#### Two View Modes
1. **Visual Flow View**: Animated simulation with car movements
2. **Control Panel View**: Detailed component management

#### Quick Controls
- Start/Stop simulation
- Reset system
- Add vehicles to input buffer
- Adjust simulation speed (0.1x to 5x)
- Toggle ovens and main conveyor

#### Advanced Configuration
- Algorithm selection (input/output)
- Color grouping prioritization
- Overflow prevention settings
- Changeover minimization

### 🎨 Color System
12 different vehicle colors with realistic production percentages:
- C1: 40% (Red)
- C2: 25% (Blue)
- C3: 12% (Green)
- C4: 8% (Yellow)
- C5-C12: 1-3% each (Various colors)

### 🚀 Technical Features

#### Performance
- Optimized React hooks for state management
- Efficient animation system
- Real-time updates without blocking UI
- Configurable simulation speed

#### Extensibility
- Pluggable algorithm architecture
- Easy to add new scheduling algorithms
- Modular component design
- Type-safe TypeScript implementation

#### User Experience
- Responsive design for all screen sizes
- Intuitive visual feedback
- Real-time system status indicators
- Smooth animations and transitions

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development server:
   ```bash
   npm run dev
   ```

3. Open browser and navigate to the local development URL

## Usage Tips

1. **Start with Visual Flow View** to see the animated simulation
2. **Use quick controls** to start ovens and main conveyor
3. **Add vehicles** to see the system in action
4. **Adjust speed** to observe timing effects
5. **Switch to Control Panel View** for detailed configuration
6. **Monitor alerts** for system optimization opportunities

## Algorithm Customization

The system is designed to be easily extensible. New algorithms can be added by:

1. Implementing the `InputAlgorithm` or `OutputAlgorithm` interfaces
2. Adding to the `AlgorithmFactory`
3. Updating the UI controls

This makes it perfect for testing different optimization strategies and comparing their effectiveness.

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
