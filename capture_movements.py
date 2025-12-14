#!/usr/bin/env python3
"""
Captura de movimientos de mercado de Fantasy desde BlueStacks.
Versión mejorada con mejor OCR y detección de "Ver más".
"""

import subprocess
import time
import re
from datetime import datetime
from pathlib import Path
from collections import OrderedDict

try:
    from PIL import Image
    import easyocr
except ImportError as e:
    print(f"Error: Falta instalar dependencias. Ejecuta:")
    print("pip install easyocr pillow")
    exit(1)

# Configuración
ADB_DEVICE = "emulator-5554"
SCREENSHOT_DIR = Path("screenshots_temp")
OUTPUT_FILE = Path("movimientos_mercado.txt")
SCROLL_AMOUNT = 700  # Reducido para no perder movimientos
WAIT_TIME = 2.0  # Aumentado para dar tiempo a la carga
MAX_ITERATIONS = 300  # Aumentado para capturar más
VER_MAS_COOLDOWN = 3  # Segundos después de clickear Ver más

# Coordenadas del botón "Ver más" (ajustar según la app)
VER_MAS_X = 536  # Centro horizontal
VER_MAS_Y = 1797  # Parte baja de la pantalla

# Inicializar OCR
print("Cargando modelo OCR (esto puede tardar la primera vez)...")
reader = easyocr.Reader(['es', 'en'], gpu=False)
print("✓ Modelo OCR cargado")


def run_adb(command: str) -> str:
    """Ejecuta un comando ADB y retorna la salida."""
    full_cmd = f"adb -s {ADB_DEVICE} {command}"
    result = subprocess.run(full_cmd, shell=True, capture_output=True, text=True)
    return result.stdout.strip()


def take_screenshot(filename: str) -> Path:
    """Captura screenshot del emulador."""
    SCREENSHOT_DIR.mkdir(exist_ok=True)
    remote_path = "/sdcard/screenshot.png"
    local_path = SCREENSHOT_DIR / filename
    
    run_adb(f"shell screencap -p {remote_path}")
    run_adb(f"pull {remote_path} {local_path}")
    
    return local_path


def fix_ocr_errors(text: str) -> str:
    """
    Corrige errores comunes de OCR en precios y texto.
    """
    # Corregir O/o mezcladas con números en contexto de precios
    # Patrón: buscar secuencias que parecen precios
    
    def fix_price(match):
        price = match.group(0)
        # Reemplazar o/O por 0 en contexto numérico
        price = re.sub(r'(?<=[0-9.])o(?=[0-9.])', '0', price)
        price = re.sub(r'(?<=[0-9.])O(?=[0-9.])', '0', price)
        price = re.sub(r'o(?=[0-9.])', '0', price)
        price = re.sub(r'O(?=[0-9.])', '0', price)
        price = re.sub(r'(?<=[0-9.])o', '0', price)
        price = re.sub(r'(?<=[0-9.])O', '0', price)
        # Corregir patrones como "1O0" -> "100"
        price = re.sub(r'1O0', '100', price)
        price = re.sub(r'1o0', '100', price)
        return price
    
    # Buscar patrones de precios (números con puntos y €)
    text = re.sub(r'[\d.oO]+[€$]', fix_price, text)
    text = re.sub(r'por [\d.oO]+€', fix_price, text)
    
    # Corregir patrones específicos conocidos
    replacements = {
        '.oo0.': '.000.',
        '.0oo': '.000',
        '.Ooo': '.000',
        '.ooo': '.000',
        '.OOO': '.000',
        '0oo€': '000€',
        'Ooo€': '000€',
        'OOO€': '000€',
        '0o0': '000',
        'O0O': '000',
        '1O0.': '100.',
        '1o0.': '100.',
    }
    
    for old, new in replacements.items():
        text = text.replace(old, new)
    
    return text


def is_valid_movement(text: str) -> bool:
    """
    Valida si una línea es un movimiento real.
    """
    # Descartar líneas basura
    garbage_patterns = [
        r'^LALIGA LA SUPER',
        r'^Operación de mercado$',
        r'^Ver más$',
        r'^[A-Z]{10,}',  # Texto muy corrupto
        r'na compraao',  # OCR corrupto
        r'jugaaor',       # OCR corrupto
    ]
    
    for pattern in garbage_patterns:
        if re.search(pattern, text, re.IGNORECASE):
            return False
    
    # Debe contener palabras clave de movimiento
    valid_keywords = [
        'ha vendido', 'ha comprado', 'ha blindado',
        'ha ganado', 'En la jornada'
    ]
    
    return any(kw in text for kw in valid_keywords)


def normalize_movement(text: str, date: str) -> str:
    """
    Normaliza un movimiento para comparación (evitar duplicados).
    Usa: fecha + jugador + precio + tipo de acción.
    NO usa el nombre del equipo porque puede estar corrupto por OCR.
    """
    text_lower = text.lower().strip()
    
    # Extraer nombre del jugador
    player_match = re.search(r'jugador\s+([a-záéíóúñü\s.]+?)(?:\s+(?:de|a)\s+)', text_lower)
    player = player_match.group(1).strip() if player_match else ""
    
    # Extraer precio (normalizado sin puntos)
    price_match = re.search(r'([\d.]+)€', text)
    price = price_match.group(1).replace('.', '') if price_match else ""
    
    # Extraer tipo de acción
    if 'ha vendido' in text_lower:
        action = 'venta'
    elif 'ha comprado' in text_lower:
        action = 'compra'
    elif 'ha blindado' in text_lower:
        action = 'blindaje'
    elif 'ha ganado' in text_lower:
        action = 'premio'
    elif 'en la jornada' in text_lower:
        action = 'jornada'
    else:
        action = 'otro'
    
    # Clave única: fecha + jugador + precio + acción
    # Esto permite que el mismo jugador sea vendido en diferentes días o a diferente precio
    key = f"{date}|{player}|{price}|{action}"
    return key


