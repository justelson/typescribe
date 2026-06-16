Set Shell = CreateObject("WScript.Shell")
Set Fso = CreateObject("Scripting.FileSystemObject")
ProjectRoot = Fso.GetParentFolderName(WScript.ScriptFullName)
Shell.Run "cmd /c cd /d """ & ProjectRoot & """ && npm run open:desktop", 0, False
