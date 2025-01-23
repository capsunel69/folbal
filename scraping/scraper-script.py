import requests
from bs4 import BeautifulSoup
import pandas as pd
import unicodedata
import os

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
    
    # Find and download team logo
    team_id = clean_text(team_name).lower().replace(' ', '_')
    logo_container = soup.find('div', {'class': 'data-header__profile-container'})
    team_logo_path = ''
    
    if logo_container and logo_container.find('img'):
        logo_url = logo_container.find('img')['src']
        try:
            # Create team_logos directory if it doesn't exist
            os.makedirs('team_logos', exist_ok=True)
            
            # Get image extension
            img_extension = os.path.splitext(logo_url.split('?')[0])[1]
            if not img_extension:
                img_extension = '.png'
                
            # Define logo path
            team_logo_path = f"{team_id}{img_extension}"
            full_logo_path = os.path.join('team_logos', team_logo_path)
            
            # Download logo if it doesn't exist
            if not os.path.exists(full_logo_path):
                logo_response = requests.get(logo_url, headers=headers)
                if logo_response.status_code == 200:
                    with open(full_logo_path, 'wb') as logo_file:
                        logo_file.write(logo_response.content)
                    print(f"Successfully downloaded logo for {team_name}")
                else:
                    print(f"Failed to download logo for {team_name}: HTTP {logo_response.status_code}")
                    team_logo_path = ''
        except Exception as logo_error:
            print(f"Error downloading logo for {team_name}: {logo_error}")
            team_logo_path = ''
    
    # Find the main squad table
    table = soup.find('table', {'class': 'items'})
    
    # Lists to store player data
    players_data = []
    
    # Create images directory if it doesn't exist
    os.makedirs('player_images', exist_ok=True)
    
    # Iterate through each player row
    for row in table.find_all('tr', {'class': ['odd', 'even']}):
        try:
            # Extract player information
            number = row.find('div', {'class': 'rn_nummer'}).text if row.find('div', {'class': 'rn_nummer'}) else ''
            name_cell = row.find('td', {'class': 'hauptlink'})
            name = clean_text(name_cell.find('a').text.strip()) if name_cell else ''
            
            # Generate unique player ID first
            player_id = f"{clean_text(team_name)}_{clean_text(name)}".lower().replace(' ', '_')
            
            # Find the image in the inline-table structure
            img_cell = row.find('table', {'class': 'inline-table'})
            player_img = img_cell.find('img', {'class': 'bilderrahmen-fixed'}) if img_cell else None
            player_img_url = player_img['data-src'] if player_img and 'data-src' in player_img.attrs else (player_img['src'] if player_img and 'src' in player_img.attrs else '')

            # Initialize img_path as empty
            img_path = ''
            
            # Only process if we have a valid URL and it's not a base64 image
            if player_img_url and not player_img_url.startswith('data:image'):
                try:
                    # Get image extension (default to .jpg if none found)
                    img_extension = os.path.splitext(player_img_url.split('?')[0])[1]  # Split URL at ? to remove query params
                    if not img_extension:
                        img_extension = '.jpg'
                    
                    # Define image path
                    img_path = f"{player_id}{img_extension}"
                    full_img_path = os.path.join('player_images', img_path)
                    
                    # Download image
                    img_response = requests.get(player_img_url, headers=headers)
                    if img_response.status_code == 200:
                        with open(full_img_path, 'wb') as img_file:
                            img_file.write(img_response.content)
                        print(f"Successfully downloaded image for {name}")
                    else:
                        print(f"Failed to download image for {name}: HTTP {img_response.status_code}")
                        img_path = ''
                except Exception as img_error:
                    print(f"Error downloading image for {name}: {img_error}")
                    img_path = ''

            # Continue with existing data extraction
            position_cell = row.find('table', {'class': 'inline-table'})
            position = position_cell.find_all('tr')[1].find('td').text.strip() if position_cell else ''
            age_cells = row.find_all('td', {'class': 'zentriert'})
            age = age_cells[1].text.strip() if len(age_cells) > 1 else ''
            nationality_img = row.find('img', {'class': 'flaggenrahmen'})
            nationality = nationality_img['title'] if nationality_img else ''
            market_value_cell = row.find('td', {'class': 'rechts hauptlink'})
            market_value = market_value_cell.text.strip() if market_value_cell else '-'
            
            # Add player data to list with team_id
            players_data.append({
                'PlayerID': player_id,
                'TeamID': team_id,
                'Team': team_name,
                'TeamLogo': team_logo_path,
                'Number': number,
                'Name': name,
                'Position': position,
                'Age': age,
                'Nationality': nationality,
                'Market Value': market_value,
                'Image': img_path
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

