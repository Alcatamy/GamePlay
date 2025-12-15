import json
import re
import os
import datetime
from playwright.sync_api import sync_playwright

# --- CONFIG ---
OUTPUT_FILE = r'C:\Users\adrian.alcaide\Documents\Fantasy\market_data.js'
# If running in GitHub Actions, path might be different, but for local testing:
# OUTPUT_FILE = 'market_data.js' 

def scrape_market():
    print(f"[{datetime.datetime.now()}] Starting Comuniate (Relevo) Scrape...")
    
    market_data = {}   # Simple Map: Name -> Value
    market_info = {}   # Rich Data: Name -> { pos, points, team, etc }
    market_trends = {} # Trends: Name -> { trend, trendPct, etc }
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        try:
            print("Navigating to https://www.comuniate.com/mercado/fantasy ...")
            page.goto('https://www.comuniate.com/mercado/fantasy', timeout=60000)
            
            # 1. Switch to Relevo / LaLiga Fantasy tab
            print("Switching to Relevo/Fantasy View...")
            try:
                # Based on previous inspection, this selector works
                page.click('li[data-fantasy="relevo"]')
                page.wait_for_timeout(3000) # Ensure tab switches and content loads
            except Exception as e:
                print(f"Warning: Could not click 'Relevo' tab. Might already be active or selector changed. Error: {e}")

            # 2. Scroll to load all data (Infinite Scroll handling)
            print("Scrolling to load all players...")
            for i in range(15): # Scroll aggressive to ensure full list
                page.mouse.wheel(0, 10000)
                page.wait_for_timeout(800)
                
            # 3. Extract Data
            cards = page.query_selector_all('.ficha_jugador')
            print(f"Found {len(cards)} player cards.")
            
            for card in cards:
                text = card.inner_text()
                
                # --- NAME extraction ---
                name = "Unknown"
                name_el = card.query_selector('.titulo_ficha_jugador')
                if name_el:
                    name = name_el.inner_text().strip()
                else:
                    lines = text.split('\n')
                    for line in lines:
                        if len(line) > 3 and not any(x in line for x in ['€', 'PT', 'DF', 'MD', 'MC', 'DL']) and not line.isdigit():
                            name = line.strip()
                            break
                            
                # --- POSITION extraction ---
                pos = "UNK"
                badges = card.query_selector_all('.label-posicion')
                for b in badges:
                    b_txt = b.inner_text().strip().upper()
                    if b_txt in ['PT', 'DF', 'MD', 'MC', 'DL', 'CEN']:
                        pos = b_txt
                        break
                
                # --- POINTS extraction ---
                points = 0
                for b in badges:
                    b_txt = b.inner_text().strip()
                    # Points are digits, sometimes negative
                    if b_txt.lstrip('-').isdigit():
                        if b_txt not in ['PT', 'DF', 'MD', 'MC', 'DL']:
                            points = int(b_txt)
                            break
                            
                # --- PRICE extraction ---
                price = 0
                money_match = re.search(r'([\d\.]+)€', text)
                if money_match:
                    price = int(money_match.group(1).replace('.', ''))
                
                # --- TREND extraction ---
                trend = 0
                trend_el = card.query_selector('.success') or card.query_selector('.danger')
                if trend_el:
                    t_txt = trend_el.inner_text().strip()
                    try:
                        trend = int(t_txt.replace('.', '').replace('€', '').replace('+', ''))
                    except:
                        pass
                
                # --- STORE DATA ---
                if name != "Unknown":
                    # 1. Simple Map (for compatibility)
                    market_data[name] = price
                    
                    # 2. Info Map (New rich data)
                    market_info[name] = {
                        'position': pos,
                        'points': points,
                        'value': price
                    }
                    
                    # 3. Trends Map (Calculated or scraped)
                    pct = 0
                    if (price - trend) > 0:
                        pct = (trend / (price - trend)) * 100
                    
                    market_trends[name] = {
                        'trend': trend,
                        'trendPct': round(pct, 1)
                    }

        except Exception as e:
            print(f"Scrape Error: {e}")
        finally:
            browser.close()

    # --- SAVE TO JS FILE ---
    print(f"Saving data for {len(market_data)} players...")
    
    js_content = f"""// Auto-generated by scrape_market.py
const MARKET_DATA = {json.dumps(market_data, indent=2)};
const MARKET_INFO = {json.dumps(market_info, indent=2)};
const MARKET_TRENDS = {json.dumps(market_trends, indent=2)};
"""
    
    # Write with UTF-8 encoding
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write(js_content)
        
    print("Done.")

if __name__ == '__main__':
    scrape_market()
