# 📊 PRD: Fantasy Analytics Dashboard

> **Especificación Funcional y Técnica v1.0**

---

## 1. Arquitectura de Base de Datos (JSON Schema)

### 1.1 Entidad: `Manager`

```typescript
interface Manager {
  id: string;                    // UUID
  name: string;                  // "Alcatamy eSports By"
  leagueId: string;
  
  // Financieros
  initialBudget: number;         // 100_000_000 | 103_000_000
  currentBalance: number;        // Saldo actual estimado
  patrimony: number;             // Valor total del equipo
  
  // Calculados
  totalInvested: number;         // Suma de todas las compras
  totalRecovered: number;        // Suma de todas las ventas
  clauseExpenses: number;        // Gasto en blindajes (Firebase)
  
  // Métricas derivadas
  roi: ROIMetrics;
  spread: SpreadByPosition;
  classification: ManagerType;   // "SNIPER" | "DERROCHADOR" | "EQUILIBRADO"
  
  // Historial
  operations: TransferOperation[];
  weeklyPatrimony: number[];     // Evolución semanal
}

interface ROIMetrics {
  realized: number;              // (Ventas - Compras vendidas) / Compras vendidas
  latent: number;                // (Valor actual plantilla - Coste) / Coste
  total: number;                 // ROI global
}

interface SpreadByPosition {
  PT: number;                    // % inversión en porteros
  DF: number;                    // % inversión en defensas  
  MC: number;                    // % inversión en mediocentros
  DL: number;                    // % inversión en delanteros
}

type ManagerType = "SNIPER" | "DERROCHADOR" | "MANOS_MANTEQUILLA" | "EQUILIBRADO";
```

### 1.2 Entidad: `TransferOperation`

```typescript
interface TransferOperation {
  id: string;
  managerId: string;
  type: "COMPRA" | "VENTA" | "CLAUSULA_PAGADA" | "CLAUSULA_COBRADA";
  
  // Jugador
  playerId: string;
  playerName: string;
  position: "PT" | "DF" | "MC" | "DL";
  
  // Financiero
  amount: number;                // Precio de la operación
  marketValueAtTime: number;     // Valor mercado en el momento
  overbidAmount: number;         // amount - marketValueAtTime
  overbidPercent: number;        // (overbidAmount / marketValueAtTime) * 100
  
  // Temporal
  date: string;                  // ISO 8601
  week: number;                  // Jornada
  
  // Post-análisis (solo ventas)
  holdingDays?: number;          // Días que tuvo al jugador
  profitLoss?: number;           // Beneficio/pérdida realizado
}
```

### 1.3 Entidad: `MarketTrend`

```typescript
interface MarketTrend {
  playerId: string;
  playerName: string;
  position: string;
  teamName: string;
  
  // Valores
  currentValue: number;
  previousValue: number;         // Hace 24h
  weekAgoValue: number;
  monthAgoValue: number;
  
  // Tendencias calculadas
  dailyChange: number;           // %
  weeklyChange: number;          // %
  monthlyChange: number;         // %
  trend: "SUBIENDO" | "BAJANDO" | "ESTABLE";
  
  // Volumen
  transferCount: number;         // Veces traspasado esta temporada
  avgTransferPrice: number;
}
```

### 1.4 Entidad: `ManagerIntelligence`

```typescript
interface ManagerIntelligence {
  managerId: string;
  
  // Índices de comportamiento
  overbidIndex: number;          // Media de sobrepago en compras (0-100)
  sniperScore: number;           // Precisión en compras por debajo de valor
  panicSellIndex: number;        // Frecuencia de ventas con pérdida
  
  // Patrones de puja
  biddingPattern: {
    preferredHours: number[];    // Horas del día más activo
    avgBidsPerPlayer: number;
    winRate: number;             // % de pujas ganadas
  };
  
  // Mapa de necesidades
  needsMap: {
    PT: NeedLevel;
    DF: NeedLevel;
    MC: NeedLevel;
    DL: NeedLevel;
  };
  
  // Predicciones
  predictedNextMove: "COMPRA" | "VENTA" | "HOLD";
  riskLevel: "BAJO" | "MEDIO" | "ALTO";
}

type NeedLevel = "CUBIERTA" | "REFUERZO_OPCIONAL" | "NECESIDAD_URGENTE";
```

