# 🎯 Alcantasy - Auditoría Estratégica y Especificación Técnica

> **Informe de Product Owner | Módulo "Ficha de Jugador Pro"**

---

## 1. Tabla Comparativa: Alcantasy vs LaLiga Fantasy App

### Gap Analysis Completo

| Funcionalidad | LaLiga App | Alcantasy | Gap | Impacto |
|---------------|:----------:|:---------:|:---:|:-------:|
| **Ficha de Jugador** |
| Puntos últimas 5 jornadas | ✅ | ❌ | 🔴 | CRÍTICO |
| Desglose de puntos (goles, TA, asist) | ✅ | ❌ | 🔴 | CRÍTICO |
| % Probabilidad titularidad | ✅ | ❌ | 🔴 | CRÍTICO |
| Gráfico evolución valor | ✅ | ⚠️ Solo tendencia | 🟡 | ALTO |
| Próximo partido | ✅ | ❌ | 🟡 | ALTO |
| Media pts por posición | ✅ | ❌ | 🟡 | ALTO |
| **Estadísticas Avanzadas** |
| Minutos jugados por jornada | ✅ | ❌ | 🔴 | CRÍTICO |
| Rachas (partidos seguidos puntuando) | ✅ | ❌ | 🟡 | ALTO |
| Histórico de lesiones | ✅ | ❌ | 🟡 | ALTO |
| Mapa de calor en campo | ✅ | ❌ | 🟢 | MEDIO |
| **Mercado** |
| Ofertas recibidas en tiempo real | ✅ | ❌ | 🟡 | ALTO |
| Countdown de pujas | ✅ | ⚠️ Parcial | 🟡 | ALTO |
| **Ventajas Alcantasy** |
| Espionaje financiero rivales | ❌ | ✅ | ✅ | DIFERENCIADOR |
| Algoritmo Moneyball | ❌ | ✅ | ✅ | DIFERENCIADOR |
| Francotirador cláusulas | ❌ | ✅ | ✅ | DIFERENCIADOR |
| Historial inversión Firebase | ❌ | ✅ | ✅ | DIFERENCIADOR |

### Datos Críticos Faltantes

| Dato | Uso en Toma de Decisiones | Fuente Posible |
|------|---------------------------|----------------|
| Minutos últimas 3 jornadas | Calcular % titularidad | API `playerStats` |
| Puntos desglosados | Analizar consistencia | API `weekPoints` |
| Estado físico (fitness) | Ajustar predicciones | API o scraping |
| Calendario próximos 5 partidos | Planificar fichajes | API `calendar` |
| Media puntos por posición | Comparar rendimiento | Cálculo local |

---

## 2. Especificación UI/UX: Modal "Ficha de Jugador Pro"

### Estructura del Modal

```
┌─────────────────────────────────────────────────────────────────┐
│ ╔═══════════════════════════════════════════════════════════╗  │
│ ║  [FOTO]  PEDRI                              ⭐ PREMIUM    ║  │
│ ║          FC Barcelona · MC                   [❤️ Watchlist]║  │
│ ╚═══════════════════════════════════════════════════════════╝  │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│
│ │   151.3M    │ │    89%      │ │   234 pts   │ │  1.55 pts/M ││
│ │   Valor     │ │  TITULAR    │ │   Totales   │ │    Ratio    ││
│ │   ↑ +2.3M   │ │  🟢 Alta    │ │   #3 en MC  │ │  🟢 GANGA   ││
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘│
├─────────────────────────────────────────────────────────────────┤
│  📊 RENDIMIENTO ÚLTIMAS 5 JORNADAS                              │
│ ┌───────────────────────────────────────────────────────────┐  │
│ │ J16 │████████████████████████│ 14 pts │⚽×1 🅰️×1 90' │  │
│ │ J15 │████████████████████    │ 11 pts │    🅰️×2 87' │  │
│ │ J14 │██████                  │  3 pts │🟨      45' │  │
│ │ J13 │████████████████        │  9 pts │⚽×1     90' │  │
│ │ J12 │████████                │  5 pts │         74' │  │
│ │      Promedio: 8.4 pts │ Consistencia: ⭐⭐⭐⭐☆      │  │
│ └───────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  📈 EVOLUCIÓN DE VALOR (30 DÍAS)                                │
│ ┌───────────────────────────────────────────────────────────┐  │
│ │  Min: 145.2M │ Max: 156.8M │ Δ +4.1% este mes             │  │
│ └───────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  ⚔️ COMPARATIVA vs MEDIA MEDIOCAMPISTAS                         │
│ ┌─────────────────────────────────────────┐                    │
│ │ Pedri          ████████████████  8.4    │                    │
│ │ Media MC       ██████████       5.2     │                    │
│ │ Top MC (Isco)  ██████████████████ 9.1   │                    │
│ └─────────────────────────────────────────┘                    │
├─────────────────────────────────────────────────────────────────┤
│  🗓️ PRÓXIMOS PARTIDOS                                           │
│  J17: vs Sevilla (F) │ J18: vs Getafe (L) │ J19: vs Real Madrid │
│       🟢 Fácil            🟢 Fácil              🔴 Difícil       │
├─────────────────────────────────────────────────────────────────┤
│  [🛒 FICHAR]  [📊 Ver en Moneyball]  [⚡ Alertar bajada precio]  │
└─────────────────────────────────────────────────────────────────┘
```

