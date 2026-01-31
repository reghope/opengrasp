@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -Command "iwr -useb https://opengrasp.com/install.ps1 | iex"
endlocal