---

## 2. Especificación de Componentes UI

### 2.1 Vista A: Dashboard General (League Overview)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  🏆 LEAGUE OVERVIEW                                    [Liga Selector ▼]│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐        │
│  │ 📈 TOP ROI       │ │ 💰 TOP PATRIMONIO│ │ 🎯 EFICIENCIA    │        │
│  │ Manager1  +45%   │ │ Manager3  892M   │ │ Manager2  0.92   │        │
│  │ Manager2  +32%   │ │ Manager1  845M   │ │ Manager5  0.87   │        │
│  │ Manager4  +28%   │ │ Manager2  801M   │ │ Manager1  0.85   │        │
│  └──────────────────┘ └──────────────────┘ └──────────────────┘        │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │           📊 EFICIENCIA DE CAPITAL POR MANAGER                    │ │
│  │  [Stacked Bar Chart: Inversión vs Retorno por Manager]            │ │
│  │  ████████████████░░░░ Manager1 (Inv: 450M, Ret: 520M)             │ │
│  │  ████████████░░░░░░░░ Manager2 (Inv: 380M, Ret: 290M)             │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌────────────────────────────┐ ┌────────────────────────────────────┐ │
│  │ 🏅 CLASIFICACIÓN MANAGERS  │ │ 📉 FLUJO DE CAPITAL SEMANAL       │ │
│  │ ┌─────┬──────┬──────┬────┐ │ │ [Area Chart: Entradas vs Salidas] │ │
│  │ │ #   │ Name │ Type │ROI │ │ │                                    │ │
│  │ │ 1   │ Alka │SNIPER│+45%│ │ │       ╱╲    ╱╲                     │ │
│  │ │ 2   │ Pab  │EQUIL │+32%│ │ │   ___╱  ╲__╱  ╲___                 │ │
│  │ │ 3   │ Vig  │DERRO │-12%│ │ │                                    │ │
│  │ └─────┴──────┴──────┴────┘ │ └────────────────────────────────────┘ │
│  └────────────────────────────┘                                        │
└─────────────────────────────────────────────────────────────────────────┘
```

**Componentes React:**
```
components/
├── LeagueOverview/
│   ├── LeagueOverview.jsx       // Container
│   ├── TopROICard.jsx           // Ranking ROI
│   ├── TopPatrimonyCard.jsx     // Ranking Patrimonio
│   ├── CapitalEfficiencyChart.jsx  // Recharts StackedBar
│   ├── ManagerClassTable.jsx    // Tabla con badges
│   └── WeeklyFlowChart.jsx      // Recharts AreaChart
```

---

### 2.2 Vista B: Perfil de Manager (Deep Dive)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  👤 PERFIL: ALCATAMY ESPORTS BY                      [← Volver] [📤]   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│  │  PATRIMONIO │ │    ROI      │ │   OVERBID   │ │    TIPO     │       │
│  │   892.4M €  │ │   +45.2%    │ │    23.4     │ │   🎯 SNIPER │       │
│  │   ↑ +12.3M  │ │   🟢 TOP 1  │ │   🟡 MEDIO  │ │             │       │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘       │
│                                                                         │
│  ┌────────────────────────────┐ ┌────────────────────────────────────┐ │
│  │ 🕸️ SPREAD POR POSICIÓN     │ │ 🗺️ MAPA DE NECESIDADES             │ │
│  │                            │ │                                    │ │
│  │      PT (15%)              │ │  PT: 🟢🟢🟢 CUBIERTA              │ │
│  │        ╱╲                  │ │  DF: 🟡🟡⚪ REFUERZO OPCIONAL     │ │
│  │   DF ╱    ╲ DL             │ │  MC: 🟢🟢🟢 CUBIERTA              │ │
│  │  (35%)    (20%)            │ │  DL: 🔴🔴⚪ NECESIDAD URGENTE     │ │
│  │       ╲  ╱                 │ │                                    │ │
│  │      MC (30%)              │ │  Próxima compra predicha: DL      │ │
│  │   [Radar Chart]            │ │                                    │ │
│  └────────────────────────────┘ └────────────────────────────────────┘ │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ 📊 BALANCE COMPRAS/VENTAS                                         │ │
│  │ [Diverging Bar Chart: Positivo=Ganancias, Negativo=Pérdidas]      │ │
│  │                                                                   │ │
│  │  Pedri      ████████████████████  +45M    (Venta con beneficio)  │ │
│  │  Lewandowski████████████          +28M                            │ │
│  │  Yamal      ░░░░░░░░░░░░░░░░████  -18M    (Venta con pérdida)    │ │
│  │  Bellingham ░░░░░░░░░░░░░░░░░░██  -8M                             │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ 🎯 PATRONES DE PUJA                                               │ │
│  │ Hora favorita: 22:00-23:00 │ Win Rate: 67% │ Avg Bids: 3.2/jugador│ │
│  │ [Heatmap: Actividad por Hora/Día]                                 │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

**Componentes React:**
```
components/
├── ManagerProfile/
│   ├── ManagerProfile.jsx       // Container
│   ├── ProfileHeader.jsx        // Stats cards
│   ├── SpreadRadarChart.jsx     // Recharts RadarChart
│   ├── NeedsMapPanel.jsx        // Indicadores visuales
│   ├── BalanceDivergingBar.jsx  // Recharts BarChart (diverging)
│   ├── BiddingHeatmap.jsx       // Recharts/react-heatmap-grid
│   └── OperationsTable.jsx      // Historial de operaciones
```

---

### 2.3 Vista C: Mercado y Trading

```
┌─────────────────────────────────────────────────────────────────────────┐
│  📈 MERCADO & TRADING                     [Buscar...] [Pos ▼] [Trend ▼]│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌────────────────────────────┐ ┌────────────────────────────────────┐ │
│  │ 🏆 TOP NEGOCIOS            │ │ 💀 PEORES RUINAS                   │ │
│  │ (Mayor ROI realizado)      │ │ (Mayor pérdida realizada)          │ │
│  │                            │ │                                    │ │
│  │ 1. Pedri    +89% (+45M)   │ │ 1. Yamal     -32% (-18M)           │ │
│  │ 2. Modric   +67% (+28M)   │ │ 2. Endrick   -45% (-22M)           │ │
│  │ 3. Isco     +54% (+19M)   │ │ 3. Guler     -28% (-8M)            │ │
│  │ [Ver más →]                │ │ [Ver más →]                        │ │
│  └────────────────────────────┘ └────────────────────────────────────┘ │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ 📉 TENDENCIAS DE VALOR (Últimas 24h)                              │ │
│  │                                                                   │ │
│  │  🔺 SUBIENDO                    🔻 BAJANDO                        │ │
│  │  Bellingham  +4.2M (+2.8%)     Lewandowski  -3.1M (-1.9%)        │ │
│  │  Yamal       +2.8M (+1.5%)     Modric       -1.8M (-2.1%)        │ │
│  │  Pedri       +1.9M (+1.2%)     Ter Stegen   -0.9M (-0.8%)        │ │
│  │                                                                   │ │
│  │  [Line Chart: Top 5 jugadores más volátiles - 7 días]            │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ 📊 VOLUMEN DE MERCADO                                             │ │
│  │ [Bar Chart: Traspasos por día - Últimos 14 días]                  │ │
│  │ Total: 847 operaciones │ Promedio: 60.5/día │ Hoy: 72            │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

