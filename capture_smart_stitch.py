import subprocess
import time
import re
from datetime import datetime
from pathlib import Path

# --- CONFIGURACIÓN ---
ADB_DEVICE = "127.0.0.1:5555"
OUTPUT_FILE = Path("movimientos_smart_new.txt") # Nuevo archivo
SCROLL_START_Y = 1600
SCROLL_END_Y = 1100
SCROLL_DURATION = 500
WAIT_TIME = 1.5
MAX_ITERATIONS = 3000
VER_MAS_X = 536
VER_MAS_Y = 1797

def run_adb(command: str) -> str:
    cmd = f"adb -s {ADB_DEVICE} {command}"
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, encoding='utf-8', errors='replace')
        return result.stdout.strip()
    except Exception as e:
        print(f"Error ADB: {e}")
        return ""

def click_ver_mas():
    print("      → Detectado botón 'Ver más'. Clickeando...")
    run_adb(f"shell input tap {VER_MAS_X} {VER_MAS_Y}")
    time.sleep(4.0)

def get_xml_content():
    run_adb("shell uiautomator dump /sdcard/ui.xml")
    return run_adb("shell cat /sdcard/ui.xml")

def parse_items_from_xml(xml):
    items = []
    if not xml or len(xml) < 100: return items
    
    msgs = re.findall(r'text="([^"]{15,})"[^>]+tvLeagueActivityItemMessage', xml)
    dates = re.findall(r'text="([^"]+)"[^>]+tvLeagueActivityItemTimeAgo', xml)
    
    count = min(len(msgs), len(dates))
    for i in range(count):
        m_clean = msgs[i].replace('\n', ' ').strip()
        d_clean = dates[i].strip()
        items.append({'msg': m_clean, 'date_raw': d_clean})
        
    return items

def smart_stitch(main_list, new_batch):
    if not main_list: return new_batch, False
    if not new_batch: return [], False
    
    tail_len = min(len(main_list), 20)
    main_tail = main_list[-tail_len:]
    max_k = min(len(main_tail), len(new_batch))
    best_overlap = 0
    
    for k in range(max_k, 0, -1):
        tail_msgs = [x['msg'] for x in main_tail[-k:]]
        head_msgs = [x['msg'] for x in new_batch[:k]]
        if tail_msgs == head_msgs:
            best_overlap = k
            break
            
    if best_overlap > 0:
        return new_batch[best_overlap:], False
    else:
        return new_batch, True

def smart_stitch_prepend(main_list, new_batch):
    if not main_list: return new_batch, False
    if not new_batch: return [], False
    
    max_k = min(len(new_batch), len(main_list))
    best_overlap = 0
    
    for k in range(max_k, 0, -1):
        tail_msgs = [x['msg'] for x in new_batch[-k:]]
        head_msgs = [x['msg'] for x in main_list[:k]]
        
        if tail_msgs == head_msgs:
            best_overlap = k
            break
            
    if best_overlap > 0:
        return new_batch[:-best_overlap], False
    else:
        return new_batch, True

def scroll_overlap():
    run_adb(f"shell input swipe 540 {SCROLL_START_Y} 540 {SCROLL_END_Y} {SCROLL_DURATION}")
    time.sleep(WAIT_TIME)

def scroll_up_overlap():
    run_adb(f"shell input swipe 540 {SCROLL_END_Y} 540 {SCROLL_START_Y} {SCROLL_DURATION}")
    time.sleep(WAIT_TIME)

def main():
    print("INICIANDO CAPTURA BAJANDO (NUEVO ARCHIVO)...")
    captured_data = [] 
    
    consecutive_empty = 0
    consecutive_no_new = 0
    
    # --- FASE 1: BAJANDO ---
    print("\n=== FASE 1: CAPTURANDO (BAJANDO) ===")
    
    for i in range(MAX_ITERATIONS):
        print(f"Bajando {i+1}... [{len(captured_data)} items]", end="\r")
        
        if i > 0:
            scroll_overlap()
        
        xml = get_xml_content()
        batch = parse_items_from_xml(xml)
        
        if not batch:
            consecutive_empty += 1
            if consecutive_empty >= 5: break
            continue
        consecutive_empty = 0
        
        # Check for End of List Popup
        if "no hemos encontrado" in xml.lower():
            print("\nFin lista detectado (Popup). Cerrando aviso...")
            run_adb("shell input tap 517 1033") 
            time.sleep(2.0)
            break

        added, gap = smart_stitch(captured_data, batch)
        if added:
            captured_data.extend(added)
            print(f"\n   ↓ +{len(added)} items.")
            consecutive_no_new = 0
        else:
            consecutive_no_new += 1
            if "ver más" in xml.lower() or "ver mas" in xml.lower():
                click_ver_mas()
                consecutive_no_new = 0
            else:
                if consecutive_no_new >= 6:
                    print("\nFin inferior alcanzado.")
                    break

    # --- FASE 2: VERIFICANDO (SUBIENDO) ---
    print("\n\n=== FASE 2: VERIFICANDO (SUBIENDO) ===")
    consecutive_no_new = 0
    
    # Reset scroll state logic if needed? 
    # Just start scrolling up.
    
    for i in range(MAX_ITERATIONS):
        print(f"Verificando {i+1}... [{len(captured_data)} items]", end="\r")
        
        scroll_up_overlap()
        
        xml = get_xml_content()
        batch = parse_items_from_xml(xml)
        
        if not batch:
            consecutive_empty += 1
            if consecutive_empty >= 5: break
            continue
        consecutive_empty = 0
        
        new_top, gap = smart_stitch_prepend(captured_data, batch)
        
        if new_top:
            captured_data = new_top + captured_data
            print(f"\n   ↑ RECUPERADOS: {len(new_top)} items (Gap detectado al bajar)!")
            consecutive_no_new = 0
        else:
            consecutive_no_new += 1
            if consecutive_no_new >= 10:
                print("\nValidación superior completada.")
                break

    print(f"\nGuardando {len(captured_data)} items en {OUTPUT_FILE}...")
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write(f"# SMART CAPTURE NEW - {datetime.now()}\n")
        f.write(f"# Total: {len(captured_data)}\n")
        for item in captured_data:
            f.write(f"[{item['date_raw']}] {item['msg']}\n")
            
    print("Hecho.")

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\nStop.")
