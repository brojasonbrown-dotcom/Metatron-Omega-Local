$wu = 'C:\Users\user-pc\Desktop\Workflow\.devcontainer\src\compute_engine\app\release\win-unpacked'

Write-Host '=== try renaming win-unpacked (top level) ==='
try {
  Rename-Item -LiteralPath $wu -NewName 'win-unpacked.stale' -ErrorAction Stop
  Write-Host 'SUCCESS: win-unpacked renamed out of the way'
} catch {
  Write-Host "FAILED: $($_.Exception.Message)"
  Write-Host 'attempting cmd rd as fallback...'
  cmd /c "rd /s /q `"$wu`"" 2>&1 | ForEach-Object { Write-Host $_ }
  if (Test-Path -LiteralPath $wu) { Write-Host 'rd also failed — still locked' } else { Write-Host 'rd succeeded' }
}

Write-Host '=== state ==='
Get-ChildItem -Force (Split-Path $wu) | Select-Object Name | Format-Table -AutoSize