**Componentes React:**
```
components/
├── MarketTrading/
│   ├── MarketTrading.jsx        // Container
│   ├── TopDealsCard.jsx         // Lista de mejores negocios
│   ├── WorstDealsCard.jsx       // Lista de peores ruinas
│   ├── TrendingPlayers.jsx      // Subiendo/Bajando
│   ├── VolatilityLineChart.jsx  // Recharts LineChart
│   └── MarketVolumeBar.jsx      // Recharts BarChart
```

---

## 3. Diccionario de Métricas y Cálculos

### 3.1 Overbid Index (Índice de Sobrepago)

```javascript
/**
 * Calcula el índice de sobrepago de un manager
 * Rango: 0-100 (0=siempre compra por debajo, 100=siempre sobrepaga mucho)
 */
function calculateOverbidIndex(operations) {
    const purchases = operations.filter(op => op.type === "COMPRA");
    if (purchases.length === 0) return 50; // Neutral
    
    const overbidSum = purchases.reduce((sum, op) => {
        const overbidPercent = ((op.amount - op.marketValueAtTime) / op.marketValueAtTime) * 100;
        return sum + Math.max(-50, Math.min(50, overbidPercent)); // Clamp -50% to +50%
    }, 0);
    
    const avgOverbid = overbidSum / purchases.length;
    
    // Normalizar a 0-100
    return Math.round(50 + avgOverbid);
}

// Interpretación:
// 0-30:  SNIPER (compra por debajo de mercado)
// 31-60: EQUILIBRADO (compra cerca del valor)
// 61-100: DERROCHADOR (sobrepaga sistemáticamente)
```

