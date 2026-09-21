@echo off
title Albion Crafting Calculator
color 0A
echo.
echo  ============================================================
echo   ALBION CRAFTING CALCULATOR - URUCHAMIANIE
echo  ============================================================
echo.

:: Sprawdz czy node jest dostepny
where node >nul 2>&1
if errorlevel 1 (
    color 0C
    echo  [BLAD] Node.js nie jest zainstalowany lub nie jest w PATH!
    echo  Pobierz ze strony: https://nodejs.org
    pause
    exit /b 1
)

:: Sprawdz czy pobrano zaleznosci (pierwsze uruchomienie)
if not exist "%~dp0albion-craft-calculator\node_modules" (
    echo.
    echo  [Pierwsze uruchomienie] Trwa instalowanie bibliotek aplikacji...
    echo  To potrwa okolo 30-60 sekund. Prosimy o cierpliwosc.
    echo.
    cd /d "%~dp0albion-craft-calculator"
    call npm install
    cd /d "%~dp0"
    echo.
    echo  [OK] Biblioteki zainstalowane pomyslnie!
    echo.
)

echo  [1/3] Uruchamiam Bridge (mostek pakietow)...
start "Albion Bridge" cmd /k "cd /d ""%~dp0albion-craft-calculator"" && node bridge.cjs"
timeout /t 2 /nobreak >nul

echo  [2/3] Uruchamiam Sniffer (prywatne przechwytywanie cen z gry)...
start "Albion Sniffer" cmd /k "cd /d ""%~dp0albion-sniffer"" && albiondata-client.exe -d -p http://localhost:5050"
timeout /t 2 /nobreak >nul

echo  [3/3] Uruchamiam aplikacje (React / Vite)...
start "Albion App" cmd /k "cd /d ""%~dp0albion-craft-calculator"" && npm run dev"
timeout /t 4 /nobreak >nul

echo.
echo  Otwieranie przegladarki...
start "" "http://localhost:5173"

echo.
echo  ============================================================
echo   Wszystko uruchomione!
echo.
echo   Aplikacja:   http://localhost:5173
echo   Bridge:      http://localhost:5050
echo.
echo   Aby zatrzymac: zamknij 3 okna konsoli
echo  ============================================================
echo.
echo  Mozesz zamknac to okno.
pause
