@echo off
REM ===========================================================================
REM  KiteLedger fast install (Windows / local dev).
REM
REM  Builds the application so it is ready to serve. Database migration,
REM  seeding, admin creation and the install lock are handled by the web
REM  installer (/install) or `php artisan kiteledger:install`. Migrations are
REM  intentionally NOT run here.
REM ===========================================================================
setlocal
cd /d "%~dp0.."

echo Starting KiteLedger fast install...
echo.

echo ==^> Installing PHP dependencies (composer install --no-dev)...
call composer install --no-dev --optimize-autoloader
if errorlevel 1 goto :error
if not exist vendor\autoload.php (
    echo FAIL vendor\autoload.php missing after composer install.
    goto :error
)

if not exist .env (
    echo ==^> Creating .env from .env.example...
    copy .env.example .env >nul
) else (
    echo ==^> .env already exists, leaving it untouched.
)

echo ==^> Generating APP_KEY...
findstr /R "^APP_KEY=base64:..*" .env >nul
if errorlevel 1 (
    call php artisan key:generate --force
) else (
    echo APP_KEY already set, skipping.
)

echo ==^> Installing frontend dependencies (npm install)...
call npm install
if errorlevel 1 goto :error

echo ==^> Building frontend assets (npm run build)...
call npm run build
if errorlevel 1 goto :error
if not exist public\build\manifest.json (
    echo FAIL public\build\manifest.json missing after build.
    goto :error
)

echo ==^> Linking public storage...
call php artisan storage:link

echo ==^> Clearing compiled caches...
call php artisan optimize:clear

echo.
echo ============================================================
echo Fast install completed.
echo Complete database setup one of two ways:
echo   1. Browser : open https://your-domain.com/install
echo   2. Terminal: php artisan kiteledger:install
echo.
echo Make sure your web server document root points to /public.
echo Verify anytime with: php artisan kiteledger:doctor
echo ============================================================
goto :eof

:error
echo.
echo Fast install FAILED. See the error above.
exit /b 1
