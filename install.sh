#!/bin/bash

# Domo Query CLI Installation Script
# This script installs the Domo Query CLI globally on your system

set -e

echo "🚀 Installing Domo Query CLI..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed.${NC}"
    echo "Please install Node.js first: https://nodejs.org/"
    exit 1
fi

# Check if yarn is installed
if ! command -v yarn &> /dev/null; then
    echo -e "${YELLOW}Warning: Yarn is not installed. Installing via npm...${NC}"
    npm install -g yarn
fi

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "📦 Installing dependencies..."
yarn install

echo "🔨 Building the project..."
yarn build

echo "📁 Creating global installation..."

# Determine the installation directory based on OS
if [[ "$OSTYPE" == "darwin"* ]] || [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # macOS or Linux
    INSTALL_DIR="/usr/local/bin"
    CONFIG_DIR="$HOME/.domo-cli"
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    # Windows (Git Bash or Cygwin)
    INSTALL_DIR="/c/Program Files/domo-cli"
    CONFIG_DIR="$USERPROFILE/.domo-cli"
    mkdir -p "$INSTALL_DIR"
else
    echo -e "${RED}Unsupported operating system: $OSTYPE${NC}"
    exit 1
fi

# Create config directory
mkdir -p "$CONFIG_DIR"

# Create a wrapper script for the CLI
cat > "$INSTALL_DIR/domo-query-cli" << EOF
#!/bin/bash
# Domo Query CLI wrapper script
export NODE_PATH="$SCRIPT_DIR/node_modules"
cd "$SCRIPT_DIR" && node "$SCRIPT_DIR/dist/main.js" "\$@"
EOF

# Make the wrapper executable
chmod +x "$INSTALL_DIR/domo-query-cli"

# Copy .env.example to config directory if it doesn't exist
if [ ! -f "$CONFIG_DIR/.env" ]; then
    echo "📝 Creating configuration file..."
    cp "$SCRIPT_DIR/.env.example" "$CONFIG_DIR/.env"
    echo -e "${YELLOW}Please edit $CONFIG_DIR/.env with your Domo API credentials${NC}"
fi

# Create a symlink for the .env file in the project directory
if [ ! -f "$SCRIPT_DIR/.env" ]; then
    ln -sf "$CONFIG_DIR/.env" "$SCRIPT_DIR/.env"
fi

echo -e "${GREEN}✅ Installation complete!${NC}"
echo ""
echo "The Domo Query CLI has been installed globally."
echo ""
echo "📋 Next steps:"
echo "1. Edit your configuration: $CONFIG_DIR/.env"
echo "2. Run the CLI in interactive mode: domo-query-cli"
echo "3. Or use non-interactive mode: domo-query-cli --help"
echo ""
echo "📚 Example commands:"
echo "  domo-query-cli                                    # Start interactive mode"
echo "  domo-query-cli --help                             # Show help"
echo "  domo-query-cli --command list-datasets            # List all datasets"
echo "  domo-query-cli -c list-dataflows --format json    # List dataflows as JSON"
echo ""
echo "For Claude Desktop integration, the CLI is now available at:"
echo "  $INSTALL_DIR/domo-query-cli"