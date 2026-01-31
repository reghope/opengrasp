param(
  [string]$InstallMethod = $env:OPENGRASP_INSTALL_METHOD,
  [string]$GitDir = $env:OPENGRASP_GIT_DIR,
  [string]$Tag = $env:OPENGRASP_TAG,
  [switch]$NoOnboard,
  [switch]$NoPrompt,
  [switch]$DryRun
)

function Log($msg) { Write-Host "[opengrasp] $msg" }
function Run($cmd) {
  if ($DryRun) { Log "DRY_RUN: $cmd"; return $true }
  iex $cmd
  if ($LASTEXITCODE -ne 0) {
    Log "Command failed (exit $LASTEXITCODE): $cmd"
    return $false
  }
  return $true
}

if (-not $InstallMethod) { $InstallMethod = "bun" }
if (-not $GitDir) { $GitDir = "$env:USERPROFILE\opengrasp" }
if (-not $Tag) { $Tag = "latest" }

if (-not (Get-Command bun -ErrorAction SilentlyContinue)) {
  Log "Bun not found. Installing bun..."
  Run "iwr -useb https://bun.sh/install.ps1 | iex"
}

if ($InstallMethod -eq "git") {
  if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Log "Git is required for git install."; exit 1
  }

  if (Test-Path "$GitDir\.git") {
    Log "Updating existing checkout at $GitDir"
    if (-not $DryRun) {
      $status = git -C $GitDir status --porcelain
      if ($status -and -not $NoPrompt) {
        $resp = Read-Host "Repo dirty. Continue anyway? [y/N]"
        if ($resp -ne "y" -and $resp -ne "Y") { exit 2 }
      } elseif ($status -and $NoPrompt) {
        Log "Repo dirty; aborting."; exit 2
      }
      git -C $GitDir pull --rebase
    }
  } else {
    Log "Cloning OpenGrasp into $GitDir"
    if (-not (Run "git clone https://github.com/reghope/opengrasp.git `"$GitDir`"")) { exit 1 }
  }

  Log "Installing deps + building"
  if (-not (Run "cd `"$GitDir`"; bun install")) { exit 1 }
  if (-not (Run "cd `"$GitDir`"; bun scripts/run-all.mjs build --root packages")) { exit 1 }

  $binDir = "$env:USERPROFILE\.opengrasp\bin"
  Run "New-Item -Force -ItemType Directory -Path `"$binDir`" | Out-Null"
  $wrapper = "@echo off`n`"%USERPROFILE%\\.bun\\bin\\bun.exe`" `"$GitDir\\packages\\cli\\dist\\index.js`" %*"
  $wrapperPath = Join-Path $binDir "opengrasp.cmd"
  if (-not $DryRun) { $wrapper | Out-File -FilePath $wrapperPath -Encoding ascii }
  Log "Add $binDir to PATH if needed."
} else {
  Log "Installing OpenGrasp globally via bun..."
  if (-not (Run "bun add -g opengrasp@$Tag")) { exit 1 }
}

if (-not $NoOnboard) {
  Log "Running onboarding..."
  if (-not (Run "opengrasp onboard --install-daemon")) { exit 1 }
} else {
  Log "Skipping onboarding (--no-onboard)."
}

Log "Done. Run: opengrasp gateway"
