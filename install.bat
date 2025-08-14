@echo off
REM Domo Query CLI Installation Script for Windows
REM This script installs the Domo Query CLI globally on Windows

echo Installing Domo Query CLI...

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed.
    echo Please install Node.js first: https://nodejs.org/
    exit /b 1
)

REM Check if yarn is installed
where yarn >nul 2>nul
if %errorlevel% neq 0 (
    echo Warning: Yarn is not installed. Installing via npm...
    call npm install -g yarn
)

REM Get the directory where this script is located
set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%"

echo Installing dependencies...
call yarn install

echo Building the project...
call yarn build

echo Creating global installation...

REM Set installation directories
set INSTALL_DIR=%ProgramFiles%\domo-cli
set CONFIG_DIR=%USERPROFILE%\.domo-cli

REM Create directories
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"
if not exist "%CONFIG_DIR%" mkdir "%CONFIG_DIR%"

REM Create a batch wrapper for the CLI
echo @echo off > "%INSTALL_DIR%\domo-query-cli.bat"
echo set NODE_PATH=%SCRIPT_DIR%\node_modules >> "%INSTALL_DIR%\domo-query-cli.bat"
echo cd /d "%SCRIPT_DIR%" >> "%INSTALL_DIR%\domo-query-cli.bat"
echo node "%SCRIPT_DIR%\dist\main.js" %%* >> "%INSTALL_DIR%\domo-query-cli.bat"

REM Copy .env.example to config directory if it doesn't exist
if not exist "%CONFIG_DIR%\.env" (
    echo Creating configuration file...
    copy "%SCRIPT_DIR%\.env.example" "%CONFIG_DIR%\.env"
    echo Please edit %CONFIG_DIR%\.env with your Domo API credentials
)

REM Create a copy of .env in the project directory if it doesn't exist
if not exist "%SCRIPT_DIR%\.env" (
    copy "%CONFIG_DIR%\.env" "%SCRIPT_DIR%\.env"
)

REM Add to PATH if not already there
echo %PATH% | find /i "%INSTALL_DIR%" > nul
if %errorlevel% neq 0 (
    echo Adding to PATH...
    setx PATH "%PATH%;%INSTALL_DIR%"
    echo.
    echo NOTE: You may need to restart your terminal for PATH changes to take effect.
)

echo.
echo Installation complete!
echo.
echo The Domo Query CLI has been installed globally.
echo.
echo Next steps:
echo 1. Edit your configuration: %CONFIG_DIR%\.env
echo 2. Restart your terminal (if this is your first installation)
echo 3. Run the CLI in interactive mode: domo-query-cli
echo 4. Or use non-interactive mode: domo-query-cli --help
echo.
echo Example commands:
echo   domo-query-cli                                    # Start interactive mode
echo   domo-query-cli --help                             # Show help
echo   domo-query-cli --command list-datasets            # List all datasets
echo   domo-query-cli -c list-dataflows --format json    # List dataflows as JSON
echo.
echo For Claude Desktop integration, the CLI is now available at:
echo   %INSTALL_DIR%\domo-query-cli.bat