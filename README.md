# GamePlay Manager ⚽📊

Single Page Application (SPA) para la gestión económica de ligas Fantasy.

## Características
- **Dashboard en Tiempo Real**: Cálculo automático de saldos, patrimonios y **Pujas Máximas**.
- **Magic Parser**: Copia y pega directamente desde la app móvil (Movimientos, Premios, Valores de equipo).
- **Gestión de Cláusulas**: Control detallado del gasto en protección de jugadores.
- **Fair Play Financiero**: Semáforo de endeudamiento permitido (20% del valor de plantilla).
- **Persistencia Híbrida**: Funciona con **Firebase** (Sincronización PC/Móvil) o **LocalStorage** (Modo Offline/Demo).

## Instalación y Configuración

### 1. Configurar Firebase (Opcional pero Recomendado)
Para tener sincronización en tiempo real entre tus dispositivos:
1.  Ve a [Firebase Console](https://console.firebase.google.com/).
2.  Crea un nuevo proyecto.
3.  Añade una "Web App".
4.  Copia las credenciales (`apiKey`, `authDomain`, etc.).
5.  Abre el archivo `index.html` con un editor de texto.
6.  Busca el bloque `const firebaseConfig` (cerca del final) y pega tus credenciales.

### 2. Ejecución
Simplemente abre el archivo `index.html` en cualquier navegador web moderno (Chrome, Edge, Safari de móvil).

## Cómo Usar

### Importar Datos (Magic Parser)
1.  Ve a la pestaña **Magic Parser**.
2.  Copia el texto de movimentos de tu app de fantasy.
3.  Pégalo en el recuadro grande.
4.  Pulsa **Procesar Datos**.

### Actualizar Valores de Equipo
Copia la lista de valores (formato con "PFSY") y pégala también en el Magic Parser. El sistema detectará automáticamente los valores y actualizará las fichas de los equipos.

### Gestión de Cláusulas
1.  Ve a la pestaña **Cláusulas**.
2.  Puedes añadir gastos uno a uno o usar el cuadro inferior para pegar una lista desde Excel/Archivo (Formato: `NombreEquipo [TABulador] Cantidad`).
