# Registro de Lógica de Prompts (Antigravity)

## Interacción 1: Inicialización de Rol (Prompt Architect)
** Fecha:** 2025-12-19
**Input Original:** Definición de rol "Arquitecto de Prompts de IA y Experto en Contexto de Código". Solicitud de crear este log y seguir protocolo estricto.

### Análisis de Contexto
- **Proyecto:** Alcantasy (Fantasy Manager).
- **Estado Actual:** Se acaba de parchear `Dashboard.jsx` para arreglar el matching de usuarios en el ranking.
- **Calidad de Código:** El parche anterior introdujo lógica compleja (`findIndex` con múltiples condiciones y logs) directamente en el componente, violando principios de Clean Code (Single Responsibility).

### Lógica de Mejora (Prompt Maestro)
- **Objetivo:** Formalizar el protocolo y refactorizar el último cambio para cumplir con los estándares de "Experto en Contexto".
- **Acción:**
    1.  Documentar este archivo.
    2.  Extraer la lógica de búsqueda de usuario a una función pura o helper.
    3.  Asegurar que el debugging se mantenga pero de forma estructurada.

### Prompt Maestro Generado
> "Crea el archivo de registro `PROMPT_LOGIC_INSTRUCTIONS.md`. Analiza `Dashboard.jsx` y refactoriza la lógica de búsqueda de usuario (actualmente inline y desordenada) extrayéndola a una función auxiliar `findUserInRanking(ranking, user)` que maneje la comparación por ID y fallback por nombre, manteniendo los logs de depuración pero limpiando el cuerpo principal del componente."

## Interacción 2: Depuración Profunda - Matching Fallido y Presupuestos Invisibles
**Fecha:** 2025-12-19
**Input Original:** "Sigue sin ponerse bien el boton de inicio... Mis Puntos - ... Por otro lado no aparecen los presupuestos de cada manager..."

### Análisis de Contexto
- **Problema 1 (Dashboard):** El usuario sigue "invisible" para la app. `findUserInRanking` devuelve -1. La estrategia de ID y Nombre falló.
- **Problema 2 (Intelligence):** "No aparecen los presupuestos". Esto indica que `useRivalSpy` no está calculando o no tiene datos de entrada (`activity` o `ranking`) válidos, o el componente no los muestra.
- **Hipótesis:**
    1. El objeto `user` en el store tiene una estructura diferente a la asumida (ej. `sub` vs `id` vs `uid`).
    2. Los nombres en `ranking` tienen caracteres especiales o formatos distintos.
    3. `useRivalSpy` puede estar fallando silenciosamente si el `ranking` no tiene la estructura de managers esperada.

### Lógica de Mejora (Prompt Maestro)
- **Estrategia:** Dejar de adivinar. Necesitamos visibilidad real de los datos en tiempo de ejecución.
- **Acción:**
    1. Inspeccionar `src/services/authService.js` para ver cómo se construye el objeto `user`.
    2. Implementar un **Debug Overlay** temporal en `Dashboard.jsx` que muestre el JSON crudo del `user` y del primer elemento del `ranking`. Esto permitirá al usuario (o a nosotros vía screenshot) ver la discrepancia exacta.
    3. Revisar la integración de `useRivalSpy` en `Intelligence.jsx` para asegurar que los datos fluyen.

### Prompt Maestro Generado
> "Analiza `src/services/authService.js` para confirmar la estructura del usuario. Luego, inyecta un componente de depuración visual (`<div className='fixed bottom-0 right-0 ...'>`) en `Dashboard.jsx` que renderice `JSON.stringify(user)` y `JSON.stringify(ranking[0])`. Esto es crítico para resolver el desajuste de datos que persiste a pesar de los intentos anteriores."

## Interacción 3: Validación de Saldo (Sueldo) y Visibilidad de Usuario
**Fecha:** 2025-12-19
**Input Original:** "Revisa que el sueldo se calcula bien... permite el saldo negativo... quier que aparezca mi manager Alcatamy eSports by..."

### Análisis de Contexto
- **Terminología:** El usuario dice "sueldo" pero el contexto de "saldo negativo" y los 103M iniciales confirman que se refiere al **Saldo (Balance)** del equipo.
- **Requerimiento 1 (Lógica):** Permitir saldos negativos. Actualmente `useRivalSpy` hace `Math.max(0, saldo)`. Esto oculta deudas.
- **Requerimiento 2 (Visibilidad):** El usuario quiere ver su propio equipo ("Alcatamy") en la lista de espionaje para auditar si el cálculo es correcto. Actualmente se filtra con `.filter(m => m.esRival)`.

### Lógica de Mejora (Prompt Maestro)
- **Acción:** Modificar `src/hooks/useRivalSpy.js`.
    1.  Eliminar el `Math.max(0, ...)` para revelar la cruda realidad financiera.
    2.  Modificar el filtro de retorno. En lugar de excluir al usuario (`esRival`), lo incluiremos siempre (o al menos si es Alcatamy) para que pueda "monitorear".
    3.  Mantener la bandera `esRival` para posibles usos de UI (resaltar cual es el user), pero no filtrar la lista principal.

