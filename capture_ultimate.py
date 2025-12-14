#!/usr/bin/env python3
"""
CAPTURA ULTIMATE FANTASY
Estrategia: UI Automator + Scroll con Solapamiento Masivo.
Robustez: 10/10
"""

import subprocess
import time
import re
from datetime import datetime
from pathlib import Path
from collections import OrderedDict

# Configuración
ADB_DEVICE = "emulator-5554"
OUTPUT_FILE = Path("movimientos_ultimate.txt")
WAIT_TIME = 0.8  # Tiempo para estabilizar UI tras scroll
MAX_ITERATIONS = 2000 # Muchas iteraciones porque el scroll es corto

# Coordenadas
VER_MAS_X = 536
VER_MAS_Y = 1797

# Scroll Conservador: 500px (aprox 1/3 de pantalla)
# Esto asegura que leemos cada movimiento al menos 2 veces para no saltarnos nada.
SCROLL_START_Y = 1600
SCROLL_END_Y = 1100 
SCROLL_DURATION = 400

def run_adb(command: str) -> str:
    full_cmd = f"adb -s {ADB_DEVICE} {command}"
    result = subprocess.run(full_cmd, shell=True, capture_output=True, encoding='utf-8', errors='replace')
    return result.stdout.strip()

def get_ui_dump() -> str:
    """Extrae texto 100% fiel de la app."""
    run_adb("shell uiautomator dump /sdcard/ui.xml")
    return run_adb("shell cat /sdcard/ui.xml")

def parse_movements(xml_content: str) -> list:
    """Regex robusto para extraer mensajes y fechas."""
    movements = []
    if not xml_content or len(xml_content) < 100: return movements
    
    # Patrones para el XML de BlueStacks
    # El orden en el XML suele ser text="..." antes de resource-id="..."
    msg_pattern = r'text="([^"]{15,})"[^>]+tvLeagueActivityItemMessage'
    date_pattern = r'text="([^"]+)"[^>]+tvLeagueActivityItemTimeAgo'
    
    msgs = re.findall(msg_pattern, xml_content)
    dates = re.findall(date_pattern, xml_content)
    
    for i, msg in enumerate(msgs):
        # Asignar fecha correspondiente o usar fallback
        date = dates[i] if i < len(dates) else datetime.now().strftime("%d/%m/%Y")
        movements.append({'date': date, 'text': msg})
        
    return movements

def normalize_key(date: str, text: str) -> str:
    """Clave única para evitar duplicados del solapamiento."""
    text_lower = text.lower()
    
    # 1. Extraer precio (lo más único)
    price = "0"
    price_match = re.search(r'([\d.]+)€', text)
    if price_match:
        price = price_match.group(1).replace('.', '')
        
    # 2. Extraer nombre jugador (si aplica)
    player = "general"
    player_match = re.search(r'(?:jugador|blindado a)\s+([a-záéíóúñü\s.]+?)(?:\s+(?:de|a|por)|$)', text_lower)
    if player_match:
        player = player_match.group(1).strip()
        
    # 3. Acción
    action = "otro"
    if "vendido" in text_lower: action = "venta"
    elif "comprado" in text_lower: action = "compra"
    elif "blindado" in text_lower: action = "blindaje"
    
    return f"{date}|{action}|{player}|{price}"

def scroll_overlap():
    """Scroll corto para garantizar solapamiento."""
    run_adb(f"shell input swipe 540 {SCROLL_START_Y} 540 {SCROLL_END_Y} {SCROLL_DURATION}")
    time.sleep(WAIT_TIME)

def click_ver_mas():
    print("      → Clickeando 'Ver más'...")
    run_adb(f"shell input tap {VER_MAS_X} {VER_MAS_Y}")
    time.sleep(2.0) # Esperar carga de red

def main():
    print("="*60)
    print("CAPTURA ULTIMATE - SIN HUECOS")
    print("="*60)
    
    all_movements = OrderedDict()
    consecutive_no_new = 0
    total_added = 0
    
    for i in range(MAX_ITERATIONS):
        iteration_start = time.time()
        
        # 1. Obtener Datos
        xml = get_ui_dump()
        current_batch = parse_movements(xml)
        
        # 2. Procesar (Deduplicar)
        new_in_batch = 0
        for mov in current_batch:
            key = normalize_key(mov['date'], mov['text'])
            if key not in all_movements:
                all_movements[key] = mov
                new_in_batch += 1
                total_added += 1
        
        # 3. Estado
        elapsed = time.time() - iteration_start
        print(f"[{i+1:4d}] Batch: {len(current_batch):2d} | Nuevos: {new_in_batch:2d} | Total: {total_added:4d} | {elapsed:.2f}s")
        
        # 4. Navegación Inteligente
        if new_in_batch == 0:
            consecutive_no_new += 1
            if consecutive_no_new == 2:
                # Si fallamos 2 veces, probamos clickear Ver Más
                click_ver_mas()
            elif consecutive_no_new >= 6:
                # Si fallamos 6 veces seguidas (tras intentar scroll y click), asumimos fin
                print("\n¡Fin de lista detectado! (Estable)")
                break
            else:
                scroll_overlap()
        else:
            consecutive_no_new = 0
            if 'Ver más' in xml or 'ver más' in xml.lower():
                click_ver_mas()
            else:
                scroll_overlap()

    # Guardar
    print("\nGuardando resultados...")
    final_list = list(all_movements.values())
    
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write(f"# MODO ULTIMATE - {datetime.now()}\n")
        f.write(f"# Total capturado: {len(final_list)}\n")
        f.write("-" * 50 + "\n")
        for m in final_list:
            f.write(f"[{m['date']}] {m['text']}\n")
            
    print(f"✓ Archivo generado: {OUTPUT_FILE}")
    print(f"✓ Total movimientos: {len(final_list)}")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nInterrumpido por usuario.")
