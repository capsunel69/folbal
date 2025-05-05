import pandas as pd
import os

# Read the scor data
scor_df = pd.read_csv('scor_to_process.csv')

# Create a dictionary for quick lookup of scores by PlayerID
scor_dict = dict(zip(scor_df['PlayerID'], scor_df['Scor']))

# List of leagues to process
leagues = ['bundesliga', 'la_liga', 'ligue_1', 'premier_league', 'seria_a', 'superliga']

# Process each league
for league in leagues:
    league_dir = os.path.join('scraping', league)
    league_file = os.path.join(league_dir, f'{league}_players.csv')
    
    # Check if the league file exists
    if not os.path.exists(league_file):
        print(f"Warning: {league_file} not found, skipping...")
        continue
    
    try:
        # Read the league data
        league_df = pd.read_csv(league_file)
        
        # Add Scor column, defaulting to None for players not in scor_dict
        league_df['Scor'] = league_df['PlayerID'].map(scor_dict)
        
        # Save the new CSV file
        output_file = os.path.join(league_dir, f'{league}_players_with_scor.csv')
        league_df.to_csv(output_file, index=False)
        print(f"Successfully processed {league} - Output saved to {output_file}")
        
    except Exception as e:
        print(f"Error processing {league}: {str(e)}")

print("Processing complete!") 