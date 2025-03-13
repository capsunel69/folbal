import { Box, Text } from '@chakra-ui/react'

function PlayerCard({ player }) {
  if (!player) return null

  return (
    <Box
      bg="rgba(0, 0, 0, 0.6)"
      borderRadius="xl"
      p={6}
      boxShadow="0 8px 32px rgba(0, 0, 0, 0.4)"
      border="2px solid rgba(59, 130, 246, 0.15)"
      transition="all 0.3s ease"
      _hover={{
        transform: 'translateY(-5px)',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)',
        borderColor: 'rgba(59, 130, 246, 0.3)'
      }}
    >
      <Text 
        fontSize="2xl" 
        fontWeight="bold"
        textAlign="center"
        color="white"
        textShadow="0 2px 4px rgba(0, 0, 0, 0.3)"
      >
        {player.name}
      </Text>
    </Box>
  )
}

export default PlayerCard
