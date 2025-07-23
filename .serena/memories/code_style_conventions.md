# Code Style & Conventions

## TypeScript Configuration
- **Strict mode enabled**: Full TypeScript strict checks
- **ES2022 target**: Modern JavaScript features
- **Path aliases**: `@/*` maps to `src/*` for cleaner imports
- **JSX**: Uses React 19's JSX transform

## Code Style
- **Function Components**: All components use functional approach with hooks
- **TypeScript**: Comprehensive typing with interfaces for props and data structures
- **Naming Conventions**:
  - Components: PascalCase (e.g., `LocationsPage`, `AddItemDialog`)
  - Files: PascalCase for components, camelCase for utilities
  - Variables/Functions: camelCase
  - Constants: UPPER_SNAKE_CASE
  - Types/Interfaces: PascalCase

## Component Patterns
- **Props interfaces**: Every component has typed props interface (e.g., `AddLocationDialogProps`)
- **Default exports**: Components use default exports
- **Destructured props**: Props are destructured in function parameters
- **Conditional rendering**: Uses JSX conditional expressions `{condition && <Component />}`
- **Event handlers**: Named with `handle` prefix (e.g., `handleSubmit`, `handleTypeChange`)

## Import Conventions
- **React imports**: `import React from 'react'`
- **Relative imports**: Use `@/` alias for src directory
- **Third party first**: External libraries imported before internal modules
- **Component imports**: UI components imported with destructuring when needed

## Styling Approach
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: Pre-built accessible components
- **CSS Variables**: Uses HSL color variables for theming
- **Responsive Design**: Mobile-first approach with responsive classes
- **Conditional Classes**: Uses `cn()` utility for conditional class merging