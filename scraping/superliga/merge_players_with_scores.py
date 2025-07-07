#!/usr/bin/env python3
"""
Script to merge superliga_players.csv with scor.csv based on PlayerID.
Creates a new CSV file with all players from superliga_players.csv and adds 
a 'Scor' column where scores exist in scor.csv.
"""

import pandas as pd
import os
from pathlib import Path

def merge_players_with_scores():
    """
    Merge superliga_players.csv with scor.csv based on PlayerID.
    """
    # Get the directory where this script is located
    script_dir = Path(__file__).parent
    
    # Define file paths
    players_file = script_dir / "superliga_players.csv"
    scores_file = script_dir / "scor.csv"
    output_file = script_dir / "superliga_players_with_scores.csv"
    
    # Check if input files exist
    if not players_file.exists():
        print(f"Error: {players_file} not found!")
        return
    
    if not scores_file.exists():
        print(f"Error: {scores_file} not found!")
        return
    
    try:
        # Read the CSV files
        print("Reading superliga_players.csv...")
        players_df = pd.read_csv(players_file)
        
        print("Reading scor.csv...")
        scores_df = pd.read_csv(scores_file)
        
        # Display basic info about the dataframes
        print(f"Found {len(players_df)} players in superliga_players.csv")
        print(f"Found {len(scores_df)} players in scor.csv")
        
        # Extract only PlayerID and Scor columns from scores_df for merging
        scores_subset = scores_df[['PlayerID', 'Scor']].copy()
        
        # Perform left join to keep all players from superliga_players.csv
        # and add Scor column where it exists
        merged_df = players_df.merge(scores_subset, on='PlayerID', how='left')
        
        # Count how many players have scores
        players_with_scores = merged_df['Scor'].notna().sum()
        players_without_scores = merged_df['Scor'].isna().sum()
        
        print(f"\nMerge Results:")
        print(f"- Players with scores: {players_with_scores}")
        print(f"- Players without scores: {players_without_scores}")
        print(f"- Total players in output: {len(merged_df)}")
        
        # Save the merged dataframe to a new CSV file
        merged_df.to_csv(output_file, index=False)
        print(f"\nOutput saved to: {output_file}")
        
        # Display a sample of the merged data
        print("\nSample of merged data:")
        print("=" * 80)
        sample_df = merged_df[['PlayerID', 'Name', 'Team', 'Position', 'Scor']].head(10)
        print(sample_df.to_string(index=False))
        
        # Show some statistics about scores
        if players_with_scores > 0:
            print(f"\nScore Statistics:")
            print(f"- Min score: {merged_df['Scor'].min()}")
            print(f"- Max score: {merged_df['Scor'].max()}")
            print(f"- Average score: {merged_df['Scor'].mean():.2f}")
        
    except Exception as e:
        print(f"Error occurred: {str(e)}")
        return
    
    print("\nMerge completed successfully!")

if __name__ == "__main__":
    merge_players_with_scores() 