import os
import json
import re
import datetime
from playwright.sync_api import sync_playwright

# --- CONFIG ---
OUTPUT_FILE = os.path.join(os.getcwd(), 'market_data.js')
BASE_URL = 'https://www.guiafantasy.com/jugadores'

def parse_card(card):
    """Parse a single player card and return data dict or None"""
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
            if badge_text in ['PT', 'DF', 'MD', 'DL', 'EN']:
                pos = badge_text
                break
        
        # --- POINTS (Total Points in .label-primary) ---
        points = 0
        primary_badges = card.query_selector_all('.label-posicion.label-primary')
        if primary_badges:
            for pb in primary_badges:
                pb_text = pb.inner_text().strip()
                if pb_text.isdigit():
                    points = int(pb_text)
                    break
        
        # --- PRICE (format: 148.063.130€) ---
        price = 0
        price_match = re.search(r'([\d\.]+)€', text)
        if price_match:
            price = int(price_match.group(1).replace('.', ''))
        
        # --- TREND (+/- value in .success or .danger) ---
        trend = 0
        trend_el = card.query_selector('.success') or card.query_selector('.danger')
        if trend_el:
            trend_text = trend_el.inner_text().strip()
            # Format: +3.231.490€ or -170.872€
            cleaned = trend_text.replace('.', '').replace('€', '').replace('+', '')
            if cleaned.lstrip('-').isdigit():
                trend = int(cleaned)
        
        if name != "Unknown" and price > 0:
            return {
                'name': name,
                'position': pos,
                'points': points,
                'price': price,
                'trend': trend
            }
    except Exception as e:
        print(f"Card parse error: {e}")
    return None

def scrape_market():
    print(f"[{datetime.datetime.now()}] Starting GuiaFantasy.com Full Scrape...")
    
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
            
            # Pagination: 25 pages, 26 players each, offsets 0-600
            total_pages = 25
            all_players = []
            
            for page_num in range(total_pages):
                offset = page_num * 26
                print(f"Loading page {page_num + 1}/{total_pages} (offset {offset})...")
                
                # Call the AJAX function
                page.evaluate(f"ver_jugadores({offset})")
                
                # Wait for content to load - the AJAX replaces div content
                try:
                    page.wait_for_selector('.ficha_jugador', timeout=5000)
                    page.wait_for_timeout(1500)  # Extra wait for all cards to render
                except:
                    print(f"  Timeout waiting for cards on page {page_num + 1}")
                    page.wait_for_timeout(3000)  # Fallback wait
                
                # Get cards
                cards = page.query_selector_all('.ficha_jugador')
                
                if len(cards) == 0:
                    print(f"No cards found on page {page_num + 1}. Retrying...")
                    page.wait_for_timeout(3000)
                    cards = page.query_selector_all('.ficha_jugador')
                    if len(cards) == 0:
                        print(f"Still no cards. Stopping.")
                        break
                
                print(f"  Found {len(cards)} cards")
                
                # Parse each card
                for card in cards:
                    player = parse_card(card)
                    if player and player['name'] not in market_data:
                        all_players.append(player)
                        name = player['name']
                        market_data[name] = player['price']
                        market_info[name] = {
                            'position': player['position'],
                            'points': player['points'],
                            'value': player['price']
                        }
                        pct = 0
                        if player['price'] != 0 and (player['price'] - player['trend']) > 0:
                            pct = (player['trend'] / (player['price'] - player['trend'])) * 100
                        market_trends[name] = {
                            'trend': player['trend'],
                            'trendPct': round(pct, 2)
                        }
                        
        except Exception as e:
            print(f"Scrape Error: {e}")
        finally:
            browser.close()

    if not market_data:
        print("No data extracted. Skipping save.")
        return
    
    # Validation
    print(f"\n=== VALIDATION ===")
    if 'Pedri' in market_data:
        print(f"Pedri: {market_data['Pedri']:,}€")
    print(f"Total players: {len(market_data)}")
    
    # Save
    print(f"\nSaving data...")
    js_content = f"""// Auto-generated by scrape_market.py from guiafantasy.com
// Generated: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}
// Total Players: {len(market_data)}
const MARKET_DATA = {json.dumps(market_data, indent=2, ensure_ascii=False)};
const MARKET_INFO = {json.dumps(market_info, indent=2, ensure_ascii=False)};
const MARKET_TRENDS = {json.dumps(market_trends, indent=2, ensure_ascii=False)};
"""
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write(js_content)
    print("Done.")

if __name__ == '__main__':
    scrape_market()
