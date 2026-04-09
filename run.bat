@echo off
echo ==========================================
echo    AI Dev Team Multi-Agent Orchestrator
echo ==========================================
echo.

echo Launching MCP Server...
start "MCP Server" cmd /k "node mcp-server.js"

echo Launching Beautiful UI Dashboard...
start "UI Dashboard" cmd /k "node dashboard.js"

echo.
echo Services launched!
timeout /t 2 >nul
explorer "http://localhost:3000"
pause
