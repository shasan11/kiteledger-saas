@echo off
REM ===========================================================================
REM  KiteLedger fast install (Windows / local dev).
REM
REM  Builds the application so it is ready to serve. Database migration,
REM  seeding, admin creation and the install lock are handled by the web
REM  installer at /install. Migrations are intentionally NOT run here.
REM ===========================================================================
setlocal

echo Starting KiteLedger fast install...

echo.
echo ==^> Installing PHP dependencies (composer install)...
call composer install
if errorlevel 1 goto :error

if not exist .env (
    echo ==^> Creating .env from .env.example...
    copy .env.example .env
) else (
    echo ==^> .env already exists, leaving it untouched.
)

echo ==^> Generating APP_KEY (skipped automatically if already set)...
call php artisan key:generate

echo ==^> Installing frontend dependencies (npm install)...
call npm install
if errorlevel 1 goto :error

echo ==^> Building frontend assets (npm run build)...
call npm run build
if errorlevel 1 goto :error

echo ==^> Linking public storage...
call php artisan storage:link

echo ==^> Clearing caches...
call php artisan config:clear
call php artisan cache:clear
call php artisan route:clear
call php artisan view:clear

echo.
echo ============================================================
echo Fast install completed.
echo Now open https://your-domain.com/install to complete database setup.
echo Make sure your web server document root points to /public.
echo ============================================================
goto :eof

:error
echo.
echo Fast install FAILED. See the error above.
exit /b 1
