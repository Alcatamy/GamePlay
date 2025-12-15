import os
import re
import json
from playwright.sync_api import sync_playwright

TARGET_URL = "https://www.analiticafantasy.com/fantasy-la-liga/mercado"
OUTPUT_FILE = "market_data.js"

def run():
    # 1. Load Previous Data
    old_data = {}
    if os.path.exists(OUTPUT_FILE):
        try:
            with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
                content = f.read()
                # Extract JSON from "const MARKET_DATA = { ... };"
                match = re.search(r'const MARKET_DATA = ({.*?});', content, re.DOTALL)
                if match:
                    old_data = json.loads(match.group(1))
                    print(f"Datos previos cargados: {len(old_data)} registros.")
        except Exception as e:
            print(f"No se pudieron leer datos previos: {e}")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        print(f"Navegando a {TARGET_URL}...")
        page.goto(TARGET_URL)
        
        # Accept Cookies
        try:
            page.get_by_text("Aceptar", exact=False).first.click(timeout=5000)
            print("Cookies aceptadas.")
        except:
            print("Sin popup de cookies.")

        # Scroll
        print("Cargando lista completa...")
        prev_height = 0
        for _ in range(25):
            page.mouse.wheel(0, 5000)
            page.wait_for_timeout(1000)
            curr_height = page.evaluate("document.body.scrollHeight")
            if curr_height == prev_height:
                break
            prev_height = curr_height
        
        # Extract
        content = page.content()
        new_data = {}
        count = 0
        
        # Regex for Name/Value
        matches = re.findall(r'MuiTypography-body2[^>]*>\s*([^<]+)<\/p>.*?MuiTypography-body1[^>]*>\s*([\d\.]+) €<\/p>', content, re.DOTALL)
        
        for name, price_str in matches:
            try:
                clean_name = name.strip()
                clean_price = int(price_str.replace(".", ""))
                if len(clean_name) > 50 or clean_price < 100: continue
                new_data[clean_name] = clean_price
                count += 1
            except:
                pass

        print(f"Extraídos {count} jugadores actuales.")
        
        if count == 0:
            raise Exception("Abortando: No se extrajeron datos.")

        # Calculate Trends
        trends = {}
        for name, val in new_data.items():
            old_val = old_data.get(name)
            if old_val:
                diff = val - old_val
                pct = (diff / old_val) * 100 if old_val > 0 else 0
                trends[name] = { "diff": diff, "pct": round(pct, 2), "prev": old_val }
            else:
                trends[name] = { "diff": 0, "pct": 0, "new": True }

        # Save Both
        js_content = f"const MARKET_DATA = {json.dumps(new_data, indent=4, ensure_ascii=False)};\n"
        js_content += f"const MARKET_TRENDS = {json.dumps(trends, indent=4, ensure_ascii=False)};\n"
        
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            f.write(js_content)
        
        print(f"Datos guardados con tendencias en {OUTPUT_FILE}")
        browser.close()

if __name__ == "__main__":
    run()