### 3.2 Clasificación de Manager

```javascript
function classifyManager(manager) {
    const { roi, overbidIndex, panicSellIndex } = manager.intelligence;
    
    // SNIPER: ROI alto + Overbid bajo
    if (roi.total > 20 && overbidIndex < 35) {
        return "SNIPER";
    }
    
    // DERROCHADOR: Overbid alto + ROI negativo
    if (overbidIndex > 65 && roi.total < 0) {
        return "DERROCHADOR";
    }
    
    // MANOS DE MANTEQUILLA: Panic sell alto + muchas pérdidas
    if (panicSellIndex > 60) {
        return "MANOS_MANTEQUILLA";
    }
    
    return "EQUILIBRADO";
}
```

### 3.3 ROI Realizado vs Latente

```javascript
function calculateROI(manager) {
    const { operations, patrimony } = manager;
    
    // Operaciones cerradas (compras que ya se vendieron)
    const closedOps = operations.filter(op => op.profitLoss !== undefined);
    const totalCostClosed = closedOps.reduce((s, op) => s + op.amount, 0);
    const totalReturnClosed = closedOps.reduce((s, op) => s + op.amount + op.profitLoss, 0);
    
    // ROI Realizado: Beneficio de operaciones cerradas
    const roiRealized = totalCostClosed > 0 
        ? ((totalReturnClosed - totalCostClosed) / totalCostClosed) * 100 
        : 0;
    
    // ROI Latente: Valor actual plantilla vs coste de adquisición
    const currentHoldingsCost = manager.totalInvested - closedOps.reduce((s, op) => s + op.amount, 0);
    const roiLatent = currentHoldingsCost > 0
        ? ((patrimony - currentHoldingsCost) / currentHoldingsCost) * 100
        : 0;
    
    // ROI Total
    const roiTotal = (roiRealized * 0.4) + (roiLatent * 0.6); // Peso mayor al latente
    
    return { realized: roiRealized, latent: roiLatent, total: roiTotal };
}
```

### 3.4 Spread por Posición

