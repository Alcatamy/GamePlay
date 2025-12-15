import os
import json
import re
import datetime
from playwright.sync_api import sync_playwright

# --- CONFIG ---
OUTPUT_FILE = os.path.join(os.getcwd(), 'market_data.js')

def scrape_market():
    print(f"[{datetime.datetime.now()}] Starting Comuniate (Relevo) Scrape...")
    
    market_data = {}
    market_info = {}
    market_trends = {}
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        try:
            print("Navigating to https://www.comuniate.com/mercado/fantasy ...")
            page.goto('https://www.comuniate.com/mercado/fantasy', timeout=60000)
            
            # Cookie Consent
            try:
                cookie_btn = page.query_selector('button#didomi-notice-agree-button')
                if cookie_btn:
                    cookie_btn.click()
                    page.wait_for_timeout(2000)
            except:
                pass
            
            # Switch to Relevo Tab
            print("Switching to Relevo/Fantasy View...")
            relevo_selector = 'li[data-fantasy="relevo"]'
            
            mode_confirmed = False
            for attempt in range(3):
                try:
                    page.click(f'{relevo_selector} a') 
                    page.wait_for_timeout(5000)
                    
                    content = page.content()
                    if "LALIGA FANTASY" in content:
                        print("Confirmed 'LALIGA FANTASY' text found.")
                        mode_confirmed = True
                        break
                    
                    if "Raphinha" in content:
                        match = re.search(r'Raphinha.*?([\d\.]+)[€]', content, re.DOTALL)
                        if match:
                            val = int(match.group(1).replace('.', ''))
                            if val > 50000000:
                                print(f"Confirmed High Value (Raphinha: {val}€).")
                                mode_confirmed = True
                                break
                except Exception as e:
                    print(f"Click error: {e}")
                    page.wait_for_timeout(2000)

            if not mode_confirmed:
                print("CRITICAL ERROR: Could not switch to Relevo mode. Aborting.")
                return

            # Scroll
            print("Scrolling to load all players...")
            for i in range(20): 
                page.mouse.wheel(0, 15000)
                page.wait_for_timeout(600)
                
            # Extract Data
            cards = page.query_selector_all('.ficha_jugador')
            print(f"Found {len(cards)} player cards.")
            
            for card in cards:
                text = card.inner_text()
                
                name = "Unknown"
                name_el = card.query_selector('.titulo_ficha_jugador')
                if name_el:
                    name = name_el.inner_text().strip()
                else:
                    for line in text.split('\n'):
                        if len(line) > 3 and not any(x in line for x in ['€', 'PT', 'DF', 'MD', 'MC', 'DL']) and not line.isdigit():
                            name = line.strip()
                            break
                            
                pos = "UNK"
                badges = card.query_selector_all('.label-posicion')
                for b in badges:
                    b_txt = b.inner_text().strip().upper()
                    if b_txt in ['PT', 'DF', 'MD', 'MC', 'DL', 'CEN']:
                        pos = b_txt
                        break
                
                points = 0
                for b in badges:
                    b_txt = b.inner_text().strip()
                    if b_txt.lstrip('-').isdigit():
                        if b_txt not in ['PT', 'DF', 'MD', 'MC', 'DL']:
                            points = int(b_txt)
                            break
                            
                price = 0
                money_match = re.search(r'([\d\.]+)€', text)
                if money_match:
                    price = int(money_match.group(1).replace('.', ''))
                
                trend = 0
                trend_el = card.query_selector('.success') or card.query_selector('.danger')
                if trend_el:
                    try:
                        trend = int(trend_el.inner_text().strip().replace('.', '').replace('€', '').replace('+', ''))
                    except:
                        pass
                
                if name != "Unknown":
                    market_data[name] = price
                    market_info[name] = { 'position': pos, 'points': points, 'value': price }
                    pct = 0
                    if (price - trend) > 0: pct = (trend / (price - trend)) * 100
                    market_trends[name] = { 'trend': trend, 'trendPct': round(pct, 1) }
        
        except Exception as e:
            print(f"Scrape Error: {e}")
        finally:
            browser.close()

    if not market_data:
        print("No data extracted. Skipping save.")
        return

    print(f"Saving data for {len(market_data)} players...")
    js_content = f"""// Auto-generated by scrape_market.py
const MARKET_DATA = {json.dumps(market_data, indent=2)};
const MARKET_INFO = {json.dumps(market_info, indent=2)};
const MARKET_TRENDS = {json.dumps(market_trends, indent=2)};
"""
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write(js_content)
    print("Done.")

if __name__ == '__main__':
    scrape_market()
