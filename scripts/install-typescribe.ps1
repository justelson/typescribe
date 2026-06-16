$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$ShortcutPath = Join-Path ([Environment]::GetFolderPath("Desktop")) "TypeScribe.lnk"
$LauncherPath = Join-Path $ProjectRoot "launch-typescribe.vbs"

$launcher = @'
Set Shell = CreateObject("WScript.Shell")
Set Fso = CreateObject("Scripting.FileSystemObject")
ProjectRoot = Fso.GetParentFolderName(WScript.ScriptFullName)
Shell.Run "cmd /c cd /d """ & ProjectRoot & """ && npm run open:desktop", 0, False
'@
Set-Content -Path $LauncherPath -Value $launcher -Encoding ASCII

$Shell = New-Object -ComObject WScript.Shell
$Shortcut = $Shell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $LauncherPath
$Shortcut.WorkingDirectory = $ProjectRoot
$Shortcut.Description = "Launch TypeScribe"
$Shortcut.Save()

Write-Host "Installed TypeScribe shortcut: $ShortcutPath"
