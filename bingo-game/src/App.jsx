import { ChakraProvider, Container, VStack, Heading, useToast, Button, Text, HStack, Box, Stack } from '@chakra-ui/react'
import { Global } from '@emotion/react'
import { useState, useEffect } from 'react'
import BingoBoard from './components/BingoBoard'
import GameControls from './components/GameControls'
import theme from './theme'
import { formatCategories } from './data/categories'
import { MdRefresh, MdShuffle } from 'react-icons/md'

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
  const [currentCard, setCurrentCard] = useState(null)
  const [availableCards, setAvailableCards] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const toast = useToast()

  // Add this useEffect to load cards dynamically
  useEffect(() => {
    const loadCards = async () => {
      try {
        // This will get all JSON files in the data directory
        const cardModules = import.meta.glob('./data/*.json')
        const loadedCards = await Promise.all(
          Object.keys(cardModules).map(async (path) => {
            const module = await cardModules[path]()
            return module.default || module
          })
        )
        setAvailableCards(loadedCards)
        setIsLoading(false)
      } catch (error) {
        console.error('Error loading cards:', error)
        setIsLoading(false)
      }
    }

    loadCards()
  }, [])

  // Modify getRandomCard to handle the new structure
  const getRandomCard = () => {
    if (availableCards.length === 0) return null
    if (availableCards.length === 1) return availableCards[0]

    const otherCards = availableCards.filter(card => card !== currentCard)
    return otherCards[Math.floor(Math.random() * otherCards.length)]
  }

  // Initialize categories from the new format
  const categories = currentCard ? formatCategories(currentCard.gameData.remit) : []

  const getRandomPlayer = (usedPlayerIds = [], players = currentCard?.gameData.players) => {
    if (!players) {
      console.log('No players data available')
      return null
    }
    const availablePlayers = players.filter(
      player => !usedPlayerIds.includes(player.id)
    )
    if (availablePlayers.length === 0) return null
    const selectedPlayer = availablePlayers[Math.floor(Math.random() * availablePlayers.length)]
    console.log('Selected player:', selectedPlayer)
    return selectedPlayer
  }

  const startGame = (useCurrentCard = false) => {
    // If useCurrentCard is true and we have a currentCard, keep using it
    // Otherwise, get a random new card
    const gameCard = useCurrentCard && currentCard ? currentCard : getRandomCard()
    setCurrentCard(gameCard)

    const firstPlayer = getRandomPlayer([], gameCard.gameData.players)
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
      // Skip categories that are already selected
      if (selectedCells.includes(index)) return acc
      
      const isValid = currentPlayer.v.some(achievementId => 
        category.originalData.some(requirement => requirement.id === achievementId)
      )
      if (isValid) acc.push(index)
      return acc
    }, [])

    if (validCategories.length === 0) {
      showToast({
        title: "No valid categories",
        description: "This player doesn't match any remaining categories",
        status: "warning",
      })
      return
    }

    // Update states with only new matches
    const newValidSelections = [...validSelections, ...validCategories]
    const newWildcardMatches = [...wildcardMatches, ...validCategories]
    const newSelectedCells = [...selectedCells, ...validCategories]
    
    setValidSelections(newValidSelections)
    setWildcardMatches(newWildcardMatches)
    setSelectedCells(newSelectedCells)
    setHasWildcard(false)
    
    if (newSelectedCells.length >= categories.length) {
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

  // Add loading state handling to your render logic
  if (isLoading) {
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
              <Heading as="h1" size="xl" textAlign="center">Loading...</Heading>
            </VStack>
          </Container>
        </Box>
      </ChakraProvider>
    )
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
              <Button colorScheme="brand" size="lg" onClick={() => startGame(true)}>
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
              <HStack spacing={4}>
                <Button colorScheme="brand" size="lg" onClick={() => startGame(true)}>
                  Play Same Card
                </Button>
                <Button colorScheme="blue" size="lg" onClick={() => startGame(false)}>
                  Play Random Card
                </Button>
              </HStack>
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
                  Players used: {usedPlayers.length} / {currentCard?.gameData.players.length}
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
                  {currentPlayer ? `${currentPlayer.g} ${currentPlayer.f}` : 'No player selected'}
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
              
              <VStack spacing={4} align="center">
                <Text fontSize="md" color="gray.500">
                  Categories matched: {validSelections.length} of 16
                </Text>
                
                <Stack 
                  direction={['column', 'row']} 
                  spacing={4}
                >
                  <Button
                    size="sm"
                    leftIcon={<MdRefresh />}
                    onClick={() => startGame(true)}
                    bg="rgba(255, 255, 255, 0.2)"
                    color="white"
                    _hover={{
                      bg: "rgba(255, 255, 255, 0.3)",
                      transform: "translateY(-2px)"
                    }}
                    boxShadow="none"
                  >
                    Restart This Card
                  </Button>
                  <Button
                    size="sm"
                    leftIcon={<MdShuffle />}
                    onClick={() => startGame(false)}
                    bg="rgba(255, 255, 255, 0.2)"
                    color="white"
                    _hover={{
                      bg: "rgba(255, 255, 255, 0.3)",
                      transform: "translateY(-2px)"
                    }}
                    boxShadow="none"
                  >
                    Play Random Card
                  </Button>
                </Stack>
              </VStack>
            </VStack>
          </Container>
        </Box>
      </ChakraProvider>
    )
  }
}

export default App
