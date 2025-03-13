import { Container, VStack, Heading, Text, Button } from '@chakra-ui/react'
import { useNavigate } from 'react-router-dom'

function HomePage() {
  const navigate = useNavigate()

  return (
    <Container maxW="container.lg" py={8} mx="auto" mt={16}>
      <VStack spacing={8} align="center">
        <Heading as="h1" size="2xl">Football Bingo</Heading>
        <Text fontSize="xl" textAlign="center">
          Test your football knowledge by matching players with their achievements in this exciting bingo game!
        </Text>
        <Button 
          colorScheme="brand" 
          size="lg" 
          onClick={() => navigate('/play')}
        >
          Start Playing
        </Button>
      </VStack>
    </Container>
  )
}

export default HomePage 