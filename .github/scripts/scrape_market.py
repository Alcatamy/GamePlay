import os
import json
import re
import datetime
from playwright.sync_api import sync_playwright

# --- CONFIG ---
OUTPUT_FILE = os.path.join(os.getcwd(), 'market_data.js')
BASE_URL = 'https://www.guiafantasy.com/jugadores'

def scrape_market():
    print(f"[{datetime.datetime.now()}] Starting GuiaFantasy.com Scrape...")
    
    market_data = {}
    market_info = {}
    market_trends = {}
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        try:
            print(f"Navigating to {BASE_URL} ...")
            page.goto(BASE_URL, timeout=60000)
            page.wait_for_timeout(3000)
            
            # The site uses AJAX to load players via ver_jugadores(limite)
            # We can trigger multiple loads by scrolling and clicking "Ver más" if present
            # Or directly call the JS function with increasing limits
            
            print("Loading all players via AJAX...")
            total_players = 0
            all_cards = []
            
            # Load players in batches (the site uses limite parameter)
            for page_num in range(20): # Max 20 pages = ~500 players
                limite = page_num * 26
                print(f"Loading batch {page_num+1} (offset {limite})...")
                
                # Execute the AJAX call via JavaScript
                page.evaluate(f"ver_jugadores({limite})")
                page.wait_for_timeout(2000)
                
                # Check if new cards loaded
                cards = page.query_selector_all('.ficha_jugador')
                if len(cards) == 0:
                    print("No more players found.")
                    break
                
                if len(cards) <= total_players and page_num > 0:
                    print("No new players loaded. Stopping.")
                    break
                    
                total_players = len(cards)
                print(f"Total cards now: {total_players}")
            
            # Get final card list
            cards = page.query_selector_all('.ficha_jugador')
            print(f"Found {len(cards)} player cards total.")
            
            # Parse each card
            for card in cards:
                try:
                    text = card.inner_text()
                    
                    # --- NAME ---
                    name = "Unknown"
                    name_el = card.query_selector('.titulo_ficha_jugador')
                    if name_el:
                        name = name_el.inner_text().strip()
                    
                    # --- POSITION (PT, DF, MD, DL) ---
                    pos = "UNK"
                    pos_badges = card.query_selector_all('.label-posicion')
                    for badge in pos_badges:
                        badge_text = badge.inner_text().strip().upper()
                        if badge_text in ['PT', 'DF', 'MD', 'DL', 'EN']: # EN = Entrenador
                            pos = badge_text
                            break
                    
                    # --- POINTS (Total Points - usually in the second .label-posicion.label-primary) ---
                    points = 0
                    primary_badges = card.query_selector_all('.label-posicion.label-primary')
                    if primary_badges:
                        for pb in primary_badges:
                            pb_text = pb.inner_text().strip()
                            if pb_text.isdigit():
                                points = int(pb_text)
                                break
                    
                    # --- PRICE ---
                    price = 0
                    # Price format: 148.063.130€
                    price_match = re.search(r'([\d\.]+)€', text)
                    if price_match:
                        price = int(price_match.group(1).replace('.', ''))
                    
                    # --- TREND (+/- value) ---
                    trend = 0
                    trend_el = card.query_selector('.success') or card.query_selector('.danger')
                    if trend_el:
                        trend_text = trend_el.inner_text().strip()
                        # Format: +3.231.490€ or -170.872€
                        trend_match = re.search(r'([+-]?[\d\.]+)€?', trend_text.replace('.', ''))
                        if trend_match:
                            trend = int(trend_match.group(1).replace('.', '').replace('+', ''))
                            if '-' in trend_text:
                                trend = -abs(trend)
                    
                    # --- STORE ---
                    if name != "Unknown" and price > 0:
                        market_data[name] = price
                        market_info[name] = { 'position': pos, 'points': points, 'value': price }
                        pct = 0
                        if price != 0 and (price - trend) > 0:
                            pct = (trend / (price - trend)) * 100
                        market_trends[name] = { 'trend': trend, 'trendPct': round(pct, 2) }
                        
                except Exception as e:
                    print(f"Card parse error: {e}")
                    continue
                    
        except Exception as e:
            print(f"Scrape Error: {e}")
        finally:
            browser.close()

    if not market_data:
        print("No data extracted. Skipping save.")
        return
    
    # Validation check
    if 'Pedri' in market_data:
        pedri_val = market_data['Pedri']
        print(f"Validation: Pedri = {pedri_val}€")
        if pedri_val < 50000000:
            print("WARNING: Pedri value seems too low. Data might be incorrect.")
    
    print(f"Saving data for {len(market_data)} players...")
    js_content = f"""// Auto-generated by scrape_market.py from guiafantasy.com
// Generated: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}
const MARKET_DATA = {json.dumps(market_data, indent=2, ensure_ascii=False)};
const MARKET_INFO = {json.dumps(market_info, indent=2, ensure_ascii=False)};
const MARKET_TRENDS = {json.dumps(market_trends, indent=2, ensure_ascii=False)};
"""
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write(js_content)
    print("Done.")

if __name__ == '__main__':
    scrape_market()
