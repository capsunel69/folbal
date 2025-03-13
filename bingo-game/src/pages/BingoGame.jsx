import { ChakraProvider, Container, VStack, Heading, useToast, Button, Text, HStack, Box, Stack } from '@chakra-ui/react'
import { Global } from '@emotion/react'
import { useState, useEffect } from 'react'
import BingoBoard from '../components/BingoBoard'
import GameControls from '../components/GameControls'
import Header from '../components/Header'
import Footer from '../components/Footer'
import theme from '../theme'
import { formatCategories } from '../data/categories'
import { MdRefresh, MdShuffle } from 'react-icons/md'
import GameModeSelect from '../components/GameModeSelect'
import Timer from '../components/Timer'
import { keyframes } from '@emotion/react'

const shakeAnimation = keyframes`
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
`

function BingoGame() {
  const [gameMode, setGameMode] = useState(null) // null, 'classic', or 'timed'
  const [timeRemaining, setTimeRemaining] = useState(10)
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
  const [wrongAttempts, setWrongAttempts] = useState(0)
  const [maxAvailablePlayers, setMaxAvailablePlayers] = useState(null)
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

  // Add this useEffect after your other useEffects
  useEffect(() => {
    let timerInterval
    if (gameState === 'playing' && gameMode === 'timed' && timeRemaining > 0) {
      timerInterval = setInterval(() => {
        setTimeRemaining(prev => prev - 1)
      }, 1000)
    }
    return () => clearInterval(timerInterval)
  }, [gameState, gameMode, timeRemaining])

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
    
    // Only consider players within the maxAvailablePlayers limit
    const availablePlayers = players
      .slice(0, maxAvailablePlayers)
      .filter(player => !usedPlayerIds.includes(player.id))

    if (availablePlayers.length === 0 || usedPlayerIds.length >= maxAvailablePlayers) {
      return null
    }
    
    const selectedPlayer = availablePlayers[Math.floor(Math.random() * availablePlayers.length)]
    console.log('Selected player:', selectedPlayer)
    return selectedPlayer
  }

  const handleModeSelect = async (isTimed) => {
    const mode = isTimed ? 'timed' : 'classic'
    const initialTime = 10
    
    // Get and set the game card first
    const gameCard = getRandomCard()
    if (!gameCard) {
      showToast({
        title: "Error",
        description: "No game card available",
        status: "error",
      })
      return
    }
    
    // Initialize all game state at once
    const totalPlayers = gameCard.gameData.players.length
    const firstPlayer = gameCard.gameData.players[Math.floor(Math.random() * totalPlayers)]
    
    if (!firstPlayer) {
      showToast({
        title: "Error",
        description: "No players available to start the game",
        status: "error",
      })
      return
    }

    // Set all state at once
    setCurrentCard(gameCard)
    setGameMode(mode)
    setTimeRemaining(initialTime)
    setMaxAvailablePlayers(totalPlayers)
    setGameState('playing')
    setCurrentPlayer(firstPlayer)
    setSelectedCells([])
    setValidSelections([])
    setCurrentInvalidSelection(null)
    // setUsedPlayers([firstPlayer.id]) this sets first player as used player <=> first player is 1 not 0
    setUsedPlayers([]) // first player is  0
    setHasWildcard(true)
    setWildcardMatches([])
    setSkipPenalty(false)
    setWrongAttempts(0)
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

      if (gameMode === 'timed') {
        setTimeRemaining(10)
      }
      moveToNextPlayer()
    } else {
      setCurrentInvalidSelection(categoryId)
      setWrongAttempts(prev => prev + 1)
      // Reduce max available players by 2
      setMaxAvailablePlayers(prev => Math.max(prev - 2, usedPlayers.length + 1))
      
      showToast({
        title: "Wrong selection!",
        description: `That category doesn't match this player's achievements. Maximum available players reduced to ${maxAvailablePlayers - 2}!`,
        status: "error",
      })

      if (gameMode === 'timed') {
        setTimeRemaining(10)
      }
      moveToNextPlayer()
    }
  }

  const moveToNextPlayer = () => {
    setCurrentInvalidSelection(null)
    
    const newUsedPlayers = [...usedPlayers, currentPlayer.id]
    setUsedPlayers(newUsedPlayers)

    // Check if we've reached the maximum allowed players
    if (newUsedPlayers.length >= maxAvailablePlayers) {
      endGame(false)
      return
    }

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
    
    // Reset timer for timed mode after wildcard use
    if (gameMode === 'timed') {
      setTimeRemaining(10)
    }
    moveToNextPlayer()
  }

  const endGame = (isWin) => {
    setGameState('end')
    showToast({
      title: isWin ? "Congratulations!" : "Game Over!",
      description: isWin 
        ? "You've completed all categories!"
        : `No more players available. You matched ${validSelections.length} of 16 categories with ${usedPlayers.length} of ${maxAvailablePlayers} players.`,
      status: isWin ? "success" : "info",
      duration: 4000,
    })
  }

  const handleSkip = () => {
    if (skipPenalty) {
      setSkipPenalty(false)
      return
    }

    // Reduce max available players by 1
    setMaxAvailablePlayers(prev => Math.max(prev - 1, usedPlayers.length + 1))
    
    const nextPlayer = getRandomPlayer([...usedPlayers, currentPlayer.id])
    
    if (nextPlayer) {
      showToast({
        title: "Skip penalty",
        description: `Maximum available players reduced to ${maxAvailablePlayers - 1}!`,
        status: "warning",
      })
      setCurrentPlayer(nextPlayer)
      setUsedPlayers(prev => [...prev, currentPlayer.id])
      
      if (gameMode === 'timed') {
        setTimeRemaining(10)
      }
    } else {
      endGame(false)
    }
  }

  const handleTimeUp = () => {
    if (gameMode === 'timed') {
      // Reduce max available players by 1 for automatic skip
      setMaxAvailablePlayers(prev => Math.max(prev - 1, usedPlayers.length + 1))
      
      showToast({
        title: "Time's up!",
        description: `Maximum available players reduced to ${maxAvailablePlayers - 1} due to automatic skip!`,
        status: "warning",
      })
      
      moveToNextPlayer()
      setTimeRemaining(10) // Reset timer for next player
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
            }
          `}
        />
        <Header />
        <Box {...containerStyles}>
          <Container maxW="container.lg" py={8} mx="auto">
            <VStack spacing={8} align="center" w="full">
              <Heading as="h1" size="xl" textAlign="center">Loading...</Heading>
            </VStack>
          </Container>
        </Box>
        <Footer />
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
            }
          `}
        />
        <Header />
        <Box {...containerStyles}>
          <Container maxW="container.lg" py={8} mx="auto">
            <VStack spacing={5} align="center" w="full">
              <Heading as="h1" size="xl" textAlign="center">Football Bingo</Heading>
              <Text fontSize="lg" textAlign="center">
                Match players with their achievements and categories to score points!
                Use your wildcard wisely only when a palyer might match multiple categories.
              </Text>
              <GameModeSelect onModeSelect={handleModeSelect} />
            </VStack>
          </Container>
        </Box>
        <Footer />
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
            }
          `}
        />
        <Header />
        <Box {...containerStyles}>
          <Container maxW="container.lg" py={8} mx="auto">
            <VStack spacing={8} align="center" w="full">
              <Heading as="h1" size="xl" textAlign="center">Game Over!</Heading>
              <Text fontSize="2xl" fontWeight="bold">Final Score: {validSelections.length} of 16</Text>
              <VStack spacing={4}>
                <Text>Categories Matched: {validSelections.length} of 16</Text>
                <Text>Wrong Attempts: {wrongAttempts}</Text>
                <Text>Players Used: {usedPlayers.length}</Text>
                {validSelections.length >= 16 && (
                  <Text color="green.500" fontWeight="bold">
                    Congratulations! You've completed all categories!
                  </Text>
                )}
              </VStack>
              <VStack spacing={4}>
                <Button colorScheme="brand" size="lg" onClick={() => handleModeSelect(true)}>
                  Play Same Card
                </Button>
                <Button colorScheme="blue" size="lg" onClick={() => handleModeSelect(false)}>
                  Play Random Card
                </Button>
              </VStack>
            </VStack>
          </Container>
        </Box>
        <Footer />
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
            }
          `}
        />
        <Header />
        <Box {...containerStyles}>
          <Container maxW="container.lg" py={8} mx="auto">
            <VStack spacing={4} w="full" align="center">
              <HStack 
                justify="space-between" 
                w="full" 
                flexDir={['column', 'row']} 
                spacing={[4, 8]}
                align="center"
              >
                <VStack align={['center', 'flex-start']} spacing={0}>
                  <Heading as="h1" size={['lg', 'xl']}>Football Bingo</Heading>
                  <Button
                    size="xs"
                    variant="link"
                    color="gray.400"
                    p={1}
                    borderRadius="md"
                    _hover={{ color: "white" }}
                    onClick={() => {
                      setGameMode(null)
                      setGameState('start')
                    }}
                  >
                    ← Change Mode
                  </Button>
                </VStack>
                <Box
                  p={3}
                  bg="rgba(0, 0, 0, 0.4)"
                  borderRadius="lg"
                  animation={wrongAttempts > 0 ? `${shakeAnimation} 0.5s ease` : 'none'}
                >
                  <Text
                    fontSize="lg"
                    fontWeight="semibold"
                    color="white"
                    textShadow="0 2px 4px rgba(0, 0, 0, 0.3)"
                  >
                    Players Used: <Text as="span" color="brand.400">{usedPlayers.length}</Text>
                    <Text as="span" color="gray.400"> / {maxAvailablePlayers}</Text>
                  </Text>
                </Box>
              </HStack>
              
              <Box 
                w="full" 
                maxW="400px" 
                mx="auto" 
                p={4} 
                bg="rgba(0, 0, 0, 0.6)" 
                borderRadius="xl"
                boxShadow="0 4px 12px rgba(0, 0, 0, 0.3)"
              >
                <HStack justify="center" spacing={3} align="center">
                  <Text 
                    fontSize="2xl" 
                    fontWeight="bold" 
                    textAlign="center"
                    color="white"
                    textShadow="0 2px 4px rgba(0, 0, 0, 0.3)"
                  >
                    {currentPlayer ? `${currentPlayer.g} ${currentPlayer.f}` : 'No player selected'}
                  </Text>
                  {gameMode === 'timed' && (
                    <Timer seconds={timeRemaining} onTimeUp={handleTimeUp} />
                  )}
                </HStack>
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
                    onClick={() => handleModeSelect(true)}
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
                    onClick={() => handleModeSelect(false)}
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
        <Footer />
      </ChakraProvider>
    )
  }
}

export default BingoGame
