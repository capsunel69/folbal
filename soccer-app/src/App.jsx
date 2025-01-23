import { useState, useEffect } from 'react'
import { TextField, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, Container, Card, CardContent, Grid, Autocomplete } from '@mui/material'
import './App.css'

function App() {
  const [players, setPlayers] = useState([])
  const [teamId, setTeamId] = useState('')
  const [teamLogo, setTeamLogo] = useState('')
  const [teams, setTeams] = useState([])
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const fetchTeams = async () => {
      if (!searchQuery || searchQuery.length < 2) {
        setTeams([]);
        return;
      }
      try {
        setLoading(true);
        const response = await fetch(`http://localhost:3001/api/teams/search/${searchQuery}`);
        const data = await response.json();
        const teamData = data.data.map(team => ({
          id: team.id,
          name: team.name,
          logo: team.image_path
        }));
        setTeams(teamData);
      } catch (error) {
        console.error('Error fetching teams:', error);
        setTeams([]);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchTeams, 500);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  useEffect(() => {
    if (!teamId) return;
    const fetchPlayers = async () => {
      try {
        setLoading(true);
        const response = await fetch(`http://localhost:3001/api/teams/squad/${teamId}`);
        const data = await response.json();
        const playerData = data.data.map(player => ({
          name: player.player.display_name || player.player.name,
          nationality: player.player.nationality,
          age: calculateAge(player.player.date_of_birth),
          position: player.position?.name || 'Unknown'
        }));
        setPlayers(playerData);
      } catch (error) {
        console.error('Error fetching players:', error);
        setPlayers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayers();
  }, [teamId]);

  // Add this helper function
  const calculateAge = (dateOfBirth) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleTeamChange = (event, value) => {
    if (value) {
      setTeamId(value.id)
      setSelectedTeam(value)
      setTeamLogo(value.logo)
    }
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Card sx={{ mb: 4, p: 3, backgroundColor: '#f5f5f5' }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={teamLogo ? 9 : 12}>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#1a237e' }}>
              Football Team Squad Explorer
            </Typography>
            <Autocomplete
              options={teams}
              getOptionLabel={(option) => option.name}
              onChange={handleTeamChange}
              onInputChange={(event, value) => setSearchQuery(value)}
              loading={loading}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Search for any team"
                  variant="outlined"
                  fullWidth
                  sx={{ backgroundColor: 'white' }}
                />
              )}
            />
          </Grid>
          {teamLogo && (
            <Grid item xs={12} md={3} sx={{ textAlign: 'center' }}>
              <img
                src={teamLogo}
                alt="Team Logo"
                style={{
                  width: '120px',
                  height: '120px',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0px 4px 8px rgba(0,0,0,0.2))'
                }}
              />
            </Grid>
          )}
        </Grid>
      </Card>

      {players.length > 0 && (
        <TableContainer component={Paper} sx={{ boxShadow: 3 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#1a237e' }}>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Name</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Nationality</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Age</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Position</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {players.map((player, index) => (
                <TableRow 
                  key={index}
                  sx={{ '&:nth-of-type(odd)': { backgroundColor: '#f5f5f5' } }}
                >
                  <TableCell>{player.name}</TableCell>
                  <TableCell>{player.nationality}</TableCell>
                  <TableCell>{player.age}</TableCell>
                  <TableCell>{player.position}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Container>
  )
}

export default App
