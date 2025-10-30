#!/bin/bash

# Domo Query CLI Uninstallation Script
# Removes the installed Domo Query CLI from your system

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🗑️  Uninstalling Domo Query CLI..."

# Config directory
CONFIG_DIR="$HOME/.domo-cli"
METADATA_FILE="$CONFIG_DIR/installation.json"

# Check if metadata file exists
if [ -f "$METADATA_FILE" ]; then
    echo "📋 Reading installation metadata..."

    # Extract install path from metadata (using grep/sed for compatibility)
    INSTALL_PATH=$(grep -o '"installPath": "[^"]*"' "$METADATA_FILE" | sed 's/"installPath": "\(.*\)"/\1/')
    INSTALL_TYPE=$(grep -o '"installType": "[^"]*"' "$METADATA_FILE" | sed 's/"installType": "\(.*\)"/\1/')

    if [ -n "$INSTALL_PATH" ]; then
        echo "Found installation at: $INSTALL_PATH"
        echo "Installation type: $INSTALL_TYPE"

        # Check if the binary exists
        if [ -e "$INSTALL_PATH" ] || [ -L "$INSTALL_PATH" ]; then
            INSTALL_DIR=$(dirname "$INSTALL_PATH")

            # Remove the binary
            if [ -w "$INSTALL_DIR" ]; then
                rm -f "$INSTALL_PATH"
                echo -e "${GREEN}✓${NC} Removed binary from $INSTALL_PATH"
            else
                echo "⚠️  Need elevated privileges to remove from $INSTALL_DIR"
                sudo rm -f "$INSTALL_PATH"
                echo -e "${GREEN}✓${NC} Removed binary from $INSTALL_PATH"
            fi
        else
            echo -e "${YELLOW}⚠️  Binary not found at $INSTALL_PATH (may have been manually removed)${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Could not read installation path from metadata${NC}"
    fi
else
    # Try common installation locations
    echo -e "${YELLOW}ℹ️  No installation metadata found. Checking common locations...${NC}"

    COMMON_LOCATIONS=(
        "$HOME/.local/bin/domo-query-cli"
        "$HOME/bin/domo-query-cli"
        "/usr/local/bin/domo-query-cli"
    )

    FOUND=false
    for location in "${COMMON_LOCATIONS[@]}"; do
        if [ -e "$location" ] || [ -L "$location" ]; then
            echo "Found installation at: $location"
            INSTALL_DIR=$(dirname "$location")

            if [ -w "$INSTALL_DIR" ]; then
                rm -f "$location"
                echo -e "${GREEN}✓${NC} Removed binary from $location"
            else
                echo "⚠️  Need elevated privileges to remove from $INSTALL_DIR"
                sudo rm -f "$location"
                echo -e "${GREEN}✓${NC} Removed binary from $location"
            fi
            FOUND=true
        fi
    done

    if [ "$FOUND" = false ]; then
        echo -e "${YELLOW}⚠️  No installation found in common locations${NC}"
    fi
fi

# Ask about config directory
echo ""
echo "Configuration directory: $CONFIG_DIR"
if [ -d "$CONFIG_DIR" ]; then
    read -p "Do you want to remove the configuration directory? (includes .env and cache) [y/N]: " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf "$CONFIG_DIR"
        echo -e "${GREEN}✓${NC} Removed configuration directory"
    else
        # Just remove the metadata file
        if [ -f "$METADATA_FILE" ]; then
            rm -f "$METADATA_FILE"
            echo -e "${GREEN}✓${NC} Removed installation metadata (keeping configuration files)"
        fi
    fi
else
    echo -e "${YELLOW}ℹ️  Configuration directory not found${NC}"
fi

echo ""
echo -e "${GREEN}✅ Uninstallation complete!${NC}"
echo ""
echo "If you reinstall later, your configuration will be preserved (unless you deleted it)."
