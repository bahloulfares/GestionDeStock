@echo off
chcp 65001 > nul
echo ===================================================
echo   Démarrage de StockTN (Base, Backend et Frontend)
echo ===================================================

echo [1/3] Vérification de la base de données PostgreSQL...
docker compose up -d postgres

echo [2/3] Démarrage du Backend NestJS (Port 3000)...
start "StockTN Backend" cmd /k "cd /d %~dp0backend && npm run start:dev"

echo [3/3] Démarrage du Frontend React Vite (Port 5173)...
start "StockTN Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ===================================================
echo   StockTN est en cours de démarrage !
echo   - Frontend : http://localhost:5173
echo   - Backend  : http://localhost:3000/api
echo   - Swagger  : http://localhost:3000/api/docs
echo ===================================================
timeout /t 5 > nul
start http://localhost:5173

