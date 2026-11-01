@echo off
echo Demarrage de l'application Gestion Pointage...
echo.

:: Demarrer le backend
start "Backend" cmd /k "cd backend && node server.js"

:: Attendre 3 secondes
timeout /t 3 /nobreak > nul

:: Demarrer le frontend
start "Frontend" cmd /k "cd frontend && npm start"

:: Attendre 5 secondes
timeout /t 5 /nobreak > nul

:: Demarrer ngrok sur le frontend
start "Ngrok" cmd /k "npx ngrok http 3000"

echo.
echo Tout est demarre !
echo 1. Attends que ngrok affiche l'URL HTTPS
echo 2. Copie l'URL (ex: https://abc123.ngrok-free.app)
echo 3. Mets a jour FRONTEND_URL dans backend/.env
echo 4. Redemarrer le backend avec cette URL
echo.
pause
