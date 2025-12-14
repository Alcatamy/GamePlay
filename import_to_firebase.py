#!/usr/bin/env python3
"""
Importador de movimientos históricos a Firebase
Ejecutar: python import_to_firebase.py
"""

import re
import json
import urllib.request
from datetime import datetime
from pathlib import Path

# Configuración
INPUT_FILE = r"C:\temp\movimientos.txt"
FIREBASE_URL = "https://mercato-fbdcc-default-rtdb.firebaseio.com/fantasy_data.json"

# Patrones regex
RE_SMART_FORMAT = re.compile(r'^\[([^\]]+)\] (.+)')
RE_TRANSFER = re.compile(r'(.+?) ha (comprado|vendido) al jugador (.+?) (?:de|a) (.+?) por ([\d\.]+)')
RE_SHIELD = re.compile(r'(.+?) ha blindado a (.+)', re.IGNORECASE)
RE_REWARD_JORNADA = re.compile(r'En la jornada (\d+), (.+?) ha ganado ([\d\.]+)', re.IGNORECASE)
RE_REWARD_11 = re.compile(r'(.+?) ha ganado ([\d\.]+).* por tener.+11 ideal', re.IGNORECASE)

def normalize_date(date_str):
    """Normaliza fechas, convierte horas sueltas a fecha de hoy."""
    if not date_str or date_str == 'NODATE':
        return 'Sin fecha'
    
    # Si es solo hora (ej: "20:37")
    if re.match(r'^\d{1,2}:\d{2}$', date_str):
        today = datetime.now().strftime('%d/%m/%Y')
        return f"{today} {date_str}"
    
    return date_str

def clean_text(text):
    """Limpia caracteres raros del texto."""
    return re.sub(r'[?''€\x00-\x1f]', '', text).strip()

def parse_movements(content):
    """Parsea el contenido del archivo y extrae movimientos."""
    lines = content.split('\n')
    movements = []
    seen_ids = set()
    
    print(f"[*] Leyendo {len(lines)} lineas...")
    
    for raw_line in lines:
        line = clean_text(raw_line)
        if not line or line.startswith('#') or line.startswith('---'):
            continue
        
        match = RE_SMART_FORMAT.match(line)
        if not match:
            continue
        
        date_key = match.group(1).strip()
        text_to_parse = match.group(2)
        normalized_date = normalize_date(date_key)
        
        # 1. Transferencias
        m = RE_TRANSFER.match(text_to_parse)
        if m:
            actor, action, player, other_party, amount_str = m.groups()
            amount = int(amount_str.replace('.', ''))
            buyer = actor.strip() if action == 'comprado' else other_party.strip()
            seller = other_party.strip() if action == 'comprado' else actor.strip()
            
            mov_id = f"transfer_{date_key}_{buyer}_{seller}_{player}_{amount}"
            
            if mov_id not in seen_ids:
                seen_ids.add(mov_id)
                movements.append({
                    'id': mov_id,
                    'type': 'transfer',
                    'buyer': buyer,
                    'seller': seller,
                    'player': player.strip(),
                    'amount': amount,
                    'date': normalized_date
                })
            continue
        
        # 2. Blindajes
        m = RE_SHIELD.match(text_to_parse)
        if m:
            manager, player = m.groups()
            mov_id = f"shield_{date_key}_{manager.strip()}_{player.strip()}"
            
            if mov_id not in seen_ids:
                seen_ids.add(mov_id)
                movements.append({
                    'id': mov_id,
                    'type': 'shield',
                    'beneficiary': manager.strip(),
                    'player': player.strip(),
                    'amount': 0,
                    'details': 'Blindaje',
                    'date': normalized_date
                })
            continue
        
        # 3. Premios Jornada
        m = RE_REWARD_JORNADA.match(text_to_parse)
        if m:
            jornada, beneficiary, amount_str = m.groups()
            amount = int(amount_str.replace('.', ''))
            mov_id = f"reward_jor{jornada}_{beneficiary.strip()}"
            
            if mov_id not in seen_ids:
                seen_ids.add(mov_id)
                movements.append({
                    'id': mov_id,
                    'type': 'reward',
                    'subtype': 'jornada',
                    'beneficiary': beneficiary.strip(),
                    'amount': amount,
                    'details': f'Jornada {jornada}',
                    'date': normalized_date
                })
            continue
        
        # 4. Premios 11 Ideal
        m = RE_REWARD_11.match(text_to_parse)
        if m:
            beneficiary, amount_str = m.groups()
            amount = int(amount_str.replace('.', ''))
            mov_id = f"reward_11_{beneficiary.strip()}_{date_key}_{amount}"
            
            if mov_id not in seen_ids:
                seen_ids.add(mov_id)
                movements.append({
                    'id': mov_id,
                    'type': 'reward',
                    'subtype': '11ideal',
                    'beneficiary': beneficiary.strip(),
                    'amount': amount,
                    'details': '11 Ideal',
                    'date': normalized_date
                })
            continue
    
    return movements

