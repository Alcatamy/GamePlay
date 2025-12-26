# 🔐 Instrucciones de Acceso - Alcantasy

## Requisitos Previos
1. **Cuenta activa** en [LaLiga Fantasy](https://fantasy.laliga.com/)
2. **Navegador moderno** (Chrome, Firefox, Edge)
3. **Node.js 18+** instalado

---

## Paso 1: Obtener el Token de Autenticación

1. Abre **LaLiga Fantasy** en tu navegador: `https://fantasy.laliga.com/`
2. Inicia sesión con tu cuenta
3. Abre las **DevTools** (F12 o Ctrl+Shift+I)
4. Ve a la pestaña **Application** (Chrome) o **Storage** (Firefox)
5. En el panel izquierdo, expande **Local Storage** → `https://fantasy.laliga.com`
6. Busca la clave `auth` o similar
7. Copia el **valor completo** (es un JSON con `access_token` y `refresh_token`)

---

## Paso 2: Iniciar el Servidor

```bash
cd c:\Users\adrian.alcaide\Documents\Fantasy\Alcantasy
npm install  # Solo la primera vez
npm run dev
```

El servidor arrancará en: `http://localhost:5173`

---

## Paso 3: Iniciar Sesión en Alcantasy

1. Abre `http://localhost:5173` en tu navegador
2. En el campo de texto, pega el JSON del token:

```json
{
  "access_token": "TU_ACCESS_TOKEN_AQUÍ",
  "refresh_token": "TU_REFRESH_TOKEN_AQUÍ"
}
```

3. Haz clic en **"Iniciar Sesión"**

---

## Solución de Problemas

| Problema | Solución |
|----------|----------|
| Token inválido | Obtén un token nuevo desde LaLiga Fantasy |
| Sesión expirada | Cierra sesión y vuelve a obtener el token |
| Error de CORS | Verifica que el servidor esté corriendo |
| Pantalla en blanco | Revisa la consola del navegador (F12) |

---

## Notas

- Los tokens expiran cada ~24 horas
- El `refresh_token` se usa para renovar automáticamente
- No compartas tu token con nadie (contiene acceso a tu cuenta)
