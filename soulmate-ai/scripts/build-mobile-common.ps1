$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

# EAS prints "new version available" to stderr; PowerShell treats that as a fatal error.
$env:npm_config_update_notifier = "false"

function Import-ExpoTokenFromDotEnv {
    if ($env:EXPO_TOKEN) {
        return
    }

    $envFile = Join-Path $Root ".env"
    if (-not (Test-Path $envFile)) {
        return
    }

    foreach ($line in Get-Content $envFile) {
        $trimmed = $line.Trim()
        if ($trimmed -match '^EXPO_TOKEN=(.+)$') {
            $env:EXPO_TOKEN = $Matches[1].Trim().Trim('"').Trim("'")
            return
        }
    }
}

Import-ExpoTokenFromDotEnv

function Write-Step([string]$Message) {
    Write-Host ""
    Write-Host $Message
}

function Ensure-NodeModules {
    if (Test-Path (Join-Path $Root "node_modules\expo")) {
        return
    }

    Write-Step "Installing dependencies..."
    npm install
    if ($LASTEXITCODE -ne 0) {
        throw "npm install failed."
    }
}

function Get-EasBin {
    return "npx"
}

function Get-EasOutput {
    param(
        [Parameter(ValueFromRemainingArguments = $true)]
        [string[]]$EasArgs
    )

    $easBin = Get-EasBin
    $prev = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        if ($easBin -eq "npx") {
            return (& npx eas @EasArgs 2>&1 | Out-String)
        }
        return (& $easBin @EasArgs 2>&1 | Out-String)
    } finally {
        $ErrorActionPreference = $prev
    }
}

function Get-EasAccountName {
    $output = Get-EasOutput whoami
    if ($output -match 'Not logged in') {
        return $null
    }

    foreach ($line in ($output -split "`r?`n")) {
        $line = $line.Trim()
        if (
            $line -and
            $line -notmatch 'eas-cli@' -and
            $line -notmatch 'upgrade' -and
            $line -notmatch 'Proceeding' -and
            $line -notmatch 'To upgrade' -and
            $line -notmatch 'npm install'
        ) {
            return $line
        }
    }

    return $null
}

function Invoke-EasNative {
    param(
        [Parameter(Mandatory = $true)]
        [string]$EasBin,
        [Parameter(ValueFromRemainingArguments = $true)]
        [string[]]$EasArgs
    )

    $prev = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        if ($EasBin -eq "npx") {
            & npx eas @EasArgs
        } else {
            & $EasBin @EasArgs
        }
        return $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $prev
    }
}

function Test-GitAvailable {
    return [bool](Get-Command git -ErrorAction SilentlyContinue)
}

function Ensure-EasIgnore {
    $easIgnore = Join-Path $Root ".easignore"
    if (Test-Path $easIgnore) {
        return
    }

    Write-Host "Creating .easignore so EAS can skip node_modules when compressing..."
    @(
        "node_modules/"
        ".expo/"
        "dist/"
        "web-build/"
        "expo-env.d.ts"
        ".metro-health-check*"
        "/ios"
        "/android"
        ".kotlin/"
        ".env"
        ".env*.local"
        "*.pem"
        "*.jks"
        "*.p8"
        "*.p12"
        "*.key"
        "*.mobileprovision"
        ".git/"
        "npm-debug.*"
        "yarn-debug.*"
        "yarn-error.*"
        "*.tsbuildinfo"
        ".DS_Store"
        "coverage/"
        ".turbo/"
        ".cache/"
        "app-example"
        "*.orig.*"
    ) | Set-Content -Path $easIgnore -Encoding UTF8
}

