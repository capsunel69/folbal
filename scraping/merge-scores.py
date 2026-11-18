"""
Adds the 'Scor' column to a fresh Superliga scrape, using scores from the graveyard.

Matching, per player:
  1. by PlayerID (same team + same name), newest score file first
  2. otherwise by Name only (player moved to another Superliga team), if the
     name points to exactly one score in that file

Run from scraping/:  python3 merge-scores.py
Output: superliga/superliga_players_with_scores.csv
"""
import os
import pandas as pd

PLAYERS = 'superliga/superliga_players.csv'
OUTPUT = 'superliga/superliga_players_with_scores.csv'

# Newest first: the first file that has a score for a player wins.
SCORE_FILES = [
    '../graveyard/2026-11-18/superliga/superliga_players_with_scores.csv',
    '../graveyard/2026-10-01/superliga/superliga_players_with_scores.csv',
    '../graveyard/2026-01-26/superliga/scor.csv',
    '../graveyard/2026-01-26/superliga/2025-10-23/superliga_players_with_scores.csv',
    '../graveyard/2026-01-26/superliga/2025-07-15/superliga_players_with_scores.csv',
    '../graveyard/2026-01-26/superliga/2025-07-08/superliga_players_with_scores.csv',
]


def norm(name):
    return ' '.join(str(name).lower().split())


def main():
    players = pd.read_csv(PLAYERS, encoding='utf-8-sig')
    sources = []
    for f in SCORE_FILES:
        if not os.path.exists(f):
            print(f'skip (missing): {f}')
            continue
        d = pd.read_csv(f, encoding='utf-8-sig').dropna(subset=['Scor'])
        by_id = dict(zip(d['PlayerID'], d['Scor']))
        d['_n'] = d['Name'].map(norm)
        uniq = d.groupby('_n')['Scor'].agg(lambda s: s.iloc[0] if s.nunique() == 1 else None)
        by_name = {k: v for k, v in uniq.items() if v is not None and (d['_n'] == k).sum() == 1}
        sources.append((f, by_id, by_name))

    scores, matched = [], []
    for _, p in players.iterrows():
        score, how = None, ''
        for f, by_id, _ in sources:
            if p['PlayerID'] in by_id:
                score, how = by_id[p['PlayerID']], 'id'
                break
        if score is None:
            for f, _, by_name in sources:
                if norm(p['Name']) in by_name:
                    score, how = by_name[norm(p['Name'])], 'name'
                    break
        scores.append(int(score) if score is not None else None)
        matched.append(how)

    players['Scor'] = pd.array(scores, dtype='Int64')
    players.to_csv(OUTPUT, index=False, encoding='utf-8-sig')

    m = pd.Series(matched)
    print(f'Players: {len(players)}')
    print(f'  score by PlayerID:        {(m == "id").sum()}')
    print(f'  score by name (transfer): {(m == "name").sum()}')
    print(f'  no score:                 {(m == "").sum()}')
    print(players.assign(_m=m).groupby('Team').agg(players=('Name', 'size'), with_score=('Scor', 'count')).to_string())
    print(f'\nSaved: {OUTPUT}')


if __name__ == '__main__':
    main()
