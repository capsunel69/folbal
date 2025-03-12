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
  const [score, setScore] = useState(0)
  const toast = useToast()

  const startGame = () => {
    setGameState('playing')
    setCurrentPlayer(getRandomPlayer())
    setSelectedCells([])
    setValidSelections([])
    setCurrentInvalidSelection(null)
    setUsedPlayers([])
    setHasWildcard(true)
    setSkipPenalty(false)
    setScore(0)
  }

  const handleCellSelect = (category) => {
    if (!currentPlayer) return
    
    // Clear any previous invalid selection
    setCurrentInvalidSelection(null)

    const isValidSelection = currentPlayer.categories.includes(category.id)

    if (isValidSelection) {
      const newSelectedCells = [...selectedCells, category.id]
      setSelectedCells(newSelectedCells)
      setValidSelections([...validSelections, category.id])
      setScore(prev => prev + 1)
      
      // Check for win (all 16 categories matched)
      if (validSelections.length >= 15) {
        endGame(true)
        return
      }

      // Move to next player
      moveToNextPlayer()
    } else {
      // Wrong selection feedback
      setCurrentInvalidSelection(category.id)
      setScore(prev => Math.max(0, prev - 1))
      toast({
        title: "Wrong selection!",
        description: "That category doesn't match this player.",
        status: "error",
        duration: 2000,
      })
      // Automatically move to next player
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
    
    // Add all possible categories for current player to validSelections
    const newValidSelections = [...validSelections]
    currentPlayer.categories.forEach(categoryId => {
      if (!validSelections.includes(categoryId)) {
        newValidSelections.push(categoryId)
      }
    })
    
    setValidSelections(newValidSelections)
    setSelectedCells([...new Set([...selectedCells, ...currentPlayer.categories])])
    setHasWildcard(false)
    setScore(prev => prev + currentPlayer.categories.length)
    
    // Check for win after wildcard use
    if (newValidSelections.length >= 16) {
      endGame(true)
      return
    }
    
    // Move to next player
    moveToNextPlayer()
  }

  const endGame = (isWin) => {
    setGameState('end')
    toast({
      title: isWin ? "Congratulations!" : "Game Over!",
      description: isWin 
        ? `You've completed all categories! Final Score: ${score} points`
        : `No more players available. You matched ${validSelections.length} of 16 categories.`,
      status: isWin ? "success" : "info",
      duration: null,
      isClosable: true,
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
            }
          `}
        />
        <Box {...containerStyles}>
          <Container maxW="container.lg" py={8} mx="auto">
            <VStack spacing={8} align="center" w="full">
              <Heading as="h1" size="xl" textAlign="center">Game Over!</Heading>
              <Text fontSize="2xl" fontWeight="bold">Final Score: {score} points</Text>
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
                <VStack align={['center', 'flex-end']} spacing={1}>
                  <Text fontSize="xl" fontWeight="bold">Score: {score}</Text>
                  <Text fontSize="sm" color="gray.500">
                    Players used: {usedPlayers.length} / {players.length}
                  </Text>
                </VStack>
              </HStack>
              
              <Box w="full" maxW="300px" mx="auto">
                <PlayerCard player={currentPlayer} />
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
