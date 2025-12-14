import re
from collections import defaultdict

file_path = 'movimientos_ultimate.txt'

# Regex to parse the line content (ignoring date for signature)
# Format: [DD/MM/YYYY] Msg
# We want to catch the Msg part.
re_line = re.compile(r'^\[\d{2}/\d{2}/\d{4}\] (.+)')

# Regex to parse details for stricter logic checking
# Actor ha (comprado|vendido) al jugador Player (de|a) Other por Amount
re_transfer = re.compile(r'(.+?) ha (comprado|vendido) al jugador (.+?) (?:de|a) (.+?) por ([\d\.]+)[€]?')

duplicates = []
seen_signatures = defaultdict(list)

def analyze():
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    print(f"Total lines: {len(lines)}")
    
    for i, line in enumerate(lines):
        line = line.strip()
        if not line or line.startswith('#') or line.startswith('-'):
            continue
            
        match = re_line.match(line)
        if match:
            msg = match.group(1).strip()
            
            # Additional logic: Extract transaction details to key them
            # For transfers, the key is "Buyer|Seller|Player|Amount"
            # We ignore the date.
            trans_match = re_transfer.match(msg)
            if trans_match:
                # Normalizing key
                actor, action, player, other, amount = trans_match.groups()
                amount = amount.replace('.', '')
                
                if action == 'comprado':
                    buyer = actor
                    seller = other
                else:
                    buyer = other
                    seller = actor
                
                # UNIQUE KEY: Buyer-Seller-Player-Amount
                # This should be unique roughly. It's very unlikely to buy/sell same player same price multiple times without intermediate steps.
                key = f"TRANSFER|{buyer}|{seller}|{player}|{amount}"
                seen_signatures[key].append(line)
            
            elif "ha blindado a" in msg:
                 # Blindajes: Manager-Player
                 key = f"SHIELD|{msg}" 
                 seen_signatures[key].append(line)
                 
            elif "ha ganado" in msg and "11 ideal" in msg:
                # 11 Ideal: Beneficiary-Amount (Amount is usually standard, but let's check)
                key = f"REWARD11|{msg}"
                seen_signatures[key].append(line)
                
            elif "En la jornada" in msg:
                # Jornada: JornadaNum-Manager-Amount
                key = f"REWARDJ|{msg}"
                seen_signatures[key].append(line)
                
            else:
                # Fallback for unexpected lines
                seen_signatures[f"RAW|{msg}"].append(line)

    # Print results
    dup_count = 0
    print("\n=== POSIBLES DUPLICADOS (Misma operación, diferente fecha o duplicada) ===\n")
    for key, instances in seen_signatures.items():
        if len(instances) > 1:
            dup_count += 1
            print(f"--- DETECTADO ({len(instances)} veces) ---")
            print(f"Key: {key}")
            for inst in instances:
                print(f"  {inst}")
    
    print(f"\nTotal grupos de duplicados detectados: {dup_count}")

if __name__ == '__main__':
    analyze()
