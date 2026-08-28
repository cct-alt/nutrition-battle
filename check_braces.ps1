$content = Get-Content "C:\Users\cct\Documents\Default Project\nutrition-battle\public\app.js" -Raw
$lines = $content -split "`n"
$brace = 0
for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]
    $open = [regex]::Matches($line, '\{').Count
    $close = [regex]::Matches($line, '\}').Count
    $brace += $open - $close
    if ($brace -lt 0) { "Line $($i+1): NEGATIVE ($brace): $line" }
}
"Final brace count: $brace"