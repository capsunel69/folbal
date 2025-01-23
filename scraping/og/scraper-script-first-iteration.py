import requests
from bs4 import BeautifulSoup
import pandas as pd
import unicodedata

def clean_text(text):
    # Remove special characters and normalize unicode
    cleaned = unicodedata.normalize('NFKD', text).encode('ASCII', 'ignore').decode('utf-8')
    return cleaned

def scrape_team_squad(url, team_name):
    # Headers to mimic browser request
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    # Send request and get content
    response = requests.get(url, headers=headers)
    soup = BeautifulSoup(response.content, 'html.parser')
    
    # Find the main squad table
    table = soup.find('table', {'class': 'items'})
    
    # Lists to store player data
    players_data = []
    
    # Iterate through each player row
    for row in table.find_all('tr', {'class': ['odd', 'even']}):
        try:
            # Extract player information
            number = row.find('div', {'class': 'rn_nummer'}).text if row.find('div', {'class': 'rn_nummer'}) else ''
            name_cell = row.find('td', {'class': 'hauptlink'})
            name = clean_text(name_cell.find('a').text.strip()) if name_cell else ''
            position_cell = row.find('td', recursive=False).find_next_sibling('td').find('table')
            position = position_cell.find_all('tr')[1].find('td').text.strip() if position_cell else ''
            age_cells = row.find_all('td', {'class': 'zentriert'})
            age = age_cells[1].text.strip() if len(age_cells) > 1 else ''
            nationality_img = row.find('img', {'class': 'flaggenrahmen'})
            nationality = nationality_img['title'] if nationality_img else ''
            market_value_cell = row.find('td', {'class': 'rechts hauptlink'})
            market_value = market_value_cell.text.strip() if market_value_cell else '-'
            
            # Add player data to list with team name
            players_data.append({
                'Team': team_name,
                'Number': number,
                'Name': name,
                'Position': position,
                'Age': age,
                'Nationality': nationality,
                'Market Value': market_value
            })
            
        except Exception as e:
            print(f"Error processing row for {team_name}: {e}")
            continue
    
    return players_data

# Read the superliga.csv file
teams_df = pd.read_csv('superliga.csv')

# List to store all players from all teams
all_players_data = []

# Scrape data for each team
for index, row in teams_df.iterrows():
    print(f"Scraping data for {row['team']}...")
    team_data = scrape_team_squad(row['link'], row['team'])
    all_players_data.extend(team_data)
    
# Create DataFrame with all players
all_players_df = pd.DataFrame(all_players_data)

# Save to CSV file with UTF-8 encoding
all_players_df.to_csv('superliga_players.csv', index=False, encoding='utf-8-sig')
print("Data has been saved to 'superliga_players.csv'")

