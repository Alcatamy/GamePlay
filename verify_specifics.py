import csv

filename = "movimientos_fantasy_2025-12-17.csv"
encodings = ['utf-8', 'latin-1', 'cp1252']

target_alvaro = {
    "player": "Álvaro Nuñez",
    "date_part": "17/12", # or just check recent
    "amount_approx": 20000000
}

target_yuri = {
    "player": "Yuri",
    "date_part": "16/12", # or close
    "amount_approx": 20500000
}

found_alvaro = []
found_yuri = []

for enc in encodings:
    try:
        with open(filename, 'r', encoding=enc) as f:
            reader = csv.reader(f)
            header = next(reader)
            for row in reader:
                # Row format: Fecha, Tipo, Jugador, De, A, Importe
                if len(row) < 6: continue
                date, type, player, seller, buyer, amount = row
                
                if target_alvaro["player"] in player:
                    found_alvaro.append(row)
                if target_yuri["player"] in player:
                    found_yuri.append(row)
        break # if successful
    except UnicodeDecodeError:
        continue

print("--- Matches for Álvaro Nuñez ---")
for m in found_alvaro: print(m)

print("\n--- Matches for Yuri ---")
for m in found_yuri: print(m)