def extract_text(image_path: Path) -> str:
    """Extrae texto de una imagen usando EasyOCR."""
    try:
        results = reader.readtext(str(image_path))
        text_lines = [result[1] for result in results]
        return '\n'.join(text_lines)
    except Exception as e:
        print(f"Error OCR: {e}")
        return ""


def detect_ver_mas(text: str) -> bool:
    """Detecta si el texto 'Ver más' está presente."""
    patterns = [
        r'Ver\s*m[áa]s',
        r'VER\s*M[ÁA]S',
        r'ver\s*m[áa]s',
    ]
    return any(re.search(p, text) for p in patterns)


def click_ver_mas():
    """Hace click en el botón Ver más."""
    print(f"  → Clickeando 'Ver más' en ({VER_MAS_X}, {VER_MAS_Y})")
    run_adb(f"shell input tap {VER_MAS_X} {VER_MAS_Y}")
    time.sleep(VER_MAS_COOLDOWN)


def scroll_down():
    """Hace scroll hacia abajo en la pantalla."""
    # Scroll desde Y=1743 hasta Y=942 (ajustado para 16 movimientos)
    run_adb(f"shell input swipe 540 1743 540 942 300")
    time.sleep(WAIT_TIME)


def parse_movements(text: str) -> list:
    """Parsea el texto OCR para extraer movimientos."""
    movements = []
    lines = text.split('\n')
    current_date = datetime.now().strftime("%d/%m/%Y")
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        # Corregir errores OCR
        line = fix_ocr_errors(line)
        
        # Detectar fechas
        date_patterns = [
            r'(\d{1,2}/\d{1,2}/\d{2,4})',
            r'(Hoy)',
            r'(Ayer)',
            r'(Hace \d+ \w+)',
        ]
        
        for pattern in date_patterns:
            match = re.search(pattern, line, re.IGNORECASE)
            if match:
                current_date = match.group(1)
                break
        
        # Validar y agregar movimiento
        if is_valid_movement(line):
            movements.append({
                'date': current_date,
                'text': line,
                'normalized': normalize_movement(line, current_date)
            })
    
    return movements


def main():
    """Función principal de captura."""
    print("=" * 60)
    print("CAPTURA DE MOVIMIENTOS DE MERCADO - FANTASY v2.0")
    print("=" * 60)
    
    # Verificar conexión ADB
    devices = run_adb("devices")
    if "device" not in devices:
        print(f"Error: Dispositivo {ADB_DEVICE} no encontrado")
        return
    
    print(f"✓ Conectado a {ADB_DEVICE}")
    
    # Usar OrderedDict para mantener orden y evitar duplicados
    all_movements = OrderedDict()
    consecutive_no_new = 0
    ver_mas_clicked_count = 0
    
    print("\nIniciando captura... (Ctrl+C para detener)")
    print("-" * 60)
    
    for iteration in range(MAX_ITERATIONS):
        print(f"\nIteración {iteration + 1}/{MAX_ITERATIONS}")
        
        # Capturar screenshot
        screenshot_path = take_screenshot(f"capture_{iteration:03d}.png")
        print(f"  ✓ Screenshot: {screenshot_path.name}")
        
        # Extraer texto
        text = extract_text(screenshot_path)
        print(f"  ✓ Texto: {len(text)} caracteres")
        
        # Parsear movimientos
        movements = parse_movements(text)
        new_count = 0
        
        for mov in movements:
            key = mov['normalized']
            if key not in all_movements:
                all_movements[key] = mov
                new_count += 1
        
        print(f"  ✓ Nuevos: {new_count} | Total: {len(all_movements)}")
        
        # Detectar fin de lista
        if new_count == 0:
            consecutive_no_new += 1
            print(f"  ⚠ Sin nuevos movimientos ({consecutive_no_new}/5)")
            
            # Después de 2 intentos sin éxito, forzar click en Ver más
            if consecutive_no_new == 2:
                print("  → Forzando click en 'Ver más' por estar estancado...")
                click_ver_mas()
                ver_mas_clicked_count += 1
                continue
            
            if consecutive_no_new >= 5:
                print("\n¡Fin de la lista detectado!")
                break
        else:
            consecutive_no_new = 0
        
        # Buscar y clickear "Ver más" (por detección OCR o forzado)
        ver_mas_detected = detect_ver_mas(text)
        if ver_mas_detected:
            click_ver_mas()
            ver_mas_clicked_count += 1
            print(f"  ✓ 'Ver más' clickeado (total: {ver_mas_clicked_count})")
            consecutive_no_new = 0
        else:
            # Si no hay "Ver más", hacer scroll
            scroll_down()
            print("  ✓ Scroll realizado")
    
    # Guardar resultados
    print("\n" + "=" * 60)
    print("GUARDANDO RESULTADOS")
    print("=" * 60)
    
    final_movements = list(all_movements.values())
    
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write(f"# Movimientos de Mercado Fantasy\n")
        f.write(f"# Capturados: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"# Total: {len(final_movements)} movimientos\n")
        f.write(f"# 'Ver más' clickeado: {ver_mas_clicked_count} veces\n")
        f.write("=" * 60 + "\n\n")
        
        for mov in final_movements:
            f.write(f"[{mov['date']}] {mov['text']}\n")
    
    print(f"\n✓ Guardados {len(final_movements)} movimientos en: {OUTPUT_FILE}")
    print(f"✓ 'Ver más' clickeado {ver_mas_clicked_count} veces")
    print("\n¡Captura completada!")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nCaptura interrumpida por el usuario.")
    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
