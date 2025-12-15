import os
import re
import json
from playwright.sync_api import sync_playwright

# URL del Mercado (Ajustar si es diferente)
TARGET_URL = "https://www.analiticafantasy.com/fantasy-la-liga/mercado"
OUTPUT_FILE = "market_data.js"

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        print(f"Navegando a {TARGET_URL}...")
        page.goto(TARGET_URL)
        
        # 1. Aceptar Cookies (Si aparece el modal)
        try:
            # Selector genérico para CMP de InMobi/Didomi/etc. Ajustar según necesidad.
            # Buscamos un botón que diga "Aceptar" o "Consentir"
            page.get_by_text("Aceptar", exact=False).first.click(timeout=5000)
            print("Cookies aceptadas (posiblemente).")
        except:
            print("No se detectó popup de cookies o ya estaba aceptado.")

        # 2. Cargar toda la lista (Scroll infinito)
        print("Desplazando para cargar jugadores...")
        # Hacemos scroll varias veces hasta que no crezca más o un límite seguro
        prev_height = 0
        for _ in range(20): # Intentar 20 scrolls
            page.mouse.wheel(0, 5000)
            page.wait_for_timeout(1000)
            curr_height = page.evaluate("document.body.scrollHeight")
            if curr_height == prev_height:
                break
            prev_height = curr_height
        
        # 3. Extraer Datos
        print("Extrayendo datos...")
        # Usamos los selectores que identificamos en el HTML original
        # Nombre: p con clase MuiTypography-body2
        # Valor: p con clase MuiTypography-body1 (dentro del mismo contenedor o adyacente)
        
        # Estrategia: Obtener todos los contenedores de cartas "MuiBox-root css-1j0r1in" (si la clase es estable)
        # O iterar pares nombre-valor.
        
        # Vamos a extraer todo el texto visible y usar Regex (más robusto si las clases cambian ligeramente)
        content = page.content()
        
        market_data = {}
        count = 0
        
        # Regex (Adaptada de la versión JS local)
        # Busca patrón: ...nombre... ...valor €...
        # Como es HTML renderizado, usaremos BeautifulSoup o Selectores Playwright es más limpio.
        
        # Playwright Selectors
        # Asumimos que cada jugador es una "Card". 
        # Si las clases son dinámicas (css-xyz), mejor buscar por estructura:
        # Un DIV que contiene un P (Nombre) y un P (Valor).
        
        # Buscamos elementos que contengan el símbolo €
        price_elements = page.get_by_text("€").all()
        
        for price_el in price_elements:
            try:
                # El texto es "12.345.678 €"
                price_text = price_el.inner_text()
                if "€" not in price_text: continue
                
                clean_price = int(price_text.replace(".", "").replace("€", "").strip())
                
                # El nombre suele estar PREVIO al precio en el DOM.
                # Intentamos buscar el elemento hermano anterior o padre->hijo anteror.
                # Estructura típica:
                # DIV
                #   DIV (Imagen)
                #   DIV (Info)
                #      P (Nombre)
                #      P (Precio)
                
                # Navegar al padre y buscar el otro P
                parent = price_el.locator("..") # Subir un nivel
                # Buscar cualquier otro P que NO sea el precio
                # A veces el nombre está en un div adyacente.
                
                # Fallback: Usar Regex sobre el HTML completo, es lo que nos funcionó genial en local.
                # Playwright devuelve el HTML renderizado (DOM).
                pass 
            except:
                continue

        # REGEX METHOD (Confirmed Robust)
        # Buscamos MuiTypography-body2 (Nombre) seguido cercanamente de MuiTypography-body1 (Precio)
        # Nota: En el HTML, NAME está en body2, VALOR en body1.
        
        # Pattern: <p class="...MuiTypography-body2...">Nombre</p> ... <p class="...MuiTypography-body1...">1.000.000 €</p>
        # python re.findall con DOTALL
        
        matches = re.findall(r'MuiTypography-body2[^>]*>\s*([^<]+)<\/p>.*?MuiTypography-body1[^>]*>\s*([\d\.]+) €<\/p>', content, re.DOTALL)
        
        for name, price_str in matches:
            try:
                # Limpieza
                clean_name = name.strip()
                clean_price = int(price_str.replace(".", ""))
                
                # Filtros básicos de validez
                if len(clean_name) > 50 or clean_price < 100: continue
                
                market_data[clean_name] = clean_price
                count += 1
            except:
                pass

        print(f"Extraídos {count} jugadores.")
        
        if count < 100:
            print("WARNING: Parecen pocos jugadores. ¿Falló la carga o el scroll?")
            # Forzamos error para no sobrescribir datos buenos con vacíos
            if count == 0:
                raise Exception("No se extrajeron datos.")

        # 4. Guardar JS
        js_content = f"const MARKET_DATA = {json.dumps(market_data, indent=4, ensure_ascii=False)};\n"
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            f.write(js_content)
        
        print(f"Datos guardados en {OUTPUT_FILE}")
        browser.close()

if __name__ == "__main__":
    run()