```javascript
function calculateSpread(operations) {
    const purchases = operations.filter(op => op.type === "COMPRA");
    const totalInvested = purchases.reduce((s, op) => s + op.amount, 0);
    
    if (totalInvested === 0) return { PT: 25, DF: 25, MC: 25, DL: 25 };
    
    const byPosition = { PT: 0, DF: 0, MC: 0, DL: 0 };
    
    purchases.forEach(op => {
        byPosition[op.position] += op.amount;
    });
    
    return {
        PT: Math.round((byPosition.PT / totalInvested) * 100),
        DF: Math.round((byPosition.DF / totalInvested) * 100),
        MC: Math.round((byPosition.MC / totalInvested) * 100),
        DL: Math.round((byPosition.DL / totalInvested) * 100)
    };
}
```

### 3.5 Mapa de Necesidades

```javascript
function calculateNeedsMap(manager, playersByPosition) {
    const IDEAL_COUNT = { PT: 2, DF: 5, MC: 5, DL: 4 };
    const IDEAL_AVG_VALUE = { PT: 30_000_000, DF: 40_000_000, MC: 50_000_000, DL: 60_000_000 };
    
    const needs = {};
    
    for (const pos of ["PT", "DF", "MC", "DL"]) {
        const players = playersByPosition[pos] || [];
        const count = players.length;
        const avgValue = players.reduce((s, p) => s + p.value, 0) / count || 0;
        
        const countScore = count >= IDEAL_COUNT[pos] ? 1 : count / IDEAL_COUNT[pos];
        const valueScore = avgValue >= IDEAL_AVG_VALUE[pos] ? 1 : avgValue / IDEAL_AVG_VALUE[pos];
        
        const overallScore = (countScore * 0.4) + (valueScore * 0.6);
        
        needs[pos] = overallScore >= 0.8 ? "CUBIERTA" :
                     overallScore >= 0.5 ? "REFUERZO_OPCIONAL" :
                     "NECESIDAD_URGENTE";
    }
    
    return needs;
}
```

---

## 4. Librerías de Visualización Recomendadas

| Métrica | Tipo de Gráfico | Librería | Componente |
|---------|-----------------|----------|------------|
| Spread por Posición | Radar/Spider | Recharts | `<RadarChart>` |
| Patrones de Puja | Heatmap | react-heatmap-grid | `<HeatMap>` |
| Balance +/- | Diverging Bar | Recharts | `<BarChart>` con layout vertical |
| Evolución Patrimonio | Area Chart | Recharts | `<AreaChart>` |
| Tendencias Valor | Line Chart | Recharts | `<LineChart>` |
| Volumen Mercado | Bar Chart | Recharts | `<BarChart>` |
| Comparativa Managers | Stacked Bar | Recharts | `<BarChart>` stackId |

---

## 5. Paleta de Colores Semánticos

```css
:root {
  /* Financieros */
  --profit: #10B981;        /* Verde - Ganancias */
  --loss: #EF4444;          /* Rojo - Pérdidas */
  --neutral: #6B7280;       /* Gris - Neutral */
  
  /* Clasificación Manager */
  --sniper: #8B5CF6;        /* Púrpura */
  --derrochador: #F59E0B;   /* Naranja */
  --manos-mantequilla: #EC4899; /* Rosa */
  --equilibrado: #3B82F6;   /* Azul */
  
  /* Necesidades */
  --cubierta: #10B981;      /* Verde */
  --refuerzo: #F59E0B;      /* Amarillo */
  --urgente: #EF4444;       /* Rojo */
}
```

---

## 6. Resumen de Implementación

| Fase | Entregable | Esfuerzo |
|:----:|------------|:--------:|
| 1 | Data Models + Hooks de cálculo | 3 días |
| 2 | Vista A: League Overview | 4 días |
| 3 | Vista B: Manager Profile | 5 días |
| 4 | Vista C: Market Trading | 3 días |
| 5 | Testing + Polish | 2 días |
| **Total** | **Dashboard Completo** | **17 días** |
