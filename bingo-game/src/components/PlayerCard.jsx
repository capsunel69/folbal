import { Box, Image, Text, VStack } from '@chakra-ui/react'

function PlayerCard({ player }) {
  if (!player) return null

  return (
    <Box
      w="full"
      maxW="300px"
      bg="rgba(22, 33, 62, 0.95)"
      borderRadius="xl"
      overflow="hidden"
      boxShadow="0 8px 32px rgba(0, 0, 0, 0.4)"
      border="2px solid rgba(255, 255, 255, 0.15)"
      transition="all 0.3s ease"
      _hover={{
        transform: 'translateY(-5px)',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)'
      }}
    >
      <Box position="relative">
        <Image
          src={player.image}
          alt={player.name}
          w="full"
          h="200px"
          objectFit="cover"
          fallbackSrc="https://via.placeholder.com/300x200"
        />
        <Box
          position="absolute"
          bottom="0"
          left="0"
          right="0"
          bg="linear-gradient(to top, rgba(0,0,0,0.8), transparent)"
          height="100px"
        />
      </Box>
      <VStack p={4} spacing={2}>
        <Text 
          fontSize="xl" 
          fontWeight="bold"
          color="white"
          textShadow="0 2px 4px rgba(0, 0, 0, 0.3)"
        >
          {player.name}
        </Text>
      </VStack>
    </Box>
  )
}

export default PlayerCard
