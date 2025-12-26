import requests

import requests

# List of potential endpoints to try
urls = [
    "https://www.guiafantasy.com/inc/contenido_jugadores.php",
    "https://www.guiafantasy.com/contenido_jugadores.php",
    "https://www.guiafantasy.com/jugadores/contenido_jugadores.php",
    "https://www.guiafantasy.com/include/contenido_jugadores.php",
    "https://www.guiafantasy.com/ajax/contenido_jugadores.php"
]

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    "X-Requested-With": "XMLHttpRequest",
    "Origin": "https://www.guiafantasy.com",
    "Referer": "https://www.guiafantasy.com/jugadores"
}

# Base payload
data = "operacion=1&id_equipo=0&limite=0&ordenar=valor_mercado"

for url in urls:
    print(f"\n--- Testing: {url} ---")
    try:
        response = requests.post(url, headers=headers, data=data)
        print(f"Status: {response.status_code}")
        if response.status_code == 200 and "ficha_jugador" in response.text:
             print(f"SUCCESS: Found valid endpoint with DATA! URL: {url}")
             print("Preview:", response.text[:200])
             break
    except Exception as e:
        print(f"Error: {e}")
