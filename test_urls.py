import requests

urls = [
    "https://www.guiafantasy.com/",
    "https://www.guiafantasy.com/mercado",
    "https://www.guiafantasy.com/jugadores",
    "https://www.guiafantasy.com/analisis",
    "https://www.guiafantasy.com/estadisticas"
]

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}

for url in urls:
    try:
        r = requests.get(url, headers=headers)
        print(f"{url}: {r.status_code}")
    except Exception as e:
        print(f"{url}: Error {e}")