function Ensure-GitRepo {
    Ensure-EasIgnore

    $rootPathLength = $Root.Length
    if ($rootPathLength -gt 180 -or $Root -match 'Downloads\\.*-master\\.*-master') {
        Write-Host ""
        Write-Host "Warning: project path is long or nested under Downloads."
        Write-Host "If EAS fails while compressing, move the soulmate-ai folder to a short path like C:\soulmate-ai"
        Write-Host "Current path ($rootPathLength chars): $Root"
        Write-Host ""
    }

    if (-not (Test-GitAvailable)) {
        Write-Host "Git is not installed. Continuing with EAS_NO_VCS=1 (uses .easignore)."
        Write-Host "Recommended: install Git for Windows from https://git-scm.com/download/win"
        $env:EAS_NO_VCS = "1"
        return
    }

    $prev = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        git rev-parse --is-inside-work-tree 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) {
            # Make sure there is at least one commit so EAS can archive the tree.
            git rev-parse HEAD 2>$null | Out-Null
            if ($LASTEXITCODE -eq 0) {
                return
            }

            Write-Host "Git repo has no commits yet. Creating an EAS build snapshot commit..."
            git config user.email "eas-build@local" 2>$null | Out-Null
            git config user.name "EAS Build" 2>$null | Out-Null
            git add -A
            git commit -m "EAS build snapshot" --allow-empty 2>$null | Out-Null
            if ($LASTEXITCODE -eq 0) {
                return
            }
        }
    } finally {
        $ErrorActionPreference = $prev
    }

    Write-Host "Initializing git repository (EAS Build requires git)..."
    $ErrorActionPreference = "Continue"
    try {
        git init | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Could not initialize git. Continuing with EAS_NO_VCS=1 (uses .easignore)."
            $env:EAS_NO_VCS = "1"
            return
        }

        git config user.email "eas-build@local"
        git config user.name "EAS Build"
        git add -A
        git commit -m "EAS build snapshot" 2>$null | Out-Null
        if ($LASTEXITCODE -ne 0) {
            git commit -m "EAS build snapshot" --allow-empty | Out-Null
        }

        if ($LASTEXITCODE -ne 0) {
            Write-Host "Could not create git commit. Continuing with EAS_NO_VCS=1 (uses .easignore)."
            $env:EAS_NO_VCS = "1"
        }
    } finally {
        $ErrorActionPreference = $prev
    }
}

function Ensure-PackageLockSynced {
    $lockFile = Join-Path $Root "package-lock.json"
    if (-not (Test-Path $lockFile)) {
        Write-Host "package-lock.json is missing. Running npm install..."
        npm install
        if ($LASTEXITCODE -ne 0) {
            throw "npm install failed."
        }
        return
    }

    $prev = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        npm ci --dry-run 2>$null | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "package-lock.json is out of date. Running npm install..."
            npm install
            if ($LASTEXITCODE -ne 0) {
                throw "npm install failed."
            }
        }
    } finally {
        $ErrorActionPreference = $prev
    }
}

function Get-FreeDiskGb {
    param([string]$Path = $Root)

    try {
        $driveLetter = ([System.IO.Path]::GetPathRoot($Path)).TrimEnd('\')
        $drive = Get-PSDrive -Name $driveLetter.TrimEnd(':') -ErrorAction SilentlyContinue
        if ($drive -and $null -ne $drive.Free) {
            return [math]::Round($drive.Free / 1GB, 1)
        }
    } catch {
        # Best-effort only.
    }
    return $null
}

function Ensure-DiskSpaceForBuild {
    $freeGb = Get-FreeDiskGb
    if ($null -eq $freeGb) {
        return
    }

    Write-Host "Free disk space: ${freeGb} GB"

    if ($freeGb -lt 2) {
        throw @"
Not enough free disk space for an Android EAS build (about ${freeGb} GB free).

Free at least a few GB, then try BUILD-ANDROID.cmd again:
  1. Empty Recycle Bin
  2. Delete old ZIP folders under Downloads
  3. In CMD:  npm cache clean --force
  4. Optional: delete soulmate-ai\node_modules (GET-LATEST / npm install later)
"@
    }
}

function Enable-ShortProjectDrive {
    param([string]$DriveLetter = "S")

    $driveRoot = $DriveLetter.TrimEnd(':')
    $drive = $driveRoot + ':'

    $prev = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        cmd /c "subst ${driveRoot}: /d" 2>$null | Out-Null
        cmd /c "subst ${driveRoot}: `"$Root`""
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Could not map short drive $drive. Continuing from the long path."
            return $null
        }
    } finally {
        $ErrorActionPreference = $prev
    }

    Write-Host "Mapped $drive -> project folder (avoids Windows path limits during compress)."
    return $drive
}

function Disable-ShortProjectDrive {
    param([string]$DriveLetter = "S")

    $driveRoot = $DriveLetter.TrimEnd(':')
    $prev = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        cmd /c "subst ${driveRoot}: /d" 2>$null | Out-Null
    } finally {
        $ErrorActionPreference = $prev
    }
}

function Test-NeedsShortBuildPath {
    return (
        $Root.Length -gt 120 -or
        $Root -match 'Downloads' -or
        $Root -match '-master\\.*-master'
    )
}

function New-ShortEasBuildStaging {
    <#
      EAS compress often fails on long nested Downloads paths, and SUBST can be
      resolved back to the real long path. Copy a lean project tree to C:\soulmate-eas.
    #>
    $stagingRoot = "C:\soulmate-eas"

    Write-Host "Preparing short build folder at $stagingRoot ..."

    if (Test-Path $stagingRoot) {
        Remove-Item -LiteralPath $stagingRoot -Recurse -Force -ErrorAction SilentlyContinue
    }
    New-Item -ItemType Directory -Path $stagingRoot -Force | Out-Null

    $excludeDirs = @(
        "node_modules",
        ".expo",
        "dist",
        "web-build",
        ".git",
        "coverage",
        ".turbo",
        ".cache",
        "android",
        "ios"
    )

    $robolog = Join-Path $env:TEMP "soulmate-eas-robocopy.log"
    $xdArgs = @("/XD") + $excludeDirs
    $prev = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        & robocopy $Root $stagingRoot /E /NFL /NDL /NJH /NJS /NC /NS /NP @xdArgs /LOG:$robolog | Out-Null
        $code = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $prev
    }

    # robocopy exit codes 0-7 are success/partial copy
    if ($code -ge 8 -or -not (Test-Path (Join-Path $stagingRoot "package.json"))) {
        throw @"
Could not create short build folder at $stagingRoot.

Free some disk space, or manually copy soulmate-ai to C:\soulmate-ai and run BUILD-ANDROID.cmd from there.
Robocopy exit code: $code
"@
    }

    # Keep local tooling available without copying huge node_modules into staging.
    $nodeModules = Join-Path $Root "node_modules"
    $stagingNodeModules = Join-Path $stagingRoot "node_modules"
    if (Test-Path $nodeModules) {
        cmd /c "mklink /J `"$stagingNodeModules`" `"$nodeModules`"" | Out-Null
        if (-not (Test-Path $stagingNodeModules)) {
            Write-Host "Could not link node_modules into staging; EAS upload will still work via .easignore."
        }
    }

    # Ensure ignore file exists in the staged copy.
    $stagedIgnore = Join-Path $stagingRoot ".easignore"
    if (-not (Test-Path $stagedIgnore)) {
        Copy-Item -LiteralPath (Join-Path $Root ".easignore") -Destination $stagedIgnore -ErrorAction SilentlyContinue
    }

    Write-Host "Short build folder ready: $stagingRoot"
    return $stagingRoot
}

