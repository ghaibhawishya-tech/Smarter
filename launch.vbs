Set WShell = CreateObject("WScript.Shell")
WShell.Run "cmd /c ""cd /d """ & CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName) & """ && npm run app:dev""", 0, False
Set WShell = Nothing
