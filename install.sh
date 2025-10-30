#!/bin/bash

# Domo Query CLI Installation Script
# This script installs the Domo Query CLI globally on your system

set -e

# Parse command line arguments
USE_SYMLINK=false
SHOW_HELP=false

for arg in "$@"; do
    case $arg in
        --symlink|--dev)
            USE_SYMLINK=true
            shift
            ;;
        --help|-h)
            SHOW_HELP=true
            shift
            ;;
        *)
            ;;
    esac
done

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Show help if requested
if [ "$SHOW_HELP" = true ]; then
    echo "Domo Query CLI Installation Script"
    echo ""
    echo "Usage: ./install.sh [options]"
    echo ""
    echo "Options:"
    echo "  --symlink, --dev    Create a symlink instead of copying the binary"
    echo "                      (recommended for development - auto-updates on rebuild)"
    echo "  --help, -h          Show this help message"
    echo ""
    echo "Installation modes:"
    echo "  Copy mode (default): Copies the binary to the install directory"
    echo "                       Requires manual reinstall after rebuilding"
    echo ""
    echo "  Symlink mode:        Creates a symlink to the repository binary"
    echo "                       Auto-updates when you run 'yarn build:dist'"
    echo "                       Recommended for developers"
    echo ""
    exit 0
fi

if [ "$USE_SYMLINK" = true ]; then
    echo "🔗 Installing Domo Query CLI (symlink mode - auto-updating)..."
else
    echo "🚀 Installing Domo Query CLI..."
fi

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
yarn build:dist

echo "📁 Creating global installation..."

