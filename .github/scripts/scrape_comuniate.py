from playwright.sync_api import sync_playwright
import json
import re
import time

def scrape():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto('https://www.comuniate.com/mercado/fantasy')
        
        # 1. Switch to Relevo / LaLiga Fantasy
        try:
            # User provided: <li data-fantasy="relevo">
            print("Switching to Relevo/Fantasy...")
            page.click('li[data-fantasy="relevo"]') 
            page.wait_for_timeout(2000) # Wait for AJAX
            print("Switched.")
        except Exception as e:
            print(f"Error switching tab: {e}")

        # Scroll to load all data
        print("Scrolling...")
        for _ in range(8): # Scroll more
            page.mouse.wheel(0, 5000)
            page.wait_for_timeout(500)

        players = []
        # Re-query elements after scrolling
        cards = page.query_selector_all('.ficha_jugador')
        
        print(f"Processing {len(cards)} cards...")

        for card in cards:
            text = card.inner_text()
            
            # Name: Try .titulo_ficha_jugador
            name_el = card.query_selector('.titulo_ficha_jugador')
            if name_el:
                name = name_el.inner_text().strip()
            else:
                # Fallback: Split text? 
                lines = text.split('\n')
                # Usually name is 3rd or 4th line if pure text
                name = "Unknown"
                for line in lines:
                    if len(line) > 3 and not any(x in line for x in ['€', 'PT', 'DF', 'MD', 'MC', 'DL']):
                        name = line
                        break

            # Position: .label-posicion
            # Sometimes it has multiple classes like label-danger, label-primary
            # We look for the one with text matching positions
            pos = "UNK"
            badges = card.query_selector_all('.label-posicion')
            for b in badges:
                b_text = b.inner_text().strip()
                if b_text in ['PT', 'DF', 'MD', 'MC', 'DL', 'CEN']: # CEN = Centrocampista? MD/MC
                    pos = b_text
                    break
            
            # Points
            points = "0"
            for b in badges:
                b_text = b.inner_text().strip()
                if b_text.isdigit() or (b_text.startswith('-') and b_text[1:].isdigit()):
                     if b_text not in ['PT', 'DF', 'MD', 'MC', 'DL']:
                         points = b_text
                         break

            # Price
            price = 0
            # Look for money format
            money_match = re.search(r'([\d\.]+)€', text)
            if money_match:
                price = int(money_match.group(1).replace('.', ''))
            
            # Trend
            trend = 0
            # Look for trend block
            trend_el = card.query_selector('.success') or card.query_selector('.danger')
            if trend_el:
                trend_text = trend_el.inner_text().strip()
                try:
                    trend = int(trend_text.replace('.', '').replace('€', '').replace('+', ''))
                except:
                    pass
            
            players.append({
                'name': name,
                'pos': pos,
                'points': points,
                'value': price,
                'trend': trend
            })
            
        print(f"Found {len(players)} players.")
        print(json.dumps(players[:5], indent=2))
        browser.close()

if __name__ == "__main__":
    scrape()
