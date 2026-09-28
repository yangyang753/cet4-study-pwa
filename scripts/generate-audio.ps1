$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$sets = Get-Content -Raw -Encoding UTF8 -LiteralPath "$PSScriptRoot\..\content\v1\listeningSets.json" | ConvertFrom-Json
$output = Join-Path $PSScriptRoot '..\public\audio\v1'
New-Item -ItemType Directory -Force -Path $output | Out-Null
$probe = New-Object System.Speech.Synthesis.SpeechSynthesizer
$voices = @($probe.GetInstalledVoices() | Where-Object { $_.Enabled -and $_.VoiceInfo.Culture.Name -like 'en-*' } | ForEach-Object { $_.VoiceInfo.Name })
$probe.Dispose()
if ($voices.Count -eq 0) { throw 'No installed English speech voice was found.' }
$usedVoices = New-Object System.Collections.Generic.HashSet[string]
foreach ($set in $sets) {
  $speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer
  $speaker.Rate = -1
  $target = Join-Path $output ($set.id + '.wav')
  $speaker.SetOutputToWaveFile($target)
  $segments = @($set.segments)
  if ($segments.Count -eq 0) { $segments = @([pscustomobject]@{ text = $set.transcript }) }
  $speakerVoices = @{}
  for ($index = 0; $index -lt $segments.Count; $index += 1) {
    $speakerName = [string]$segments[$index].speaker
    if ($speakerName) {
      if (-not $speakerVoices.ContainsKey($speakerName)) {
        $speakerVoices[$speakerName] = $voices[$speakerVoices.Count % $voices.Count]
      }
      $voice = $speakerVoices[$speakerName]
    } else {
      $voice = $voices[0]
    }
    $speaker.SelectVoice($voice)
    [void]$usedVoices.Add($voice)
    $speaker.Speak([string]$segments[$index].text)
  }
  $speaker.Dispose()
}
Write-Host "Generated $($sets.Count) original listening WAV files with $($usedVoices.Count) installed English voice(s): $($usedVoices -join ', ')."
