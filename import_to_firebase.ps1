# import_to_firebase.ps1
# Script para importar movimientos históricos a Firebase
# Ejecutar: .\import_to_firebase.ps1

$ErrorActionPreference = "Stop"
$InputFile = ".\movimientos_smart.txt"
$FirebaseUrl = "https://mercato-fbdcc-default-rtdb.firebaseio.com/fantasy_data.json"

Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "IMPORTADOR DE MOVIMIENTOS A FIREBASE" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan

# Leer archivo
Write-Host "`n📂 Leyendo: $InputFile"
$content = Get-Content $InputFile -Raw -Encoding UTF8

# Patrones regex
$reSmartFormat = '^\[([^\]]+)\] (.+)'
$reTransfer = '(.+?) ha (comprado|vendido) al jugador (.+?) (?:de|a) (.+?) por ([\d\.]+)'
$reShield = '(.+?) ha blindado a (.+)'

# Función para normalizar fecha
function NormalizeDate($dateStr) {
    if (-not $dateStr -or $dateStr -eq 'NODATE') { return 'Sin fecha' }
    
    # Si es solo hora (ej: "20:37")
    if ($dateStr -match '^\d{1,2}:\d{2}$') {
        $today = Get-Date -Format 'dd/MM/yyyy'
        return "$today $dateStr"
    }
    return $dateStr
}

# Parsear movimientos
Write-Host "`n📖 Parseando movimientos..."
$lines = $content -split "`n"
$movements = @()
$seenIds = @{}

foreach ($rawLine in $lines) {
    $line = $rawLine.Trim() -replace '[?''€]', ''
    if (-not $line -or $line.StartsWith('#') -or $line.StartsWith('---')) { continue }
    
    if ($line -match $reSmartFormat) {
        $dateKey = $matches[1].Trim()
        $textToParse = $matches[2]
        $normalizedDate = NormalizeDate $dateKey
        
        # Transferencias
        if ($textToParse -match $reTransfer) {
            $actor = $matches[1].Trim()
            $action = $matches[2]
            $player = $matches[3].Trim()
            $otherParty = $matches[4].Trim()
            $amountStr = $matches[5] -replace '\.', ''
            $amount = [int]$amountStr
            
            if ($action -eq 'comprado') {
                $buyer = $actor
                $seller = $otherParty
            } else {
                $buyer = $otherParty
                $seller = $actor
            }
            
            $id = "transfer_${dateKey}_${buyer}_${seller}_${player}_${amount}"
            
            if (-not $seenIds.ContainsKey($id)) {
                $seenIds[$id] = $true
                $movements += @{
                    id = $id
                    type = 'transfer'
                    buyer = $buyer
                    seller = $seller
                    player = $player
                    amount = $amount
                    date = $normalizedDate
                }
            }
            continue
        }
        
        # Blindajes
        if ($textToParse -match $reShield) {
            $manager = $matches[1].Trim()
            $player = $matches[2].Trim()
            $id = "shield_${dateKey}_${manager}_${player}"
            
            if (-not $seenIds.ContainsKey($id)) {
                $seenIds[$id] = $true
                $movements += @{
                    id = $id
                    type = 'shield'
                    beneficiary = $manager
                    player = $player
                    amount = 0
                    details = 'Blindaje'
                    date = $normalizedDate
                }
            }
            continue
        }
    }
}

Write-Host "📊 Movimientos parseados: $($movements.Count)" -ForegroundColor Green

# Crear estructura de datos
$data = @{
    managers = @{
        "Vigar24" = @{ initialBudget = 103000000; teamValue = 0; clauseExpenses = 0; name = "Vigar24" }
        "Vigar FC" = @{ initialBudget = 103000000; teamValue = 0; clauseExpenses = 0; name = "Vigar FC" }
        "GOLENCIERRO FC" = @{ initialBudget = 103000000; teamValue = 0; clauseExpenses = 0; name = "GOLENCIERRO FC" }
        "Pablinistan FC" = @{ initialBudget = 103000000; teamValue = 0; clauseExpenses = 0; name = "Pablinistan FC" }
        "Alcatamy eSports By" = @{ initialBudget = 100000000; teamValue = 0; clauseExpenses = 0; name = "Alcatamy eSports By" }
        "Alcatamy eSports By " = @{ initialBudget = 100000000; teamValue = 0; clauseExpenses = 0; name = "Alcatamy eSports By " }
        "Visite La Manga FC" = @{ initialBudget = 103000000; teamValue = 0; clauseExpenses = 0; name = "Visite La Manga FC" }
        "Morenazos FC" = @{ initialBudget = 103000000; teamValue = 0; clauseExpenses = 0; name = "Morenazos FC" }
    }
    movements = $movements
    lastUpdate = [DateTimeOffset]::Now.ToUnixTimeMilliseconds()
    importedAt = (Get-Date).ToString("o")
}

# Convertir a JSON
Write-Host "`n🔄 Convirtiendo a JSON..."
$json = $data | ConvertTo-Json -Depth 10 -Compress

# Subir a Firebase
Write-Host "🚀 Subiendo a Firebase..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri $FirebaseUrl -Method Put -Body $json -ContentType "application/json; charset=utf-8"
    Write-Host "`n✅ ¡Subida exitosa!" -ForegroundColor Green
    Write-Host "   Movimientos subidos: $($movements.Count)"
    Write-Host "   Los datos ahora están en Firebase." -ForegroundColor Cyan
} catch {
    Write-Host "`n❌ Error: $_" -ForegroundColor Red
}
