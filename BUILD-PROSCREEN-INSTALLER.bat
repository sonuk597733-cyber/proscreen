@echo off
setlocal
cd /d "%~dp0"

echo ============================================================================
echo   ProScreen Desktop -- Windows Production Build ^& NSIS Installer Packager
echo ============================================================================
echo Working directory: %CD%
echo.

echo [1/6] Checking Node.js and npm installation...
where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js was not found in PATH.
  echo         Install Node.js 20+ LTS from https://nodejs.org/ and re-run this script.
  goto :FAIL
)
where npm >nul 2>&1
if errorlevel 1 (
  echo [ERROR] npm was not found in PATH.
  echo         Ensure Node.js + npm are installed properly and re-run this script.
  goto :FAIL
)
for /f "delims=" %%V in ('node -v') do echo   - Node.js: %%V
for /f "delims=" %%V in ('call npm -v') do echo   - npm:     v%%V
echo.

echo [2/6] Checking project dependencies...
set "NEED_INSTALL=0"
if not exist "node_modules" set "NEED_INSTALL=1"
if not exist "node_modules\.bin\vite.cmd" set "NEED_INSTALL=1"
if not exist "node_modules\.bin\electron-builder.cmd" set "NEED_INSTALL=1"
if not exist "node_modules\electron\package.json" set "NEED_INSTALL=1"
if not exist "node_modules\esbuild\package.json" set "NEED_INSTALL=1"

if "%NEED_INSTALL%"=="1" (
  echo   Dependencies missing or incomplete. Running npm install...
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo [ERROR] npm install failed. Check network access and errors above.
    goto :FAIL
  )
) else (
  echo   Existing node_modules detected. Skipping install.
)
echo.

echo [3/6] Setting GITHUB_PAGES=false and cleaning previous desktop build output...
set "GITHUB_PAGES=false"
if exist "dist" rmdir /s /q "dist"
if exist "dist-electron" rmdir /s /q "dist-electron"
if exist "release" rmdir /s /q "release"
if exist "release" (
  echo [ERROR] Could not remove existing "release" folder.
  echo         Close any running ProScreen.exe or installer window and try again.
  goto :FAIL
)
echo   Clean complete ^(user settings, recordings, and source files untouched^).
echo.

echo [4/6] Running production desktop build ^(npm run build^)...
call npm run build
if errorlevel 1 (
  echo [ERROR] Production build failed. See compiler output above.
  goto :FAIL
)
if not exist "dist\options.html" (
  echo [ERROR] Expected Studio renderer bundle "dist\options.html" was not generated.
  goto :FAIL
)
if not exist "dist-electron\main.cjs" (
  echo [ERROR] Expected Electron main bundle "dist-electron\main.cjs" was not generated.
  goto :FAIL
)
if not exist "dist-electron\preload.cjs" (
  echo [ERROR] Expected Electron preload bundle "dist-electron\preload.cjs" was not generated.
  goto :FAIL
)
echo   Verified dist\options.html, dist-electron\main.cjs, and dist-electron\preload.cjs.
echo.

echo [5/6] Packaging Windows NSIS installer ^(npm run dist:win^)...
call npm run dist:win
if errorlevel 1 (
  echo [ERROR] Windows packaging ^(npm run dist:win^) failed. See errors above.
  goto :FAIL
)
echo.

echo [6/6] Verifying generated Windows NSIS installer...
set "INSTALLER_PATH="
set "INSTALLER_NAME="
set "INSTALLER_SIZE=0"
for %%F in ("release\ProScreen-Setup-*.exe") do (
  set "INSTALLER_PATH=%%~fF"
  set "INSTALLER_NAME=%%~nxF"
  set "INSTALLER_SIZE=%%~zF"
)

if "%INSTALLER_PATH%"=="" (
  echo [ERROR] No installer matching "release\ProScreen-Setup-*.exe" was found.
  goto :FAIL
)
if not exist "%INSTALLER_PATH%" (
  echo [ERROR] Installer file missing: %INSTALLER_PATH%
  goto :FAIL
)
if "%INSTALLER_SIZE%"=="" set "INSTALLER_SIZE=0"
if %INSTALLER_SIZE% LEQ 0 (
  echo [ERROR] Installer file exists but has zero byte size: %INSTALLER_PATH%
  goto :FAIL
)

echo ============================================================================
echo   SUCCESS: Windows NSIS Installer Generated!
echo ============================================================================
echo   File Name : %INSTALLER_NAME%
echo   Full Path : %INSTALLER_PATH%
echo   File Size : %INSTALLER_SIZE% bytes
echo.
echo   You can now double-click "%INSTALLER_NAME%" in the "release" folder
echo   to install and launch ProScreen Studio.
echo ============================================================================
echo.
pause
exit /b 0

:FAIL
echo.
echo ============================================================================
echo   BUILD FAILED -- No valid Windows NSIS installer was produced.
echo ============================================================================
echo   Review the error message above, resolve it, and run this script again.
echo.
pause
exit /b 1
