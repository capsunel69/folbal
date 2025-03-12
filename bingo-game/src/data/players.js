import bingoCardData from './bingoCard_001.json'

// Transform the JSON data into the format we need
export const players = bingoCardData.map(player => {
  // Get all categories where the player has a value of 1
  const playerCategories = Object.entries(player)
    .filter(([key, value]) => value === 1 && key !== 'player')
    .map(([key]) => key)

  return {
    id: player.player, // Using player name as ID
    name: player.player,
    categories: playerCategories,
    image: `https://via.placeholder.com/300x200?text=${encodeURIComponent(player.player)}` // Placeholder image
  }
})

export const getRandomPlayer = (usedPlayers = []) => {
  const availablePlayers = players.filter(p => !usedPlayers.includes(p.id))
  if (availablePlayers.length === 0) return null
  return availablePlayers[Math.floor(Math.random() * availablePlayers.length)]
}
