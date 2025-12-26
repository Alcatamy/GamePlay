import subprocess
import time
import os
import xml.etree.ElementTree as ET
import csv
import re
import difflib

# Configuration
ADB_DEVICE = "127.0.0.1:5555"
CSV_FILE = "movimientos_fantasy_2025-12-17.csv"
SCROLL_ATTEMPTS_LIMIT = 150 # Increased significantly
VER_MAS_TEXT = "Ver más"


def adb_shell(cmd):
    return subprocess.run(f'adb -s {ADB_DEVICE} shell {cmd}', shell=True, capture_output=True, text=True)

def adb_pull(remote, local):
    subprocess.run(f'adb -s {ADB_DEVICE} pull {remote} {local}', shell=True, stdout=subprocess.DEVNULL)

def get_ui_hierarchy():
    """Dumps UI XML and parses it"""
    adb_shell("uiautomator dump /sdcard/window_dump.xml")
    adb_pull("/sdcard/window_dump.xml", "window_dump.xml")
    try:
        tree = ET.parse("window_dump.xml")
        return tree.getroot()
    except Exception as e:
        print(f"Error parsing XML: {e}")
        return None

def extract_movements_from_xml(root):
    """Extracts movement dicts from XML node tree"""
    movements = []
    # Identify items by resource id usually
    # Pattern: Title(id=tvLeagueActivityItemTitle), Time, Message(id=tvLeagueActivityItemMessage)
    
    # We can walk the tree looking for nodes with the message ID
    # Resource ID: com.lfp.laligafantasy:id/tvLeagueActivityItemMessage
    
    for node in root.iter():
        resid = node.attrib.get('resource-id', '')
        if 'tvLeagueActivityItemMessage' in resid:
            text = node.attrib.get('text', '')
            movements.append(text)
            
    return movements

def find_button_bounds(root, text_pattern):
    """Finds bounds of a node with specific text"""
    for node in root.iter():
        text = node.attrib.get('text', '')
        if text_pattern.lower() in text.lower():
            bounds = node.attrib.get('bounds', '') # [x1,y1][x2,y2]
            if bounds:
                # Parse [0,123][456,789]
                match = re.match(r'\[(\d+),(\d+)\]\[(\d+),(\d+)\]', bounds)
                if match:
                    x1, y1, x2, y2 = map(int, match.groups())
                    cx = (x1 + x2) // 2
                    cy = (y1 + y2) // 2
                    return cx, cy
    return None

def parse_movement_text(text):
    """Parses raw text line into struct"""
    # Type 1: Transfer
    # "Vigar FC ha comprado al jugador Álvaro Nuñez de GOLENCIERRO FC por 20.297.341€"
    # "Golencierro FC ha vendido al jugador Yuri a LALIGA por 20.513.995€"
    match_transfer = re.search(r'(.*?) ha (comprado|vendido) al jugador (.*?) (de|a) (.*?) por ([\d\.]+)€', text)
    if match_transfer:
        return {
            "type": "Traspaso",
            "team1": match_transfer.group(1).strip(),
            "action": match_transfer.group(2),
            "player": match_transfer.group(3).strip(),
            "team2": match_transfer.group(5).strip(),
            "amount": int(match_transfer.group(6).replace('.', '')),
            "raw": text
        }
    
    # Type 2: Blindaje
    # "Visite La Manga FC ha blindado a Cabrera"
    match_shield = re.search(r'(.*?) ha blindado a (.*)', text)
    if match_shield:
         return {
            "type": "Blindaje",
            "team": match_shield.group(1).strip(),
            "player": match_shield.group(2).strip(),
            "amount": 0,
            "raw": text
        }
    
    # Type 3: Reward
    # "En la jornada 16, Pablinistan FC ha ganado 8.900.000€"
    match_reward = re.search(r'En la jornada \d+, (.*?) ha ganado ([\d\.]+)€', text)
    if match_reward:
        if "por tener jugadores" in text: # It's 11 ideal
             return {
                "type": "11 Ideal",
                "team": match_reward.group(1).strip(),
                "amount": int(match_reward.group(2).replace('.', '')),
                "raw": text
            }
        return {
            "type": "Recompensa",
            "team": match_reward.group(1).strip(),
            "amount": int(match_reward.group(2).replace('.', '')),
            "raw": text
        }

    return {"type": "Unknown", "raw": text}

