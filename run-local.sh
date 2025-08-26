#!/bin/bash

# Local runner script - Alternative to packaged executable
# This script runs the compiled JavaScript directly with Node.js

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Check if dist/main.js exists
if [ ! -f "$SCRIPT_DIR/dist/main.js" ]; then
    echo "Error: dist/main.js not found. Please run 'yarn build' first."
    exit 1
fi

# Run the compiled JavaScript with Node.js
exec node "$SCRIPT_DIR/dist/main.js" "$@"