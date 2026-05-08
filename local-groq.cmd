@echo off
node "%~dp0local-groq.mjs" %*
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [Process exited with error %ERRORLEVEL%]
    pause
)