# Determine the installation directory based on OS
if [[ "$OSTYPE" == "darwin"* ]] || [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # macOS or Linux
    # Try to use user's local bin first, fall back to /usr/local/bin
    if [ -d "$HOME/.local/bin" ]; then
        INSTALL_DIR="$HOME/.local/bin"
    elif [ -d "$HOME/bin" ]; then
        INSTALL_DIR="$HOME/bin"
    else
        INSTALL_DIR="/usr/local/bin"
    fi
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

# Create the install directory if it doesn't exist and we have write access
if [ ! -d "$INSTALL_DIR" ] && [[ "$INSTALL_DIR" == "$HOME"* ]]; then
    echo "Creating installation directory: $INSTALL_DIR"
    mkdir -p "$INSTALL_DIR"
fi

# Create config directory
mkdir -p "$CONFIG_DIR"

# Determine the binary name based on OS
if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    BINARY_NAME="domo-query-cli.exe"
else
    BINARY_NAME="domo-query-cli"
fi

# Check if pre-built binary exists in release directory
if [ -f "$SCRIPT_DIR/release/$BINARY_NAME" ]; then
    if [ "$USE_SYMLINK" = true ]; then
        echo "Creating symlink to repository binary..."

        # Remove existing file/symlink if present
        if [ -e "$INSTALL_DIR/domo-query-cli" ] || [ -L "$INSTALL_DIR/domo-query-cli" ]; then
            if [ -w "$INSTALL_DIR" ]; then
                rm -f "$INSTALL_DIR/domo-query-cli"
            else
                echo "⚠️  Need elevated privileges to remove existing installation"
                sudo rm -f "$INSTALL_DIR/domo-query-cli"
            fi
        fi

        # Create symlink to the binary
        if [ -w "$INSTALL_DIR" ]; then
            ln -sf "$SCRIPT_DIR/release/$BINARY_NAME" "$INSTALL_DIR/domo-query-cli"
        else
            echo "⚠️  Need elevated privileges to install to $INSTALL_DIR"
            echo "Creating symlink with sudo..."
            sudo ln -sf "$SCRIPT_DIR/release/$BINARY_NAME" "$INSTALL_DIR/domo-query-cli"
        fi

        # Ensure binary is executable
        chmod +x "$SCRIPT_DIR/release/$BINARY_NAME"
    else
        echo "Installing pre-built binary..."

        # Copy the binary to the installation directory
        if [ -w "$INSTALL_DIR" ]; then
            cp "$SCRIPT_DIR/release/$BINARY_NAME" "$INSTALL_DIR/domo-query-cli"
            chmod +x "$INSTALL_DIR/domo-query-cli"
        else
            echo "⚠️  Need elevated privileges to install to $INSTALL_DIR"
            echo "Installing binary with sudo..."
            sudo cp "$SCRIPT_DIR/release/$BINARY_NAME" "$INSTALL_DIR/domo-query-cli"
            sudo chmod +x "$INSTALL_DIR/domo-query-cli"
        fi
    fi
else
    echo -e "${RED}Error: Pre-built binary not found at $SCRIPT_DIR/release/$BINARY_NAME${NC}"
    echo "The build:dist command may have failed. Please check the build output."
    exit 1
fi

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

# Save installation metadata
METADATA_FILE="$CONFIG_DIR/installation.json"
INSTALL_TYPE="copy"
if [ "$USE_SYMLINK" = true ]; then
    INSTALL_TYPE="symlink"
fi

cat > "$METADATA_FILE" << EOF
{
  "installType": "$INSTALL_TYPE",
  "installDir": "$INSTALL_DIR",
  "installPath": "$INSTALL_DIR/domo-query-cli",
  "repositoryPath": "$SCRIPT_DIR",
  "binaryPath": "$SCRIPT_DIR/release/$BINARY_NAME",
  "installedAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "version": "$(cd "$SCRIPT_DIR" && git describe --tags --always 2>/dev/null || echo "unknown")"
}
EOF

echo -e "${GREEN}✅ Installation complete!${NC}"
echo ""
if [ "$USE_SYMLINK" = true ]; then
    echo "The Domo Query CLI has been symlinked to: $INSTALL_DIR/domo-query-cli"
    echo "  → Points to: $SCRIPT_DIR/release/$BINARY_NAME"
    echo ""
    echo -e "${BLUE}ℹ️  Auto-update enabled:${NC}"
    echo "   The CLI will automatically update when you run 'yarn build:dist'"
else
    echo "The Domo Query CLI has been installed to: $INSTALL_DIR"
fi
echo ""

# Check if the install directory is in PATH
if [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
    echo -e "${YELLOW}⚠️  Note: $INSTALL_DIR is not in your PATH${NC}"
    echo ""
    echo "To add it to your PATH, add this line to your shell config file:"
    if [[ "$SHELL" == *"zsh"* ]]; then
        echo "  echo 'export PATH=\"$INSTALL_DIR:\$PATH\"' >> ~/.zshrc"
        echo "  source ~/.zshrc"
    elif [[ "$SHELL" == *"bash"* ]]; then
        echo "  echo 'export PATH=\"$INSTALL_DIR:\$PATH\"' >> ~/.bashrc"
        echo "  source ~/.bashrc"
    else
        echo "  export PATH=\"$INSTALL_DIR:\$PATH\""
    fi
    echo ""
fi

echo "📋 Next steps:"
echo "1. Edit your configuration: $CONFIG_DIR/.env"
if [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
    echo "2. Add $INSTALL_DIR to your PATH (see above)"
    echo "3. Run the CLI: domo-query-cli"
else
    echo "2. Run the CLI in interactive mode: domo-query-cli"
    echo "3. Or use non-interactive mode: domo-query-cli --help"
fi
echo ""
echo "📚 Example commands:"
echo "  domo-query-cli                                    # Start interactive mode"
echo "  domo-query-cli --help                             # Show help"
echo "  domo-query-cli --command list-datasets            # List all datasets"
echo "  domo-query-cli -c list-dataflows --format json    # List dataflows as JSON"
echo ""
if [ "$USE_SYMLINK" = true ]; then
    echo "🔄 Development workflow:"
    echo "  After making changes, simply run 'yarn build:dist' and the installed"
    echo "  CLI will automatically use the new version (no reinstall needed)."
    echo ""
fi
echo "For Claude Desktop integration, the CLI is now available at:"
echo "  $INSTALL_DIR/domo-query-cli"