def upload_to_firebase(movements):
    """Sube los movimientos a Firebase via REST API."""
    data = {
        'managers': {
            "Vigar24": {"initialBudget": 103000000, "teamValue": 0, "clauseExpenses": 0, "name": "Vigar24"},
            "Vigar FC": {"initialBudget": 103000000, "teamValue": 0, "clauseExpenses": 0, "name": "Vigar FC"},
            "GOLENCIERRO FC": {"initialBudget": 103000000, "teamValue": 0, "clauseExpenses": 0, "name": "GOLENCIERRO FC"},
            "Pablinistan FC": {"initialBudget": 103000000, "teamValue": 0, "clauseExpenses": 0, "name": "Pablinistan FC"},
            "Alcatamy eSports By": {"initialBudget": 100000000, "teamValue": 0, "clauseExpenses": 0, "name": "Alcatamy eSports By"},
            "Alcatamy eSports By ": {"initialBudget": 100000000, "teamValue": 0, "clauseExpenses": 0, "name": "Alcatamy eSports By "},
            "Visite La Manga FC": {"initialBudget": 103000000, "teamValue": 0, "clauseExpenses": 0, "name": "Visite La Manga FC"},
            "Morenazos FC": {"initialBudget": 103000000, "teamValue": 0, "clauseExpenses": 0, "name": "Morenazos FC"}
        },
        'movements': movements,
        'lastUpdate': int(datetime.now().timestamp() * 1000),
        'importedAt': datetime.now().isoformat()
    }
    
    json_data = json.dumps(data).encode('utf-8')
    
    print(f"\n[UPLOAD] Subiendo {len(movements)} movimientos a Firebase...")
    
    req = urllib.request.Request(
        FIREBASE_URL,
        data=json_data,
        method='PUT',
        headers={'Content-Type': 'application/json'}
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            if response.status == 200:
                print("[OK] Subida exitosa!")
                return True
            else:
                print(f"[ERROR] Error HTTP {response.status}")
                return False
    except Exception as e:
        print(f"[ERROR] Error: {e}")
        return False

def main():
    print("=" * 60)
    print("IMPORTADOR DE MOVIMIENTOS A FIREBASE")
    print("=" * 60)
    
    # Leer archivo
    print(f"\n[*] Leyendo: {INPUT_FILE}")
    with open(INPUT_FILE, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()
    
    # Parsear
    movements = parse_movements(content)
    print(f"\n[OK] Movimientos parseados: {len(movements)}")
    
    # Resumen por tipo
    stats = {}
    for m in movements:
        stats[m['type']] = stats.get(m['type'], 0) + 1
    print(f"   Resumen: {stats}")
    
    # Subir
    if upload_to_firebase(movements):
        print("\n[DONE] Importacion completada!")
        print("   Los datos ahora estan en Firebase.")
        print("   La app ya puede usarlos directamente.")

if __name__ == '__main__':
    main()
