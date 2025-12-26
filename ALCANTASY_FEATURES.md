# Alcantasy - Documentación Completa de Funcionalidades

> **Aplicación web para gestión avanzada de LaLiga Fantasy**

---

## 🏠 Dashboard (Panel Principal)

### Funcionalidades Actuales
- Resumen de ligas del usuario
- Estadísticas del equipo propio (puntos, dinero, valor)
- Vista rápida del ranking (top 5)
- Feed de actividad reciente de la liga
- Panel de insights con alertas inteligentes

### Datos Mostrados
- Puntos totales y por jornada
- Saldo disponible
- Valor del equipo
- Posición en el ranking

---

## 📋 Alineación (Lineup)

### Funcionalidades Actuales
- Visualización de la alineación en formato campo de fútbol
- Selección de jornada (pasada, actual, futura)
- Estadísticas de cada jugador en la plantilla
- Vista de formación táctica

### Datos Mostrados
- Jugadores titulares y suplentes
- Puntos por jugador
- Posición en el campo
- Estado del jugador (lesionado, sancionado, etc.)

---

## 🏆 Clasificación (Standings)

### Funcionalidades Actuales
- Ranking completo de la liga
- Estadísticas comparativas entre managers
- Valor de equipos
- Puntos acumulados por jornada

### Datos Mostrados
- Posición, nombre, puntos
- Valor del equipo
- Máximo goleador
- Tendencia de puntos

---

## 🛒 Mercado (Market)

### Funcionalidades Actuales
- Listado de jugadores en el mercado libre
- Filtros por posición (PT, DF, MC, DL)
- Búsqueda por nombre
- Ordenación por precio, puntos, valor
- Modal de detalle de jugador
- Sistema de pujas (BidModal)

### Algoritmos Implementados
- Cálculo de ratio puntos/precio
- Detección de tendencias de valor
- Tracking de propietarios anteriores

---

## 👥 Jugadores (Players)

### Funcionalidades Actuales
- Catálogo completo de jugadores de LaLiga
- Filtros avanzados (posición, equipo, estado mercado)
- Infinite scroll para carga optimizada
- Tarjetas con datos de rendimiento
- Información de propietario actual

### Datos Mostrados
- Nombre, equipo, posición
- Puntos totales y promedio
- Valor de mercado
- Cláusula de rescisión
- Tendencia de valor (↑↓)

---

## 📜 Cláusulas (Clauses)

### Funcionalidades Actuales
- Listado de cláusulas de todos los jugadores
- Cálculo de inversión en cláusulas por manager
- Ordenación y búsqueda
- Estadísticas de blindajes

### Datos Mostrados
- Jugador, propietario, cláusula actual
- Incremento diario de cláusula
- Historial de subidas

---

## ⚽ Partidos (Matches)

### Funcionalidades Actuales
- Calendario de jornadas de LaLiga
- Resultados y próximos partidos
- Selección de semana

### Datos Mostrados
- Equipos, fecha, hora
- Resultado (si disponible)
- Estadio

---

## 📊 Actividad (Activity)

### Funcionalidades Actuales
- Feed completo de movimientos de la liga
- Filtros por tipo (fichajes, ventas, cláusulas, premios)
- Paginación con deep fetching (carga histórica completa)
- Iconos y colores por tipo de actividad

### Tipos de Actividad
| Tipo | Descripción |
|------|-------------|
| COMPRA_MANAGER (1) | Compra entre managers |
| VENTA_MANAGER (2) | Venta entre managers |
| CLAUSULA_PAGADA (3) | Pago de cláusula |
| CLAUSULA_COBRADA (4) | Cobro de cláusula |
| BLINDAJE (5) | Subida manual de cláusula |
| PREMIO_JORNADA (6) | Premio por ganar jornada |
| RECOMPENSA (7) | Recompensa diaria/anuncio |
| SUBIDA_CLAUSULA (9) | Subida automática |
| FICHAJE_MERCADO (31) | Compra del mercado libre |
| VENTA_MERCADO (33) | Venta al mercado libre |

---

## 🧠 Inteligencia Competitiva (Intelligence) - **MÓDULO PREMIUM**

### Funcionalidades Actuales

#### 1. Espionaje Financiero (Rival Spy)
- **Estimación de saldos** de todos los rivales
- **Análisis de patrones** de compra (Agresivo, Vendedor, Pasivo)
- **Tracking de Firebase** con inversión real en cláusulas
- **Historial** de cada subida de cláusula por manager
- **Input editable** para registrar gastos en blindajes