function Invoke-Eas {
    param(
        [Parameter(ValueFromRemainingArguments = $true)]
        [string[]]$EasArgs
    )

    Ensure-EasIgnore

    $exitCode = Invoke-EasNative -EasBin (Get-EasBin) @EasArgs
    if ($exitCode -ne 0) {
        Write-Host ""
        Write-Host "Build failed. Common fixes:"
        Write-Host "  1. Run GET-LATEST.cmd"
        Write-Host "  2. Free disk space (compress fails when the drive is full)"
        Write-Host "  3. Install Git for Windows: https://git-scm.com/download/win"
        Write-Host "  4. Move soulmate-ai to a short path like C:\soulmate-ai"
        Write-Host "  5. On first Android build, answer Yes when asked to create a keystore"
        throw "EAS command failed: eas $($EasArgs -join ' ')"
    }
}

function Test-EasLoggedIn {
    return [bool](Get-EasAccountName)
}

function Ensure-EasLogin {
    if ($env:EXPO_TOKEN) {
        Write-Host "Using EXPO_TOKEN from environment."
        return
    }

    $account = Get-EasAccountName
    if ($account) {
        Write-Host "Logged in to Expo as $account"
        return
    }

    Write-Step "Not logged in to Expo command line yet."
    Write-Host "Run LOGIN-EAS.cmd, or add EXPO_TOKEN to your .env file."
    Write-Host "Create a token: https://expo.dev/settings/access-tokens"
    Write-Host ""

    try {
        Start-Process "https://expo.dev/login"
    } catch {
        # Browser open is best-effort on Windows.
    }

    Invoke-Eas login

    $account = Get-EasAccountName
    if (-not $account) {
        throw "Expo login did not complete. Run LOGIN-EAS.cmd or set EXPO_TOKEN in .env."
    }

    Write-Host "Logged in as $account"
}

function Ensure-ProductionEnvSynced {
    $envFile = Join-Path $Root ".env"
    if (-not (Test-Path $envFile)) {
        Write-Host "Warning: .env not found. EAS will use variables already saved on expo.dev."
        return
    }

    Write-Host "Tip: run DEPLOY.cmd at least once so Expo production env has your Supabase keys."
}
