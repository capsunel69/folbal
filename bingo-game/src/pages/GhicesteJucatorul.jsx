import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Input,
  Button,
  Text,
  Image,
  VStack,
  Grid,
  Flex,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  useDisclosure,
  Container,
  Heading,
  List,
  ListItem,
  useToast,
  UnorderedList,
} from '@chakra-ui/react';

const GhicesteJucatorul = () => {
  const [players, setPlayers] = useState([]);
  const [targetPlayer, setTargetPlayer] = useState(null);
  const [remainingGuesses, setRemainingGuesses] = useState(8);
  const [gameOver, setGameOver] = useState(false);
  const [hintsRemaining, setHintsRemaining] = useState(3);
  const [usedHints, setUsedHints] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [attempts, setAttempts] = useState([]);
  const [hintText, setHintText] = useState('');
  const [correctGuesses, setCorrectGuesses] = useState({});
  const { isOpen: isDifficultyOpen, onClose: onDifficultyClose } = useDisclosure({ defaultIsOpen: true });
  const { isOpen: isGameOverOpen, onOpen: onGameOverOpen, onClose: onGameOverClose } = useDisclosure();
  
  const toast = useToast();
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    try {
      const response = await fetch('https://cryptobully.s3.eu-north-1.amazonaws.com/fotbal-comedie/superliga_players.json');
      const data = await response.json();
      setPlayers(data);
    } catch (error) {
      console.error('Error fetching players:', error);
      toast({
        title: 'Error',
        description: 'Failed to load players data',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const getAge = (dateString) => {
    const matches = dateString.match(/([A-Za-z]+ \d+, \d{4})/);
    if (!matches) return 0;

    const birthDate = new Date(matches[1]);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  };

  const mapPosition = (position) => {
    position = position.toLowerCase().trim();
    if (position.includes('goalkeeper')) return 'GK';
    if (position.includes('back')) return 'DF';
    if (position.includes('midfield')) return 'CM';
    if (position.includes('winger')) return 'W';
    if (position.includes('forward') || position.includes('striker')) return 'CF';
    return position;
  };

  const getWeightedRandomPlayerByDifficulty = (difficulty) => {
    const weights = {
      easy: { 5: 0.4, 4: 0.3, 3: 0.2, 2: 0.07, 1: 0.03 },
      medium: { 5: 0.2, 4: 0.2, 3: 0.2, 2: 0.2, 1: 0.2 },
      hard: { 5: 0.03, 4: 0.07, 3: 0.2, 2: 0.3, 1: 0.4 }
    };

    const selectedWeights = weights[difficulty] || weights.medium;
    const random = Math.random();
    let cumulativeWeight = 0;

    const playersByScore = {};
    for (let i = 1; i <= 5; i++) {
      playersByScore[i] = players.filter(p => p.Scor === i);
    }

    for (let score = 1; score <= 5; score++) {
      cumulativeWeight += selectedWeights[score];
      if (random <= cumulativeWeight && playersByScore[score].length > 0) {
        return playersByScore[score][Math.floor(Math.random() * playersByScore[score].length)];
      }
    }

    return players[Math.floor(Math.random() * players.length)];
  };

  const startNewGame = (difficulty = 'medium') => {
    const newTarget = getWeightedRandomPlayerByDifficulty(difficulty);
    setTargetPlayer(newTarget);
    setRemainingGuesses(8);
    setGameOver(false);
    setUsedHints(new Set());
    setAttempts([]);
    setHintText('');
    setHintsRemaining(3);
    setCorrectGuesses({});
    onDifficultyClose();
    onGameOverClose();
  };

  const handleGuess = (guessedPlayer) => {
    if (gameOver) return;

    const newAttempt = {
      player: guessedPlayer,
      comparisons: [
        { type: 'team', actual: guessedPlayer.Team, target: targetPlayer.Team, teamId: guessedPlayer.TeamID },
        { type: 'position', actual: mapPosition(guessedPlayer.Position), target: mapPosition(targetPlayer.Position) },
        { type: 'nationality', actual: guessedPlayer.Nationality, target: targetPlayer.Nationality },
        { type: 'number', actual: guessedPlayer.Number, target: targetPlayer.Number },
        { type: 'age', actual: getAge(guessedPlayer.Age), target: getAge(targetPlayer.Age) }
      ]
    };

    setAttempts(prev => [newAttempt, ...prev]);
    setRemainingGuesses(prev => prev - 1);
    updateCorrectGuesses(newAttempt);

    if (guessedPlayer.Name === targetPlayer.Name) {
      endGame(true);
    } else if (remainingGuesses <= 1) {
      endGame(false);
    }
  };

  const updateCorrectGuesses = (attempt) => {
    const newCorrectGuesses = { ...correctGuesses };
    attempt.comparisons.forEach(comparison => {
      if (comparison.actual === comparison.target) {
        newCorrectGuesses[comparison.type] = comparison;
      }
    });
    setCorrectGuesses(newCorrectGuesses);
  };

  const endGame = (won) => {
    setGameOver(true);
    onGameOverOpen();
  };

  const getHint = () => {
    if (gameOver || hintsRemaining <= 0) return;
    if (remainingGuesses <= 1) {
      setHintText("Nu mai ai suficiente incercari pentru un indiciu!");
      return;
    }

    const availableHints = [];
    if (!correctGuesses.team) availableHints.push(`Acest jucator joaca la ${targetPlayer.Team}`);
    if (!correctGuesses.position) availableHints.push(`Pozitia acestui jucator este ${mapPosition(targetPlayer.Position)}`);
    if (!correctGuesses.nationality) availableHints.push(`Nationalitatea acestui jucator este ${targetPlayer.Nationality}`);
    if (!correctGuesses.age) availableHints.push(`Varsta acestui jucator este ${getAge(targetPlayer.Age)}`);
    if (!correctGuesses.number) availableHints.push(`Numarul acestui jucator este ${targetPlayer.Number}`);

    const unusedHints = availableHints.filter(hint => !usedHints.has(hint));

    if (unusedHints.length === 0) {
      setHintText("Nu mai sunt indicii disponibile!");
      return;
    }

    const randomHint = unusedHints[Math.floor(Math.random() * unusedHints.length)];
    setUsedHints(prev => new Set([...prev, randomHint]));
    setHintText(randomHint);
    setHintsRemaining(prev => prev - 1);
    setRemainingGuesses(prev => prev - 1);

    if (remainingGuesses <= 1) {
      endGame(false);
    }
  };

  const handleSearch = (value) => {
    setSearchTerm(value);
    if (value.length < 2) {
      setShowDropdown(false);
      return;
    }
    setShowDropdown(true);
  };

  return (
    <Box minH="100vh" color="white">
      <Container maxW="750px" py={8} mt={16}>
        <VStack spacing={6}>
          <Heading size="xl">Ghiceste Jucatorul</Heading>

          <Box position="relative" w="100%">
            <Input
              placeholder="Introdu numele jucatorului..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              bg="whiteAlpha.200"
              _hover={{ bg: "whiteAlpha.300" }}
              _focus={{ bg: "whiteAlpha.300" }}
            />
            {showDropdown && (
              <Box
                position="absolute"
                top="100%"
                w="100%"
                bg="gray.800"
                borderRadius="md"
                boxShadow="lg"
                zIndex={10}
                maxH="400px"
                overflowY="auto"
              >
                {players
                  .filter(player => player.Name.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map(player => (
                    <Flex
                      key={player.PlayerID}
                      p={3}
                      alignItems="center"
                      _hover={{ bg: "whiteAlpha.200" }}
                      cursor="pointer"
                      onClick={() => {
                        handleGuess(player);
                        setSearchTerm('');
                        setShowDropdown(false);
                      }}
                    >
                      <Image
                        src={`https://cryptobully.s3.eu-north-1.amazonaws.com/fotbal-comedie/player_images/${player.PlayerID}.png`}
                        fallbackSrc="https://cryptobully.s3.eu-north-1.amazonaws.com/fotbal-comedie/placeholder.png"
                        boxSize="40px"
                        borderRadius="full"
                        mr={3}
                      />
                      <Text>{player.Name}</Text>
                    </Flex>
                  ))}
              </Box>
            )}
          </Box>

          {Object.keys(correctGuesses).length > 0 && (
            <Box
              w="100%"
              p={4}
              bg="rgba(76, 175, 80, 0.1)"
              borderRadius="md"
              border="1px solid rgba(76, 175, 80, 0.3)"
            >
              <Heading size="sm" color="green.400" mb={3}>
                Ai ghicit corect:
              </Heading>
              <Flex wrap="wrap" gap={2}>
                {Object.entries(correctGuesses).map(([type, comparison]) => (
                  <Flex
                    key={type}
                    bg="rgba(76, 175, 80, 0.2)"
                    px={4}
                    py={2}
                    borderRadius="full"
                    alignItems="center"
                    gap={2}
                  >
                    {type === 'team' ? (
                      <Image
                        src={`https://cryptobully.s3.eu-north-1.amazonaws.com/fotbal-comedie/team_logos/${comparison.teamId}.png`}
                        h="20px"
                        w="20px"
                        objectFit="contain"
                      />
                    ) : (
                      <Text>{comparison.actual}</Text>
                    )}
                  </Flex>
                ))}
              </Flex>
            </Box>
          )}

          <Box
            w="100%"
            p={6}
            bg="rgba(0, 0, 0, 0.85)"
            borderRadius="lg"
            border="2px solid rgba(255, 255, 255, 0.1)"
            backdropFilter="blur(10px)"
            boxShadow="lg"
          >
            <Heading size="md" color="green.400" mb={4}>
              Regulile Jocului
            </Heading>
            <UnorderedList spacing={3}>
              <ListItem>doar jucatori din Superliga (momentan)</ListItem>
              <ListItem>ai 8 incercari pentru a ghici fotbalistul</ListItem>
              <ListItem>poti folosi 3 indicii, dar fiecare va costa o incercare</ListItem>
              <ListItem>
                pozitia jucatorului poate fi GK (portar), DF (fundas), MID (mijlocas),
                W (winger) sau CF (atacant central)
              </ListItem>
              <ListItem>
                sagetile din dreptul caracteristicelor iti pot oferi indicii legate
                de jucator. De exemplu, in dreptul varstei daca avem 25 cu o sageata
                in sus, inseamna ca varsta jucatorului este mai mare de 25 de ani.
              </ListItem>
            </UnorderedList>
          </Box>

          <Flex w="100%" justify="space-between">
            <Text fontSize="lg">Incercari ramase: {remainingGuesses}</Text>
            <Button
              colorScheme="blue"
              onClick={getHint}
              isDisabled={hintsRemaining <= 0 || gameOver}
            >
              Indiciu ({hintsRemaining}/3)
            </Button>
          </Flex>

          {hintText && (
            <Box w="100%" p={4} bg="whiteAlpha.200" borderRadius="md">
              <Text>{hintText}</Text>
            </Box>
          )}

          {attempts.length > 0 && (
            <Grid
              w="100%"
              templateColumns="repeat(5, 1fr)"
              gap={4}
              bg="whiteAlpha.100"
              p={4}
              borderRadius="md"
            >
              <Text>TEAM</Text>
              <Text>POS</Text>
              <Text>NAT</Text>
              <Text>SHIRT</Text>
              <Text>AGE</Text>
            </Grid>
          )}

          <VStack w="100%" spacing={4}>
            {attempts.map((attempt, index) => (
              <Grid
                key={index}
                templateColumns="repeat(5, 1fr)"
                gap={4}
                w="100%"
                bg="whiteAlpha.50"
                p={4}
                borderRadius="md"
              >
                {attempt.comparisons.map((comparison, idx) => (
                  <Box
                    key={idx}
                    bg={comparison.actual === comparison.target ? "green.500" : "red.500"}
                    p={2}
                    borderRadius="md"
                    textAlign="center"
                  >
                    {comparison.type === 'team' ? (
                      <Image
                        src={`https://cryptobully.s3.eu-north-1.amazonaws.com/fotbal-comedie/team_logos/${comparison.teamId}.png`}
                        fallbackSrc="https://cryptobully.s3.eu-north-1.amazonaws.com/fotbal-comedie/placeholder.png"
                        h="30px"
                        mx="auto"
                      />
                    ) : (
                      <Text>
                        {comparison.actual}
                        {comparison.type === 'number' || comparison.type === 'age' ? (
                          comparison.actual !== comparison.target && (
                            <Text as="span" ml={1}>
                              {comparison.actual > comparison.target ? '↓' : '↑'}
                            </Text>
                          )
                        ) : null}
                      </Text>
                    )}
                  </Box>
                ))}
              </Grid>
            ))}
          </VStack>
        </VStack>

        <Modal isOpen={isDifficultyOpen} onClose={onDifficultyClose}>
          <ModalOverlay />
          <ModalContent bg="gray.800" color="white">
            <ModalHeader>Alege Dificultatea</ModalHeader>
            <ModalBody pb={6}>
              <VStack spacing={4}>
                <Button w="100%" colorScheme="green" onClick={() => startNewGame('easy')}>
                  Usor
                </Button>
                <Button w="100%" colorScheme="yellow" onClick={() => startNewGame('medium')}>
                  Mediu
                </Button>
                <Button w="100%" colorScheme="red" onClick={() => startNewGame('hard')}>
                  Greu
                </Button>
              </VStack>
            </ModalBody>
          </ModalContent>
        </Modal>

        <Modal isOpen={isGameOverOpen} onClose={onGameOverClose}>
          <ModalOverlay />
          <ModalContent bg="gray.800" color="white">
            <ModalHeader>
              {gameOver && targetPlayer?.Name === attempts[0]?.player.Name
                ? "Felicitări! Ai câștigat! 🎉"
                : "Joc Terminat!"}
            </ModalHeader>
            <ModalBody pb={6}>
              <VStack spacing={4}>
                <Text>
                  {gameOver && targetPlayer?.Name === attempts[0]?.player.Name
                    ? `L-ai găsit pe ${targetPlayer.Name}!`
                    : `Jucătorul era ${targetPlayer?.Name}`}
                </Text>
                <Text>Încercări folosite: {8 - remainingGuesses}/8</Text>
                <Text>Indicii folosite: {3 - hintsRemaining}/3</Text>
                <Button colorScheme="green" onClick={() => startNewGame()}>
                  Joacă din nou
                </Button>
              </VStack>
            </ModalBody>
          </ModalContent>
        </Modal>
      </Container>
    </Box>
  );
};

export default GhicesteJucatorul;