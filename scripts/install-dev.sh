#!/bin/bash

# Domo Query CLI - Developer Installation Script
# Convenience wrapper for installing in symlink mode (auto-updating)

set -e

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Colors for output
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔗 Installing Domo Query CLI for development (symlink mode)${NC}"
echo ""
echo "This will create a symlink that auto-updates when you run 'yarn build:dist'"
echo ""

# Run the main install script with --symlink flag
"$PROJECT_ROOT/install.sh" --symlink

echo ""
echo "✨ Developer installation complete!"
echo ""
echo "💡 Quick tip: Any time you rebuild with 'yarn build:dist', the globally"
echo "   installed CLI will automatically use the new version."
