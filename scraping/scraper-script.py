import requests
from bs4 import BeautifulSoup
import pandas as pd
import unicodedata
import os
import argparse
import time
import random

def clean_text(text):
    # Remove special characters and normalize unicode
    # NFKD decomposition separates characters from their diacritics
    cleaned = unicodedata.normalize('NFKD', text).encode('ASCII', 'ignore').decode('utf-8')
    return cleaned.strip()

def download_with_retry(url, headers, max_retries=3, base_delay=1):
    """
    Download content with retry logic and exponential backoff
    """
    for attempt in range(max_retries):
        try:
            # Add a random delay between requests to avoid rate limiting
            if attempt > 0:
                delay = base_delay * (2 ** attempt) + random.uniform(0, 1)
                print(f"  Retry {attempt + 1}/{max_retries} after {delay:.1f}s delay...")
                time.sleep(delay)
            else:
                # Even on first attempt, add a small delay
                time.sleep(random.uniform(0.5, 1.5))
            
            response = requests.get(url, headers=headers, timeout=10)
            
            if response.status_code == 200:
                return response
            elif response.status_code in [502, 503, 429]:  # Bad Gateway, Service Unavailable, Too Many Requests
                if attempt < max_retries - 1:
                    continue
                else:
                    return response
            else:
                return response
                
        except requests.exceptions.RequestException as e:
            if attempt < max_retries - 1:
                print(f"  Request failed: {e}, retrying...")
                continue
            else:
                raise
    
    return None

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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
    }
    
    # Send request and get content with retry logic
    response = download_with_retry(url, headers)
    if not response or response.status_code != 200:
        print(f"Failed to fetch page for {team_name}")
        return []
    
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
                logo_response = download_with_retry(logo_url, headers)
                if logo_response and logo_response.status_code == 200:
                    with open(full_logo_path, 'wb') as logo_file:
                        logo_file.write(logo_response.content)
                    print(f"Successfully downloaded logo for {team_name}")
                else:
                    status = logo_response.status_code if logo_response else 'No response'
                    print(f"Failed to download logo for {team_name}: HTTP {status}")
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
            
            # Find name - it's inside the inline-table structure
            inline_table = row.find('table', {'class': 'inline-table'})
            if not inline_table:
                print(f"Skipping row - no inline-table found")
                continue
                
            name_cell = inline_table.find('td', {'class': 'hauptlink'})
            if not name_cell or not name_cell.find('a'):
                print(f"Skipping row - no name found")
                continue
                
            name = clean_text(name_cell.find('a').text.strip())
            
            if not name:
                print(f"  ⚠️  Skipping row - empty name")
                continue
            
            print(f"  Processing: {name}")
            
            # Generate unique player ID
            player_id = f"{clean_text(team_name)}_{clean_text(name)}".lower().replace(' ', '_')
            
            # Find the image in the inline-table structure (we already have inline_table from above)
            player_img = inline_table.find('img', {'class': 'bilderrahmen-fixed'}) if inline_table else None
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
                        img_response = download_with_retry(player_img_url, headers)
                        if img_response and img_response.status_code == 200:
                            with open(full_img_path, 'wb') as img_file:
                                img_file.write(img_response.content)
                            print(f"  ✓ Downloaded image for {name}")
                        else:
                            status = img_response.status_code if img_response else 'No response'
                            print(f"  ✗ Failed to download image for {name}: HTTP {status}")
                            img_path = ''
                except Exception as img_error:
                    print(f"  ✗ Error downloading image for {name}: {img_error}")
                    img_path = ''

            # Extract position from the inline-table
            position_rows = inline_table.find_all('tr') if inline_table else []
            position = position_rows[1].find('td').text.strip() if len(position_rows) > 1 and position_rows[1].find('td') else ''
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
    # Set up command line argument parsing
    parser = argparse.ArgumentParser(description='Scrape football league data from Transfermarkt')
    parser.add_argument('--league', '-l', type=str, help='Specify which league to scrape (e.g., "Premier League", "La Liga")')
    parser.add_argument('--team', '-t', type=str, help='Specify which team to scrape (e.g., "Real Madrid", "AC Milan")')
    parser.add_argument('--list-leagues', action='store_true', help='List all available leagues and exit')
    parser.add_argument('--list-teams', action='store_true', help='List all available teams and exit')
    args = parser.parse_args()
    
    # Read the leagues.csv file
    leagues_df = pd.read_csv('leagues.csv')
    
    # If --list-leagues flag is used, show available leagues and exit
    if args.list_leagues:
        print("Available leagues:")
        for league in leagues_df['Liga'].unique():
            print(f"  - {league}")
        return
    
    # If --list-teams flag is used, show available teams and exit
    if args.list_teams:
        print("Available teams:")
        if args.league:
            teams = leagues_df[leagues_df['Liga'] == args.league]['Echipa'].tolist()
            print(f"\nTeams in {args.league}:")
            for team in teams:
                print(f"  - {team}")
        else:
            for league in leagues_df['Liga'].unique():
                print(f"\n{league}:")
                teams = leagues_df[leagues_df['Liga'] == league]['Echipa'].tolist()
                for team in teams:
                    print(f"  - {team}")
        return
    
    # Determine which leagues to process
    if args.league:
        # Check if the specified league exists
        available_leagues = leagues_df['Liga'].unique()
        if args.league not in available_leagues:
            print(f"Error: League '{args.league}' not found.")
            print("Available leagues:")
            for league in available_leagues:
                print(f"  - {league}")
            return
        leagues_to_process = [args.league]
        print(f"Processing specified league: {args.league}")
    else:
        leagues_to_process = leagues_df['Liga'].unique()
        print("No specific league specified. Processing all leagues...")
    
    # Process each league
    for league in leagues_to_process:
        print(f"\nProcessing {league}...")
        
        # Create league directory
        league_dir = create_league_folders(league)
        
        # Check if CSV file already exists and load existing data
        output_file = os.path.join(league_dir, f'{clean_text(league).lower().replace(" ", "_")}_players.csv')
        existing_teams = set()
        existing_data = []
        
        if os.path.exists(output_file):
            try:
                existing_df = pd.read_csv(output_file, encoding='utf-8-sig')
                existing_teams = set(existing_df['Team'].unique()) if 'Team' in existing_df.columns else set()
                existing_data = existing_df.to_dict('records')
                print(f"Found existing CSV with {len(existing_teams)} teams: {', '.join(sorted(existing_teams))}")
            except Exception as e:
                print(f"Warning: Could not read existing CSV file: {e}")
                existing_teams = set()
                existing_data = []
        
        # Get teams for this league
        league_teams = leagues_df[leagues_df['Liga'] == league]
        
        # Filter by team if specified
        if args.team:
            league_teams = league_teams[league_teams['Echipa'] == args.team]
            if league_teams.empty:
                print(f"Error: Team '{args.team}' not found in league '{league}'.")
                available_teams = leagues_df[leagues_df['Liga'] == league]['Echipa'].tolist()
                print(f"Available teams in {league}:")
                for team in available_teams:
                    print(f"  - {team}")
                continue
            print(f"Processing specified team: {args.team}")
        
        # List to store all new players from current league
        new_players_data = []
        
        # Scrape data for each team in the league
        for _, row in league_teams.iterrows():
            team_name = row['Echipa']
            
            # Check if team data already exists
            if team_name in existing_teams:
                print(f"⏭️  Skipping {team_name} - data already exists in CSV")
                continue
                
            print(f"\n🔄 Scraping data for {team_name}...")
            team_data = scrape_team_squad(row['Link'], team_name, league_dir)
            
            if team_data:
                # Add league and country information to each player
                for player in team_data:
                    player['League'] = league
                    player['Country'] = row['Tara']
                
                new_players_data.extend(team_data)
                print(f"✅ Successfully scraped {len(team_data)} players from {team_name}")
            else:
                print(f"❌ No data found for {team_name}")
        
        # Combine existing data with new data and save
        if new_players_data or existing_data:
            all_players_data = existing_data + new_players_data
            combined_df = pd.DataFrame(all_players_data)
            
            # Save to CSV file with UTF-8 encoding
            combined_df.to_csv(output_file, index=False, encoding='utf-8-sig')
            
            if new_players_data:
                print(f"\n✅ Added {len(new_players_data)} new players to '{output_file}'")
                print(f"📊 Total players in league: {len(all_players_data)}")
            else:
                print(f"\n📋 No new data to add - all teams already exist in '{output_file}'")
        else:
            print(f"\n❌ No data was collected for {league}")

if __name__ == "__main__":
    main()

