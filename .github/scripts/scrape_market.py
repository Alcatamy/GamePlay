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
        except:
            pass

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
        
        # Regex for Position/Name/Value
        # Look for Position DIV (DL/MC/DF/PT) then Name P then Value P
        # Format: <div ...>DL</div> ... <p...Name</p> ... <p...Value €</p>
        
        matches = re.findall(r'position-color-[a-z]+[^>]*>\s*([A-Z]+)<\/div>.*?MuiTypography-body2[^>]*>\s*([^<]+)<\/p>.*?MuiTypography-body1[^>]*>\s*([\d\.]+) €<\/p>', content, re.DOTALL)
        
        for pos, name, price_str in matches:
            try:
                clean_name = name.strip()
                clean_price = int(price_str.replace(".", ""))
                clean_pos = pos.strip()
                
                if len(clean_name) > 50 or clean_price < 100: continue
                
                # Store object instead of simple int
                new_data[clean_name] = { "value": clean_price, "position": clean_pos }
                count += 1
            except:
                pass

        print(f"Extraídos {count} jugadores con posición.")
        
        if count == 0:
            # Fallback to old regex if position fails (robustness)
             print("Fallo en regex con posición, intentando solo nombre/valor...")
             matches = re.findall(r'MuiTypography-body2[^>]*>\s*([^<]+)<\/p>.*?MuiTypography-body1[^>]*>\s*([\d\.]+) €<\/p>', content, re.DOTALL)
             for name, price_str in matches:
                 try:
                    clean_name = name.strip()
                    clean_price = int(price_str.replace(".", ""))
                    new_data[clean_name] = { "value": clean_price, "position": "?" }
                    count += 1
                 except: pass

        if count == 0: raise Exception("No se extrajeron datos.")

        # Calculate Trends
        trends = {}
        # Also simplified simple_data for legacy compatibility if needed, 
        # But we will update index.html to handle objects.
        
        # We need a format for index.html.
        # Current index.html expects: marketData[name] = 123 (Number).
        # We should probably keep MARKET_DATA as simple map for compatibility, 
        # and add MARKET_INFO = { name: { pos: 'DL', val: 123 } }?
        # OR Update index.html to handle object.
        # User wants "Joy of Crown" -> needs Index Update.
        # So I will output enriched format.
        
        # However, to avoid Breaking index.html immediately, I can export BOTH.
        # MARKET_DATA_SIMPLE = { name: val }
        # MARKET_DATA_FULL = { name: { val, pos } }
        
        simple_data = {}
        full_data = {}
        
        for name, data in new_data.items():
            val = data["value"]
            pos = data["position"]
            simple_data[name] = val
            full_data[name] = { "v": val, "p": pos }
            
            # Trend
            prev = old_data.get(name)
            # Old data might be simple int or object depending on version
            prev_val = 0
            if isinstance(prev, int): prev_val = prev
            elif isinstance(prev, dict): prev_val = prev.get("value", 0) or prev.get("v", 0)
            
            if prev_val > 0:
                diff = val - prev_val
                pct = (diff / prev_val) * 100
                trends[name] = { "diff": diff, "pct": round(pct, 2) }
            else:
                 trends[name] = { "diff": 0, "pct": 0 }

        # Save
        js_content = f"const MARKET_DATA = {json.dumps(simple_data, indent=4, ensure_ascii=False)};\n"
        js_content += f"const MARKET_INFO = {json.dumps(full_data, indent=4, ensure_ascii=False)};\n"
        js_content += f"const MARKET_TRENDS = {json.dumps(trends, indent=4, ensure_ascii=False)};\n"
        
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            f.write(js_content)
        
        print(f"Datos guardados: DATA (Simple), INFO (Pos), TRENDS.")
        browser.close()

if __name__ == "__main__":
    run()
