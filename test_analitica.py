import requests
from bs4 import BeautifulSoup

URL = "https://www.analiticafantasy.com/fantasy-la-liga/mercado-equipos"

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}

try:
    print(f"Fetching {URL}...")
    response = requests.get(URL, headers=headers)
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        soup = BeautifulSoup(response.text, 'html.parser')
        print(f"Page Title: {soup.title.string if soup.title else 'No Title'}")
        
        # Look for div containers that might hold player data
        # Common classes: player-row, card, item...
        divs = soup.find_all('div')
        print(f"Total Divs: {len(divs)}")
        
        # Preview text to see if we can spot "Lamine" or similar
        print("Text Preview (first 1000 chars):")
        print(response.text[:1000])
        
        # Check specifically for a player to see structure
        if "Lamine" in response.text:
            print("\nFOUND 'Lamine' in text! Trying to locate context...")
            # Simple context extraction
            idx = response.text.find("Lamine")
            print(response.text[idx-100:idx+300])

            
except Exception as e:
    print(f"Error: {e}")
