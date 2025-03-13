import { ChakraProvider, Container, VStack, Heading, useToast, Button, Text, HStack, Box } from '@chakra-ui/react'
import { Global } from '@emotion/react'
import { useState, useEffect } from 'react'
import BingoBoard from './components/BingoBoard'
import PlayerCard from './components/PlayerCard'
import GameControls from './components/GameControls'
import theme from './theme'
import gameData from './data/548.json'
import { formatCategories } from './data/categories'

function App() {
  const [gameState, setGameState] = useState('start')
  const [currentPlayer, setCurrentPlayer] = useState(null)
  const [selectedCells, setSelectedCells] = useState([])
  const [validSelections, setValidSelections] = useState([])
  const [currentInvalidSelection, setCurrentInvalidSelection] = useState(null)
  const [usedPlayers, setUsedPlayers] = useState([])
  const [hasWildcard, setHasWildcard] = useState(true)
  const [skipPenalty, setSkipPenalty] = useState(false)
  const [wildcardMatches, setWildcardMatches] = useState([])
  const toast = useToast()

  // Initialize categories from the new format
  const categories = formatCategories(gameData.gameData.remit)

  const getRandomPlayer = (usedPlayerIds = []) => {
    if (!gameData.gameData.players) {
      console.log('No players data available:', gameData.gameData)
      return null
    }
    const availablePlayers = gameData.gameData.players.filter(
      player => !usedPlayerIds.includes(player.id)
    )
    if (availablePlayers.length === 0) return null
    const selectedPlayer = availablePlayers[Math.floor(Math.random() * availablePlayers.length)]
    console.log('Selected player:', selectedPlayer)
    return selectedPlayer
  }

  const startGame = () => {
    const firstPlayer = getRandomPlayer()
    if (!firstPlayer) {
      showToast({
        title: "Error",
        description: "No players available to start the game",
        status: "error",
      })
      return
    }
    setGameState('playing')
    setCurrentPlayer(firstPlayer)
    setSelectedCells([])
    setValidSelections([])
    setCurrentInvalidSelection(null)
    setUsedPlayers([])
    setHasWildcard(true)
    setWildcardMatches([])
    setSkipPenalty(false)
  }

  const showToast = (options) => {
    toast.closeAll()
    
    toast({
      position: "bottom",
      duration: 2000,
      isClosable: true,
      ...options,
    })
  }

  const handleCellSelect = (categoryId) => {
    if (!currentPlayer) return
    
    setCurrentInvalidSelection(null)
    const category = categories[categoryId].originalData
    
    const isValidSelection = currentPlayer.v.some(achievementId => 
      category.some(requirement => requirement.id === achievementId)
    )

    if (isValidSelection) {
      const newSelectedCells = [...selectedCells, categoryId]
      setSelectedCells(newSelectedCells)
      setValidSelections([...validSelections, categoryId])
      
      if (newSelectedCells.length >= categories.length) {
        endGame(true)
        return
      }

      moveToNextPlayer()
    } else {
      setCurrentInvalidSelection(categoryId)
      showToast({
        title: "Wrong selection!",
        description: "That category doesn't match this player's achievements.",
        status: "error",
      })
      moveToNextPlayer()
    }
  }

  const moveToNextPlayer = () => {
    setCurrentInvalidSelection(null)
    
    const newUsedPlayers = [...usedPlayers, currentPlayer.id]
    setUsedPlayers(newUsedPlayers)
    const nextPlayer = getRandomPlayer(newUsedPlayers)
    
    if (!nextPlayer) {
      endGame(false)
    } else {
      setCurrentPlayer(nextPlayer)
    }
  }

  const handleWildcard = () => {
    if (!currentPlayer || !hasWildcard) return
    
    // Get all valid categories for the current player
    const validCategories = categories.reduce((acc, category, index) => {
      const isValid = currentPlayer.v.some(achievementId => 
        category.originalData.some(requirement => requirement.id === achievementId)
      )
      if (isValid) acc.push(index)
      return acc
    }, [])

    if (validCategories.length === 0) {
      showToast({
        title: "No valid categories",
        description: "This player doesn't match any categories",
        status: "warning",
      })
      return
    }

    // Update both states in a single batch
    const newValidSelections = [...validSelections, ...validCategories]
    const newWildcardMatches = [...wildcardMatches, ...validCategories]
    
    setValidSelections(newValidSelections)
    setWildcardMatches(newWildcardMatches)
    setSelectedCells(prev => [...new Set([...prev, ...validCategories])])
    setHasWildcard(false)
    
    console.log('Wildcard matches:', newWildcardMatches) // Debug log
    
    if (newValidSelections.length >= categories.length) {
      endGame(true)
      return
    }
    
    moveToNextPlayer()
  }

  const endGame = (isWin) => {
    setGameState('end')
    showToast({
      title: isWin ? "Congratulations!" : "Game Over!",
      description: isWin 
        ? "You've completed all categories!"
        : `No more players available. You matched ${validSelections.length} of 16 categories.`,
      status: isWin ? "success" : "info",
      duration: 4000,
    })
  }

  const handleSkip = () => {
    if (skipPenalty) {
      setSkipPenalty(false)
      return
    }

    const newUsedPlayers = [...usedPlayers, currentPlayer.id]
    setUsedPlayers(newUsedPlayers)
    const nextPlayer = getRandomPlayer(newUsedPlayers)
    
    if (nextPlayer) {
      setCurrentPlayer(nextPlayer)
    } else {
      endGame(false)
    }
  }

  const containerStyles = {
    minH: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    p: 4,
    w: "100%",
    maxW: "100%",
    margin: 0
  }

  if (gameState === 'start') {
    return (
      <ChakraProvider theme={theme}>
        <Global
          styles={`
            html, body, #root {
              width: 100%;
              height: 100%;
              margin: 0;
              padding: 0;
              background-image: url('/images/background.jpg');
              background-size: cover;
              background-position: center;
              background-repeat: no-repeat;
            }
          `}
        />
        <Box {...containerStyles}>
          <Container maxW="container.lg" py={8} mx="auto">
            <VStack spacing={8} align="center" w="full">
              <Heading as="h1" size="xl" textAlign="center">Football Bingo</Heading>
              <Text fontSize="lg" textAlign="center">
                Match players with their achievements and categories to score points!
                Use your wildcard wisely to maximize your score.
              </Text>
              <Button colorScheme="brand" size="lg" onClick={startGame}>
                Start Game
              </Button>
            </VStack>
          </Container>
        </Box>
      </ChakraProvider>
    )
  }

  if (gameState === 'end') {
    return (
      <ChakraProvider theme={theme}>
        <Global
          styles={`
            html, body, #root {
              width: 100%;
              height: 100%;
              margin: 0;
              padding: 0;
              background-image: url('/images/background.jpg');
              background-size: cover;
              background-position: center;
              background-repeat: no-repeat;
            }
          `}
        />
        <Box {...containerStyles}>
          <Container maxW="container.lg" py={8} mx="auto">
            <VStack spacing={8} align="center" w="full">
              <Heading as="h1" size="xl" textAlign="center">Game Over!</Heading>
              <Text fontSize="2xl" fontWeight="bold">Final Score: {validSelections.length} of 16</Text>
              <VStack spacing={4}>
                <Text>Categories Matched: {validSelections.length} of 16</Text>
                <Text>Wrong Attempts: {currentInvalidSelection ? 1 : 0}</Text>
                <Text>Players Used: {usedPlayers.length}</Text>
                {validSelections.length >= 16 && (
                  <Text color="green.500" fontWeight="bold">
                    Congratulations! You've completed all categories!
                  </Text>
                )}
              </VStack>
              <Button colorScheme="brand" size="lg" onClick={startGame}>
                Play Again
              </Button>
            </VStack>
          </Container>
        </Box>
      </ChakraProvider>
    )
  }

  if (gameState === 'playing') {
    return (
      <ChakraProvider theme={theme}>
        <Global
          styles={`
            html, body, #root {
              width: 100%;
              height: 100%;
              margin: 0;
              padding: 0;
              background-image: url('/images/background.jpg');
              background-size: cover;
              background-position: center;
              background-repeat: no-repeat;
            }
          `}
        />
        <Box {...containerStyles}>
          <Container maxW="container.lg" py={8} mx="auto">
            <VStack spacing={8} w="full" align="center">
              <HStack 
                justify="space-between" 
                w="full" 
                flexDir={['column', 'row']} 
                spacing={[4, 8]}
                align="center"
              >
                <Heading as="h1" size={['lg', 'xl']}>Football Bingo</Heading>
                <Text fontSize="sm" color="gray.500">
                  Players used: {usedPlayers.length} / {gameData.gameData.players.length}
                </Text>
              </HStack>
              
              <Box 
                w="full" 
                maxW="300px" 
                mx="auto" 
                p={4} 
                bg="rgba(0, 0, 0, 0.6)" 
                borderRadius="xl"
                boxShadow="0 4px 12px rgba(0, 0, 0, 0.3)"
              >
                <Text 
                  fontSize="2xl" 
                  fontWeight="bold" 
                  textAlign="center"
                  color="white"
                  textShadow="0 2px 4px rgba(0, 0, 0, 0.3)"
                >
                  {currentPlayer ? `${currentPlayer.f} ${currentPlayer.g}` : 'No player selected'}
                </Text>
                {process.env.NODE_ENV === 'development' }
              </Box>

              <Box w="full" maxW="800px" mx="auto">
                <BingoBoard 
                  selectedCells={selectedCells} 
                  onCellSelect={handleCellSelect}
                  validSelections={validSelections}
                  currentInvalidSelection={currentInvalidSelection}
                  categories={categories}
                  wildcardMatches={wildcardMatches}
                />
              </Box>

              <GameControls 
                hasWildcard={hasWildcard}
                onWildcardUse={handleWildcard}
                onSkip={handleSkip}
                isSkipPenalty={skipPenalty}
              />
              
              <Text fontSize="md" color="gray.500">
                Categories matched: {validSelections.length} of 16
              </Text>
            </VStack>
          </Container>
        </Box>
      </ChakraProvider>
    )
  }
}

export default App
