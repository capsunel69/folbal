import requests
from bs4 import BeautifulSoup
import pandas as pd
import unicodedata
import os

def clean_text(text):
    # Remove special characters and normalize unicode
    cleaned = unicodedata.normalize('NFKD', text).encode('ASCII', 'ignore').decode('utf-8')
    return cleaned

def create_league_folders(league_name):
    # Create main league directory
    league_dir = clean_text(league_name).lower().replace(' ', '_')
    os.makedirs(league_dir, exist_ok=True)
    
    # Create subdirectories for team logos and player images
    os.makedirs(os.path.join(league_dir, 'team_logos'), exist_ok=True)
    os.makedirs(os.path.join(league_dir, 'player_images'), exist_ok=True)
    
    return league_dir

def scrape_team_squad(url, team_name, league_dir):
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
            # Get image extension
            img_extension = os.path.splitext(logo_url.split('?')[0])[1]
            if not img_extension:
                img_extension = '.png'
                
            # Define logo path
            team_logo_path = f"{team_id}{img_extension}"
            full_logo_path = os.path.join(league_dir, 'team_logos', team_logo_path)
            
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
    if not table:
        print(f"No squad table found for {team_name}")
        return []
    
    # Lists to store player data
    players_data = []
    
    # Iterate through each player row
    for row in table.find_all('tr', {'class': ['odd', 'even']}):
        try:
            # Extract player information
            number = row.find('div', {'class': 'rn_nummer'}).text if row.find('div', {'class': 'rn_nummer'}) else ''
            name_cell = row.find('td', {'class': 'hauptlink'})
            name = clean_text(name_cell.find('a').text.strip()) if name_cell else ''
            
            # Generate unique player ID
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
                    # Get image extension
                    img_extension = os.path.splitext(player_img_url.split('?')[0])[1]
                    if not img_extension:
                        img_extension = '.jpg'
                    
                    # Define image path
                    img_path = f"{player_id}{img_extension}"
                    full_img_path = os.path.join(league_dir, 'player_images', img_path)
                    
                    # Download image if it doesn't exist
                    if not os.path.exists(full_img_path):
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

def main():
    # Read the leagues.csv file
    leagues_df = pd.read_csv('leagues.csv')
    
    # Process each league
    for league in leagues_df['Liga'].unique():
        print(f"\nProcessing {league}...")
        
        # Create league directory
        league_dir = create_league_folders(league)
        
        # Get teams for this league
        league_teams = leagues_df[leagues_df['Liga'] == league]
        
        # List to store all players from current league
        league_players_data = []
        
        # Scrape data for each team in the league
        for _, row in league_teams.iterrows():
            print(f"\nScraping data for {row['Echipa']}...")
            team_data = scrape_team_squad(row['Link'], row['Echipa'], league_dir)
            
            # Add league and country information to each player
            for player in team_data:
                player['League'] = league
                player['Country'] = row['Tara']
            
            league_players_data.extend(team_data)
        
        # Create DataFrame with all players in the league
        if league_players_data:
            league_players_df = pd.DataFrame(league_players_data)
            
            # Save to CSV file with UTF-8 encoding
            output_file = os.path.join(league_dir, f'{clean_text(league).lower().replace(" ", "_")}_players.csv')
            league_players_df.to_csv(output_file, index=False, encoding='utf-8-sig')
            print(f"\nData has been saved to '{output_file}'")
        else:
            print(f"\nNo data was collected for {league}")

if __name__ == "__main__":
    main()

