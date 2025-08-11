# Essential Commands for Hotel Inventory Development

## Development Commands

### Start & Build
```bash
# Start development server (main command)
npm start                    # Starts React dev server on localhost:3000

# Build for production
npm run build               # Creates optimized production build

# Run tests
npm test                    # Runs React Testing Library tests
```

### Package Management
```bash
# Install dependencies
npm install                 # Install all package.json dependencies

# Add new dependencies
npm install <package-name>  # Add production dependency
npm install -D <package-name> # Add development dependency
```

## Croatian Fiscalization Testing
```bash
# Core fiscal validation scripts
node scripts/validate-zki-algorithm.js              # Validate ZKI algorithm against Hotel Porec data
node scripts/corrected-croatian-soap.js             # Test corrected SOAP XML (s004 error resolved)
node scripts/real-soap-test.js                      # Test actual Croatian Tax Authority communication
node scripts/check-all-certificates.js              # Analyze FINA certificates for demo/production

# Comprehensive fiscal testing
node scripts/final-fiscalization-test.js            # Complete fiscal integration test
node scripts/test-updated-fiscalization.js          # Updated fiscalization workflow
node scripts/test-exact-validated-zki.js            # Exact ZKI validation test
```

## Database & Supabase Commands
```bash
# Supabase CLI (if installed)
supabase start              # Start local Supabase instance
supabase db push            # Push schema changes to remote
supabase db pull            # Pull schema changes from remote
supabase functions deploy   # Deploy edge functions

# Database migration preparation (when ready for Supabase migration)
# Run from project root - these will be the critical commands for Phase 4
```

## Git Commands (macOS Darwin)
```bash
# Basic Git workflow
git status                  # Check working directory status
git add .                   # Stage all changes
git add <file>              # Stage specific file
git commit -m "message"     # Commit with message
git push origin main        # Push to main branch

# Branch management
git checkout -b feature/branch-name    # Create and switch to new branch
git checkout main                      # Switch to main branch
git merge feature/branch-name          # Merge feature branch

# View commit history
git log --oneline           # Compact commit history
git log --graph             # Visual branch history
```

## macOS System Commands
```bash
# File and directory operations (macOS Darwin)
ls -la                      # List files with details
cd <directory>              # Change directory
mkdir <directory>           # Create directory
cp -r <source> <dest>       # Copy files/directories recursively
mv <source> <dest>          # Move/rename files

# File content and search
cat <file>                  # Display file contents
grep -r "pattern" src/      # Search for pattern in src directory
find . -name "*.tsx"        # Find TypeScript React files
find . -type f -name "*.ts" # Find TypeScript files
```

## Hotel System Specific Commands

### Local Development
```bash
# Environment setup
cp .env.example .env.local  # Copy environment template
# Edit .env.local with Supabase credentials

# Hotel data validation
node -e "console.log('Hotel rooms:', require('./src/lib/hotel/hotelData.ts'))"
```

### Testing Hotel Features
```bash
# Test email system
npm start                   # Start dev server
# Navigate to: http://localhost:3000/hotel/frontdesk/email-test

# Test fiscal integration  
node scripts/test-fiscal-integration.js    # Test complete fiscal workflow
```

## Utility Commands
```bash
# Process management
ps aux | grep node          # Find running Node processes
kill -9 <pid>               # Force kill process by PID
lsof -i :3000               # Check what's using port 3000

# System information
uname -a                    # System information
node --version              # Node.js version
npm --version               # npm version
```

## Development Workflow Commands

### Daily Development
```bash
# Morning routine
git pull origin main        # Get latest changes
npm install                 # Update dependencies if needed
npm start                   # Start development

# Feature development
git checkout -b feature/new-feature
# Make changes
npm test                    # Run tests
git add .
git commit -m "feat: add new feature"
git push origin feature/new-feature
```

### Task Management
```bash
# Check current status (following CLAUDE.md instructions)
cat tasks/todo.md           # Review current plan and progress
```

### Code Quality
```bash
# TypeScript compilation check
npx tsc --noEmit           # Check for TypeScript errors without building

# Dependency audit
npm audit                  # Check for security vulnerabilities
npm audit fix              # Fix automatically fixable vulnerabilities
```

## Quick Problem Solving
```bash
# Clear npm cache if issues
npm cache clean --force

# Reset node_modules if dependency issues  
rm -rf node_modules
rm package-lock.json
npm install

# Check port conflicts
lsof -i :3000
kill -9 $(lsof -t -i:3000)  # Kill process on port 3000
```

## Essential Paths to Remember
- **Main App**: `src/App.tsx`
- **Hotel Components**: `src/components/hotel/`
- **Service Layer**: `src/lib/services/`
- **Types**: `src/lib/hotel/types.ts`
- **Supabase Config**: `src/lib/supabase.ts`
- **Fiscal System**: `src/lib/fiscalization/`
- **Hotel Data**: `src/lib/hotel/hotelData.ts`
- **Todo/Tasks**: `tasks/todo.md`

These commands support the complete development workflow for the hotel inventory management system with clean architecture patterns and Croatian fiscal compliance.