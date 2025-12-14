import re

infile = 'movimientos_ultimate.txt'
outfile = 'movimientos_ultimate_clean.txt'

# Regex definitions
re_line = re.compile(r'^\[\d{2}/\d{2}/\d{4}\] (.+)')
re_transfer = re.compile(r'(.+?) ha (comprado|vendido) al jugador (.+?) (?:de|a) (.+?) por ([\d\.]+)[€]?')

seen_keys = set()
kept_lines = []
removed_count = 0

print(f"Cleaning {infile}...")

with open(infile, 'r', encoding='utf-8') as f:
    for line in f:
        line_clean = line.strip()
        # Keep headers/empty/comments
        if not line_clean or line_clean.startswith('#') or line_clean.startswith('-'):
            kept_lines.append(line)
            continue
            
        match = re_line.match(line_clean)
        if match:
            msg = match.group(1).strip()
            key = None
            
            # Identify Key based on content Logic
            trans_match = re_transfer.match(msg)
            if trans_match:
                actor, action, player, other, amount = trans_match.groups()
                amount = amount.replace('.', '')
                if action == 'comprado':
                    buyer, seller = actor, other
                else:
                    buyer, seller = other, actor
                # Unique Key: Buyer-Seller-Player-Amount
                key = f"TRANSFER|{buyer}|{seller}|{player}|{amount}"
            
            elif "ha blindado a" in msg:
                # Key: Full message (Manager ha blindado a Player)
                key = f"SHIELD|{msg}"
            
            elif "En la jornada" in msg and "ha ganado" in msg:
                 # Key: Full Msg (Jornada X, Manager ha ganado Y) -> Unique per Jornada/Manager
                 key = f"REWARDJ|{msg}"
            
            elif "11 ideal" in msg:
                 # Key: Full Msg (Manager ha ganado X por ... Jornada Y)
                 key = f"REWARD11|{msg}"

            if key:
                if key in seen_keys:
                    removed_count += 1
                    # Skip duplicate writing
                    continue 
                seen_keys.add(key)
                kept_lines.append(line)
            else:
                # Unrecognized pattern but has date -> keep it just in case logic fails
                kept_lines.append(line)
        else:
            # Lines without date prefix (maybe old format) -> keep
            kept_lines.append(line)

with open(outfile, 'w', encoding='utf-8') as f:
    f.writelines(kept_lines)

print(f"Done. Removed {removed_count} duplicates.")
print(f"Clean file saved to: {outfile}")
