import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const API_KEY = 'pxLs1GW4wwXSfJcmgeo2lY1Btr19nP1g4XX6uzMj';

app.get('/api/teams/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    if (!query || query.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const url = `https://api.sportradar.us/soccer/trial/v4/en/teams/search.json`;
    console.log('Making API request to:', url);
    
    const response = await axios.get(url, {
      params: {
        api_key: API_KEY,
        name: query
      }
    });

    const teamData = response.data.teams.map(team => ({
      id: team.id,
      name: team.name,
      logo: team.logo
    }));

    res.json({ data: teamData });

  } catch (error) {
    console.error('Full API Error:', error);
    console.error('API Error Response:', error.response?.data);
    console.error('API Error Status:', error.response?.status);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

app.get('/api/teams/squad/:teamId', async (req, res) => {
  try {
    const response = await axios.get(
      `http://api.sportradar.us/soccer/trial/v4/en/teams/${req.params.teamId}/profile.json`,
      {
        params: {
          api_key: API_KEY
        }
      }
    );

    const playerData = {
      data: response.data.players.map(player => ({
        player: {
          display_name: player.name,
          name: player.name,
          nationality: player.nationality,
          date_of_birth: player.date_of_birth
        },
        position: {
          name: player.type || player.position
        }
      }))
    };

    res.json(playerData);
  } catch (error) {
    console.error('API Error:', error.response?.data || error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/teams', async (req, res) => {
  try {
    const response = await axios.get('https://api.sportmonks.com/v3/football/teams', {
      headers: {
        'X-Sportmonks-Api-Key': API_KEY
      },
      params: {
        per_page: 100
      }
    });

    const teams = response.data.data.map(team => ({
      id: team.id,
      name: team.name,
      logo: team.image_path
    }));

    res.json(teams);
  } catch (error) {
    console.error('API Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch teams list' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});