import { Grid, GridItem, Text, HStack, Image, VStack, useColorModeValue } from '@chakra-ui/react'

function BingoBoard({ selectedCells, onCellSelect, validSelections = [], currentInvalidSelection = null, categories = [], wildcardMatches = [] }) {
  const getCellBackground = (categoryId, index) => {
    console.log('Checking cell:', categoryId, 'Wildcard matches:', wildcardMatches) // Debug log
    
    // First priority: check if it's a wildcard match
    if (wildcardMatches.includes(categoryId)) {
      console.log('Cell is wildcard match:', categoryId) // Debug log
      return '#FFD700' // Gold color
    }
    // Second priority: check if it's a regular match
    if (validSelections.includes(categoryId)) {
      return '#22c55e' // Green color
    }
    if (categoryId === currentInvalidSelection) return '#ef4444'
    if (selectedCells.includes(categoryId)) return 'brand.100'
    
    // Modern chess board pattern
    const row = Math.floor(index / 4)
    const col = index % 4
    return (row + col) % 2 === 0 
      ? '#0f172a'  // Darker square
      : '#1e293b'  // Lighter square
  }

  const getCellBoxShadow = (categoryId) => {
    // Match the glow effect with the background color logic
    if (wildcardMatches.includes(categoryId)) {
      return '0 0 20px rgba(255, 215, 0, 0.5)' // Gold glow
    }
    if (validSelections.includes(categoryId)) {
      return '0 0 20px rgba(0, 184, 148, 0.5)' // Green glow
    }
    if (categoryId === currentInvalidSelection) return '0 0 20px rgba(225, 112, 85, 0.5)'
    return '0 4px 12px rgba(0, 0, 0, 0.2)'
  }

  const isCellDisabled = (categoryId) => {
    return validSelections.includes(categoryId)
  }

  return (
    <Grid
      templateColumns="repeat(4, 1fr)"
      gap={2}
      w="100%"
      maxW="800px"
      mx="auto"
      px={{ base: 2, md: 4 }}
    >
      {categories.map((category, index) => (
        <GridItem
          key={index}
          onClick={() => !isCellDisabled(index) && onCellSelect(index)}
          cursor={isCellDisabled(index) ? 'default' : 'pointer'}
          p={{ base: 2, md: 4 }}
          bg={getCellBackground(index, index)}
          transition="all 0.3s ease"
          borderRadius="lg"
          boxShadow={getCellBoxShadow(index)}
          _hover={{
            transform: !isCellDisabled(index) && 'translateY(-2px)',
            bg: isCellDisabled(index) 
              ? getCellBackground(index, index) 
              : 'rgba(255, 255, 255, 0.1)'
          }}
        >
          <VStack spacing={2} justify="center" h="100%" align="center">
            {Array.isArray(category?.image) ? (
              <HStack spacing={1} justify="center">
                {category.image.map((imgPath, imgIndex) => (
                  <Image
                    key={imgIndex}
                    src={imgPath}
                    alt={`Category ${index + 1} Image ${imgIndex + 1}`}
                    boxSize={{ base: "30px", sm: "40px", md: "50px" }}
                    objectFit="contain"
                    filter="drop-shadow(0 2px 4px rgba(0,0,0,0.2))"
                  />
                ))}
              </HStack>
            ) : category?.image && (
              <Image
                src={category.image}
                alt={`Category ${index + 1}`}
                boxSize={{ base: "40px", sm: "50px", md: "60px" }}
                objectFit="contain"
                filter="drop-shadow(0 2px 4px rgba(0,0,0,0.2))"
              />
            )}
            <Text 
              fontWeight="600"
              fontSize={{ base: "xs", sm: "sm", md: "md" }}
              color="white"
              textAlign="center"
              lineHeight="1.2"
              maxW="90%"
              textTransform="uppercase"
              textShadow="0 2px 4px rgba(0,0,0,0.2)"
            >
              {category?.name || `Category ${index + 1}`}
            </Text>
          </VStack>
        </GridItem>
      ))}
    </Grid>
  )
}

export default BingoBoard
