$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$sets = Get-Content -Raw -Encoding UTF8 -LiteralPath "$PSScriptRoot\..\content\v1\listeningSets.json" | ConvertFrom-Json
$output = Join-Path $PSScriptRoot '..\public\audio\v1'
New-Item -ItemType Directory -Force -Path $output | Out-Null
foreach ($set in $sets) {
  $speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer
  $speaker.SelectVoice('Microsoft Zira Desktop')
  $speaker.Rate = -1
  $target = Join-Path $output ($set.id + '.wav')
  $speaker.SetOutputToWaveFile($target)
  $speaker.Speak($set.transcript)
  $speaker.Dispose()
}
Write-Host "Generated $($sets.Count) original listening WAV files."
