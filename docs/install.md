# OpenGrasp Install (Windows)

Use one of these commands in a fresh terminal. They download and run the installer directly.

## PowerShell

```powershell
iwr -useb https://opengrasp.com/install.ps1 | iex
```

## Windows CMD

```cmd
curl -fsSL https://opengrasp.com/install.cmd -o install.cmd && install.cmd && del install.cmd
```

## Notes

- This project installs via Bun (not npm).
- If you see a 404 for `opengrasp` from the npm registry, the package isn’t published there yet.
