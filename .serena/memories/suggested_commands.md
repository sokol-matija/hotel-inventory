# Essential Commands for Hotel Inventory Project

## Development Commands
```bash
# Start development server
npm start

# Build for production
npm run build  

# Run tests
npm test

# Install dependencies
npm install
```

## Git Commands (macOS Darwin)
```bash
# Check status
git status

# Add changes
git add .

# Commit changes  
git commit -m "message"

# Push changes
git push origin main

# Pull latest changes
git pull origin main
```

## System Commands (Darwin/macOS)
```bash
# List files/directories
ls -la

# Change directory
cd path/to/directory

# Find files
find . -name "*.tsx"

# Search in files  
grep -r "search term" src/

# View file contents
cat filename.tsx

# Edit files
code filename.tsx  # VS Code
vim filename.tsx   # Vim
```

## Project Specific Commands
```bash
# Navigate to project
cd ~/Dev/Repos/2-Personal/hotel-inventory

# Install new package
npm install package-name

# View logs 
tail -f build/static/js/*.js
```

## Supabase/Database Commands
No direct CLI commands - managed through Supabase dashboard at https://supabase.com

## Deployment Commands
```bash
# Deploy to Vercel (if configured)
npm run build
# Then deploy through Vercel dashboard or CLI
```