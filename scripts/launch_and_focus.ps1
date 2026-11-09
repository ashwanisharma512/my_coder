Add-Type @"
  using System;
  using System.Runtime.InteropServices;
  public class Win32 {
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")]
    public static extern bool SwitchToThisWindow(IntPtr hWnd, bool fAltTab);
  }
"@

# 1. Clean up any existing instances on port 9222
Get-Process Code -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*archive-1.94.0*" } | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 500

# 2. Launch isolated VS Code with remote debugging
$codeExe = "C:\Users\ashwa\Documents\personal\my_coder\.vscode-test\vscode-win34-archive\Code.exe"
if (-not (Test-Path $codeExe)) {
  $codeExe = "C:\Users\ashwa\Documents\personal\my_coder\.vscode-test\vscode-win32-x64-archive-1.94.0\Code.exe"
}

$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = $codeExe
$psi.Arguments = '--extensionDevelopmentPath="C:\Users\ashwa\Documents\personal\my_coder" --user-data-dir="C:\Users\ashwa\Documents\personal\my_coder\.vscode-test\user-data" --extensions-dir="C:\Users\ashwa\Documents\personal\my_coder\.vscode-test\extensions" --remote-debugging-port=9222 "C:\Users\ashwa\Documents\personal\my_coder\test-workspace"'
$psi.UseShellExecute = $false
$psi.EnvironmentVariables.Remove("ELECTRON_RUN_AS_NODE")

$proc = [System.Diagnostics.Process]::Start($psi)
Write-Host "Started Code process: PID $($proc.Id)"

# 3. Wait for window to load and grab HWND
$foundHwnd = [IntPtr]::Zero
for ($i = 0; $i -lt 15; $i++) {
  Start-Sleep -Seconds 1
  $targets = Get-Process Code -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 }
  foreach ($t in $targets) {
    if ($t.MainWindowTitle -like "*Extension Development Host*" -or $t.MainWindowTitle -like "*test-workspace*") {
      $foundHwnd = $t.MainWindowHandle
      Write-Host "Found window: '$($t.MainWindowTitle)' (HWND: $foundHwnd)"
      break
    }
  }
  if ($foundHwnd -ne [IntPtr]::Zero) { break }
}

# 4. Bring window to front
if ($foundHwnd -ne [IntPtr]::Zero) {
  [Win32]::ShowWindowAsync($foundHwnd, 9) # 9 = SW_RESTORE
  [Win32]::SetForegroundWindow($foundHwnd)
  [Win32]::SwitchToThisWindow($foundHwnd, $true)
  Write-Host "Successfully brought window to front!"
} else {
  Write-Host "Window handle not found yet, checking CDP..."
}

# 5. Check CDP port 9222
try {
  $res = Invoke-RestMethod -Uri "http://localhost:9222/json/list" -TimeoutSec 3
  Write-Host "CDP connected successfully! Target count: $($res.Count)"
} catch {
  Write-Host "CDP not reachable yet: $_"
}