### Prompt Maestro Generado
> "Edita `src/hooks/useRivalSpy.js`. 1) Elimina la restricción `Math.max(0)` en `saldoEstimado` para permitir valores negativos. 2) Modifica el filtro final `filter(m => m.esRival)` para que NO excluya al usuario actual (o específicamente a 'Alcatamy'), permitiendo que aparezca en la lista devuelta por `rivalBalances`. Esto es necesario para que el usuario pueda auditar su propio cálculo de saldo."

## Interacción 4: Discrepancia Masiva de Saldos (Auditoría Financiera)
**Fecha:** 2025-12-19
**Input Original:** "No me cuadran los saldos... esto es lo que debería cuadrar [Tabla con Vigar FC -61M, Alcatamy 9M]... he calculado esto a día de hoy [Firebase URL]"

### Análisis de Contexto
- **Problema:** Los saldos calculados por nuestra app difieren drásticamente de la "Verdad" (Excel/Firebase del usuario).
- **Causa Raíz Identificada:** `Intelligence.jsx` solo llama a `fantasyAPI.getLeagueActivity(leagueId, 0)`. Esto trae solo los últimos 50-100 eventos. Una liga en Jornada 17 tiene miles de eventos. **Falta todo el historial.**
- **Evidencia:** Vigar FC tiene -61M. Para llegar a eso desde 100M, ha tenido que gastar 160M más de lo que ingresó. Eso son muchos fichajes que no estamos "viendo" en la página 0.

### Lógica de Mejora (Prompt Maestro)
- **Estrategia:** Implementar "Deep Fetching" (Paginación Recursiva) para la actividad.
- **Acción:**
    1.  Modificar `Intelligence.jsx` (o `api.js`) para iterar llamadas a `getLeagueActivity(id, page)` incrementando `page` hasta recibir un array vacío o menor al limit.
    2.  Acumular TODA la actividad en un solo array `allActivity`.
    3.  Pasar este array masivo a `useRivalSpy`.
- **Consideración:** Esto será lento. Necesitaremos indicador de carga progresivo o hacerlo en background, pero por ahora la prioridad es la precisión.

### Prompt Maestro Generado
> "Analiza `Intelligence.jsx`. La función `loadAllData` solo carga la página 0 de actividad (`getLeagueActivity(..., 0)`). Reemplaza esto con una lógica de paginación que, dentro de un bucle `while` o función recursiva, solicite páginas incrementales (0, 1, 2...) hasta que la API no devuelva más resultados. Concatena todos los resultados en `parsedActivity` antes de pasarlo al hook. Esto es indispensable para reconstruir el saldo financiero completo de la temporada."

## Interacción 5: Error de Lógica Contable (Saldos Billonarios)
**Fecha:** 2025-12-19
**Input Original:** "No me cuadran los saldos... GOLENCIERRO FC -2038M... una compra de un jugador a otro es ganancia y perdida..."

### Análisis de Contexto
- **Problema:** Los saldos están inflados en un orden de magnitud (Billones en vez de Millones) y son extremadamente negativos.
- **Diagnóstico:**
    1.  **Magnitud (Billones):** Es probable que estemos sumando "Valores de Mercado" o "Cláusulas" en vez de precios de transferencia en algunos casos, o duplicando masivamente.
    2.  **Lógica Unidireccional:** El usuario señala que "una compra es ganancia para uno y perdida para otro". Si el código actual solo mira `activity.userId`, solo cuenta la ACCIÓN (el que ficha gasta).
    3.  **Falta del Vendedor:** Si Manager A ficha a Messi de Manager B, A gasta dinero, pero B ingresa dinero. Si el feed de actividad dice "A fichó a Messi", el código debe ser lo suficientemente inteligente para buscar quién era el dueño anterior (B) y sumarle el dinero.
    4.  **Estructura de Datos:** Necesitamos ver si el objeto `activity` trae la info del `sellerTeamId` o `sellerManagerId`. Si no, será difícil atribuir la venta.

### Lógica de Mejora (Prompt Maestro)
- **Acción:** Reescribir el reducer principal de `useRivalSpy.js`.
    - Iterar SOBRE LAS ACTIVIDADES, no sobre los managers.
    - Para cada actividad:
        - Identificar `Buyer` (userId / managerId).
        - Identificar `Seller` (sourceTeamId / sellerManagerId).
        - Aplicar `Buyer.balance -= amount`.
        - Aplicar `Seller.balance += amount`.
    - Revisar tipos de actividad:
        - Fichaje (Mercado): Buyer paga, Nadie recibe (banca).
        - Fichaje (Manager): Buyer paga, Seller recibe.
        - Clausulazo: Buyer paga, Seller recibe.
        - Venta (Mercado): Seller recibe, Nadie paga.

### Prompt Maestro Generado
> "Revisa y reescribe la lógica de cálculo en `useRivalSpy.js`. Actualmente itera managers y filtra actividades, lo cual es ineficiente y propenso a errores unidireccionales. Cambia el enfoque: crea un mapa de saldos inicializado en 0. Itera UNA VEZ sobre `allActivity`. Para cada transacción, identifica si hay un comprador (restar dinero) y un vendedor (sumar dinero). Asegúrate de manejar correctamente `type: 'transfer'` (compra a mercado vs compra a manager) y `type: 'clause'` (clausulazo). Esto es vital para que las ventas entre jugadores reflejen ingresos pasivos."