def main():
    print("🚀 Starting Autonomous Movement Capture...")
    
    captured_texts = set()
    captured_data = [] # List of parsed dicts
    
    # 1. Capture loop
    no_new_data_count = 0
    
    for i in range(SCROLL_ATTEMPTS_LIMIT):
        print(f"🔄 Scan {i+1}...")
        root = get_ui_hierarchy()
        if not root: continue
        
        # Extract Items
        items = extract_movements_from_xml(root)
        new_items = 0
        for it in items:
            if it not in captured_texts:
                captured_texts.add(it)
                parsed = parse_movement_text(it)
                captured_data.append(parsed)
                new_items += 1
                print(f"   + Found: {it[:60]}...")
        
        if new_items == 0:
            no_new_data_count += 1
        else:
            no_new_data_count = 0
            
        # Check for "Ver más"
        btn_coords = find_button_bounds(root, VER_MAS_TEXT)
        if btn_coords:
            print(f"   🔘 'Ver más' detected at {btn_coords}. Clicking...")
            adb_shell(f"input tap {btn_coords[0]} {btn_coords[1]}")
            time.sleep(4) # Wait longer for content to load
            
            # After clicking, scroll a bit to show new content immediately
            adb_shell("input swipe 360 1000 360 800 500")
            time.sleep(1)
        else:
            # Scroll down if no button found

            # Reduced scroll distance to avoid skipping items (User feedback)
            print("   📜 Scrolling down (short step)...")
            adb_shell("input swipe 360 1200 360 600 500") 
            time.sleep(1.5)
            
        if no_new_data_count > 4:
            print("🛑 No new data for 4 consecutive scans. Stopping.")
            break

    print(f"\n📊 Captured Total: {len(captured_data)} movements.")
    
    # 2. Compare with CSV
    print("\n🔍 Comparing with CSV...")
    csv_movements = []
    try:
        with open(CSV_FILE, 'r', encoding='utf-8') as f: # Assuming utf-8
            reader = csv.reader(f)
            next(reader) # Skip header
            for row in reader:
                # row: Fecha, Tipo, Jugador/Beneficiario, De, A, Importe
                if len(row) < 6: continue
                csv_movements.append({
                    "date": row[0],
                    "type": row[1],
                    "player": row[2],
                    "from": row[3],
                    "to": row[4],
                    "amount": row[5]
                })
    except Exception as e:
        print(f"Error reading CSV: {e}")
        return

    # Comparison Logic
    # We check if each CAPTURED items exists in CSV
    missing_in_csv = []
    
    for real in captured_data:
        found = False
        # Heuristic matching
        for csv_row in csv_movements:
            # Check Amount (Strongest signal)
            csv_amt = csv_row["amount"]
            real_amt = str(real.get("amount", -1))
            
            if csv_amt == real_amt:
                # Secondary check: Player Name
                real_player = real.get("player", "").lower()
                csv_player = csv_row["player"].lower()
                
                # Loose matching for names (e.g. accents) or Blindaje vs Traspaso
                if real_player == csv_player or (real_player in csv_player) or (csv_player in real_player):
                    found = True
                    break
            
            # Special case for "Recompensa" / "11 Ideal" where amounts match logic
            if real["type"] in ["Recompensa", "11 Ideal"] and csv_row["type"] == "Recompensa":
                 if csv_amt == real_amt and csv_row["player"] == real.get("team"): # In CSV 'player' col holds team for rewards
                     found = True
                     break
                     
        if not found:
            missing_in_csv.append(real)

    print(f"\n❌ MISSING IN CSV ({len(missing_in_csv)} items):")
    for m in missing_in_csv:
        print(f"   -> {m['raw']}")

    with open("missing_report.txt", "w", encoding="utf-8") as f:
        f.write(f"Missing Items Report ({len(missing_in_csv)} items):\n")
        for m in missing_in_csv:
            f.write(f"{m['raw']}\n")

if __name__ == "__main__":
    main()