#### 2. Algoritmo Moneyball (Player Valuation)
- **Detección de Gangas**: Jugadores con alto rendimiento y bajo precio
- **Detección de Sobrevalorados**: Jugadores con bajo rendimiento y alto precio
- **Ratio puntos/millón**: Ordena jugadores por eficiencia
- **Etiquetas automáticas**: 🟢 GANGA, 🔴 TRAP, 🟡 ESPECULACIÓN

#### 3. Francotirador de Cláusulas (Clause Sniper)
- **Oportunidades de clausulazo**: Jugadores con cláusula < valor mercado
- **Alertas de riesgo**: Tus jugadores vulnerables a ser clausulados
- **Filtro por asequibilidad**: Solo muestra los que puedes pagar
- **Cálculo de ROI**: Ratio cláusula/valor para detectar chollos

### Hooks de Inteligencia
| Hook | Función |
|------|---------|
| `useRivalSpy` | Calcula saldos estimados de rivales |
| `usePlayerValuation` | Analiza ratio puntos/precio |
| `useClauseSniper` | Detecta oportunidades de cláusulas |

---

## 🔥 Servicios (Backend Services)

### API Principal (`api.js`)
- Conexión con LaLiga Fantasy API
- Autenticación Bearer Token
- Endpoints: ligas, ranking, mercado, actividad, equipos

### Firebase Service (`firebaseService.js`)
- Base de datos de inversión en cláusulas
- Historial de blindajes por manager
- Sincronización en tiempo real

### Market Trends (`marketTrendsService.js`)
- Análisis de tendencias de valor
- Detección de subidas/bajadas
- Histórico de precios

### Player Ownership (`playerOwnershipService.js`)
- Tracking de propietarios de jugadores
- Historial de traspasos

### Team Service (`teamService.js`)
- Gestión de datos de equipos
- Sincronización de plantillas

---

## 📱 Interfaz de Usuario

### Diseño
- **Tema oscuro** con glassmorphism
- **Responsive** (móvil y escritorio)
- **Navegación** por pestañas
- **Modales** para detalles y acciones
- **Toasts** para notificaciones
- **Infinite scroll** para listas largas
- **Skeleton loaders** durante carga

### Colores Semánticos
| Color | Significado |
|-------|-------------|
| Verde (neon-green) | Positivo, ganancia, ganga |
| Rojo (accent-red) | Negativo, pérdida, riesgo |
| Azul (neon-blue) | Neutral, información |
| Naranja | Cláusulas, inversiones |
| Rosa (neon-pink) | Destacado, premium |

---

## 💡 Ideas para Nuevas Funcionalidades

### 📈 Análisis Avanzado
- [ ] Predicción de puntos basada en calendario
- [ ] Machine learning para detectar gangas
- [ ] Análisis de rendimiento por rival enfrentado
- [ ] Simulador de jornada

### 🔔 Alertas y Notificaciones
- [ ] Push notifications para ofertas por tus jugadores
- [ ] Alertas de bajada de precio de jugadores watchlist
- [ ] Recordatorio de alineación antes de jornada

### 📊 Estadísticas
- [ ] Gráficos de evolución de patrimonio
- [ ] Comparativa histórica entre managers
- [ ] Heatmap de puntos por jornada
- [ ] Análisis de "mejores fichajes" de la temporada

### 🎮 Gamificación
- [ ] Logros y badges
- [ ] Predicciones de resultados
- [ ] Ligas privadas con reglas personalizadas

### 🛠️ Herramientas
- [ ] Planificador de traspasos
- [ ] Calculadora de ROI de jugadores
- [ ] Exportar datos a Excel/CSV
- [ ] API pública para integraciones

---

## 🗂️ Estructura del Proyecto

```
Alcantasy/
├── src/
│   ├── components/          # 17 componentes React
│   │   ├── Dashboard.jsx
│   │   ├── Intelligence.jsx
│   │   ├── Market.jsx
│   │   └── ...
│   ├── hooks/               # 3 hooks de inteligencia
│   │   ├── useRivalSpy.js
│   │   ├── usePlayerValuation.js
│   │   └── useClauseSniper.js
│   ├── services/            # 6 servicios
│   │   ├── api.js
│   │   ├── firebaseService.js
│   │   └── ...
│   ├── stores/              # Zustand stores
│   └── App.jsx
├── index.html
└── package.json
```

---

## 🔗 Integraciones Externas

| Servicio | Uso |
|----------|-----|
| **LaLiga Fantasy API** | Datos de jugadores, mercado, actividad |
| **Firebase Realtime DB** | Persistencia de inversiones en cláusulas |
| **React Hot Toast** | Notificaciones en UI |
| **Lucide Icons** | Iconografía |