### Componentes React Necesarios

```
components/
├── PlayerProModal/
│   ├── PlayerProModal.jsx      // Container principal
│   ├── TitularityBadge.jsx     // Indicador % titularidad
│   ├── PerformanceChart.jsx    // Gráfico últimas 5 jornadas
│   ├── ValueEvolutionChart.jsx // Gráfico evolución valor
│   ├── PositionComparison.jsx  // Comparativa vs media
│   └── UpcomingMatches.jsx     // Próximos partidos
```

---

## 3. Lógica del Algoritmo: Probabilidad de Titularidad

### Pseudocódigo

```javascript
function calculateTitularityProbability(player, lastMatches) {
    
    // === FACTOR 1: Minutos jugados (peso 40%) ===
    const avgMinutes = lastMatches.reduce((sum, m) => sum + m.minutes, 0) / lastMatches.length
    const minutesFactor = Math.min(avgMinutes / 90, 1)
    
    // === FACTOR 2: Consistencia de titularidades (peso 30%) ===
    const starterCount = lastMatches.filter(m => m.minutes >= 60).length
    const consistencyFactor = starterCount / lastMatches.length
    
    // === FACTOR 3: Estado físico (peso 20%) ===
    let fitnessFactor = 1.0
    if (player.status === 'injured') fitnessFactor = 0.0
    else if (player.status === 'doubtful') fitnessFactor = 0.5
    else if (lastMatches[0]?.minutes < 45) fitnessFactor = 0.7
    
    // === FACTOR 4: Tendencia reciente (peso 10%) ===
    const recentAvg = (lastMatches[0]?.minutes + lastMatches[1]?.minutes) / 2 || 0
    const previousAvg = (lastMatches[2]?.minutes + lastMatches[3]?.minutes) / 2 || 45
    const trendFactor = recentAvg > previousAvg ? 1.0 : 
                        recentAvg === previousAvg ? 0.8 : 0.6
    
    // === CÁLCULO FINAL ===
    const rawProbability = 
        (minutesFactor * 0.40) +
        (consistencyFactor * 0.30) +
        (fitnessFactor * 0.20) +
        (trendFactor * 0.10)
    
    const percentage = Math.round(rawProbability * 100)
    
    return {
        percentage,
        label: percentage >= 80 ? 'TITULAR SEGURO' :
               percentage >= 60 ? 'PROBABLE TITULAR' :
               percentage >= 40 ? 'ROTACIÓN' : 'SUPLENTE',
        color: percentage >= 80 ? 'neon-green' :
               percentage >= 60 ? 'yellow-400' :
               percentage >= 40 ? 'orange-400' : 'accent-red'
    }
}
```

---

## 4. Métricas Moneyball Avanzadas

### Métrica 1: Índice de Regularidad (IR)
Mide consistencia de puntuación. IR alto = jugador predecible.
```javascript
// CV invertido: menor variación = mayor regularidad
const regularityIndex = 100 - (stdDev / mean * 100)
```

### Métrica 2: Impacto según Rival (ISR)
ISR > 1 = rinde mejor contra grandes.
```javascript
const isr = avgVsStrong / avgVsWeak
// ISR > 1.2 = "JUGADOR BIG GAME"
```

### Métrica 3: Eficiencia por Minuto (EPM)
Puntos por cada 90' jugados. Detecta supersubs.
```javascript
const epm = (totalPoints / totalMinutes) * 90
```

---

## 5. Roadmap de Desarrollo: Top 5 Mejoras

| # | Mejora | Impacto | Esfuerzo | Archivos |
|:-:|--------|:-------:|:--------:|----------|
| 🥇 | Puntos últimas 5 jornadas | ⭐⭐⭐⭐⭐ | 3 días | `api.js`, `PlayerProModal.jsx` |
| 🥈 | % Probabilidad Titularidad | ⭐⭐⭐⭐⭐ | 2 días | `usePlayerAnalytics.js` |
| 🥉 | Gráfico evolución valor | ⭐⭐⭐⭐ | 2 días | `marketTrendsService.js` |
| 4 | Comparativa vs posición | ⭐⭐⭐⭐ | 1 día | `usePlayerValuation.js` |
| 5 | Métricas Moneyball (IR, ISR, EPM) | ⭐⭐⭐⭐ | 3 días | `Intelligence.jsx` |

---

## 6. Modificaciones Técnicas

### `api.js` - Nuevos Endpoints
```javascript
async getPlayerWeeklyStats(playerId, weeks = 5) {
    return axios.get(`${API}/player/${playerId}/weekStats?limit=${weeks}`)
}
```

### Inferencia de Titularidad
Si la API no provee el dato directamente, usar **cálculo local** basado en minutos (implementado arriba).

---

## Conclusión

> Alcantasy tiene ventajas únicas (Espionaje, Moneyball, Clausulazos) que la app oficial no ofrece. El módulo **"Ficha de Jugador Pro"** cerraría los gaps críticos y posicionaría a Alcantasy como **la herramienta definitiva** para dominar LaLiga Fantasy.
