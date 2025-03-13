import { ChakraProvider, Container, VStack, Heading, useToast, Button, Text, HStack, Box } from '@chakra-ui/react'
import { Global } from '@emotion/react'
import { useState, useEffect } from 'react'
import BingoBoard from './components/BingoBoard'
import PlayerCard from './components/PlayerCard'
import GameControls from './components/GameControls'
import theme from './theme'
import { getRandomPlayer, players } from './data/players'

function App() {
  const [gameState, setGameState] = useState('start') // 'start', 'playing', 'end'
  const [currentPlayer, setCurrentPlayer] = useState(null)
  const [selectedCells, setSelectedCells] = useState([])
  const [validSelections, setValidSelections] = useState([])
  const [currentInvalidSelection, setCurrentInvalidSelection] = useState(null)
  const [usedPlayers, setUsedPlayers] = useState([])
  const [hasWildcard, setHasWildcard] = useState(true)
  const [skipPenalty, setSkipPenalty] = useState(false)
  const toast = useToast()

  const showToast = (options) => {
    toast.closeAll()
    
    toast({
      position: "bottom",
      duration: 2000,
      isClosable: true,
      ...options,
    })
  }

  const startGame = () => {
    setGameState('playing')
    setCurrentPlayer(getRandomPlayer())
    setSelectedCells([])
    setValidSelections([])
    setCurrentInvalidSelection(null)
    setUsedPlayers([])
    setHasWildcard(true)
    setSkipPenalty(false)
  }

  const handleCellSelect = (categoryId) => {
    if (!currentPlayer) return
    
    setCurrentInvalidSelection(null)
    const isValidSelection = currentPlayer.categories.includes(categoryId)

    if (isValidSelection) {
      const newSelectedCells = [...selectedCells, categoryId]
      setSelectedCells(newSelectedCells)
      setValidSelections([...validSelections, categoryId])
      
      // Check for win (all 16 categories matched)
      if (validSelections.length >= 15) {
        endGame(true)
        return
      }

      moveToNextPlayer()
    } else {
      setCurrentInvalidSelection(categoryId)
      showToast({
        title: "Wrong selection!",
        description: "That category doesn't match this player.",
        status: "error",
      })
      moveToNextPlayer()
    }
  }

  const moveToNextPlayer = () => {
    // Clear the invalid selection state
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
    
    const newValidSelections = [...validSelections]
    currentPlayer.categories.forEach(categoryId => {
      if (!validSelections.includes(categoryId)) {
        newValidSelections.push(categoryId)
      }
    })
    
    setValidSelections(newValidSelections)
    setSelectedCells([...new Set([...selectedCells, ...currentPlayer.categories])])
    setHasWildcard(false)
    
    if (newValidSelections.length >= 16) {
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
                  Players used: {usedPlayers.length} / {players.length}
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
                  {currentPlayer?.name}
                </Text>
              </Box>

              <Box w="full" maxW="800px" mx="auto">
                <BingoBoard 
                  selectedCells={selectedCells} 
                  onCellSelect={handleCellSelect}
                  validSelections={validSelections}
                  currentInvalidSelection={currentInvalidSelection}
                />
              </Box>

              <GameControls 
                hasWildcard={hasWildcard}
                onWildcardUse={handleWildcard}
                onSkip={handleSkip}
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
