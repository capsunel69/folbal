import { Grid, GridItem, Text, HStack, Image, VStack, useColorModeValue, Box } from '@chakra-ui/react'

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

  const formatCategoryText = (category) => {
    if (!category?.originalData) return category?.name || '';
    
    // Handle multiple requirements (e.g., ARG + MCI)
    if (category.originalData.length > 1) {
      return category.originalData
        .map(data => data.displayName || data.name)
        .join(' + ');
    }
    
    const data = category.originalData[0];
    
    switch (data.type) {
      case 1: // Country
        return data.displayName || data.name;
      
      case 2: // Team
        return data.displayName || data.name;
      
      case 3: // League/Competition with date
        return `${data.displayName || data.name}${data.dataFrom ? ` (${data.dataFrom})` : ''}`;
      
      case 4: // Manager
        return `Managed by ${data.displayName || data.name}`;
      
      case 5: // Played with player
        return `Played with ${data.displayName || data.name}`;
      
      case 6: // Competition winner
        if (data.dataFrom) {
          return `${data.displayName || data.name} winner since ${data.dataFrom}`;
        }
        return `${data.displayName || data.name} winner`;
      
      default:
        return data.displayName || data.name;
    }
  }

  return (
    <Grid
      templateColumns="repeat(4, 1fr)"
      gap={1}
      w="100%"
      maxW="550px"
      mx="auto"
    >
      {categories.map((category, index) => (
        <GridItem
          key={index}
          onClick={() => !isCellDisabled(index) && onCellSelect(index)}
          cursor={isCellDisabled(index) ? 'default' : 'pointer'}
          p={2}
          bg={getCellBackground(index, index)}
          transition="all 0.3s ease"
          borderRadius="md"
          boxShadow={getCellBoxShadow(index)}
          position="relative"
          _hover={{
            transform: !isCellDisabled(index) && 'translateY(-2px)',
            bg: isCellDisabled(index) 
              ? getCellBackground(index, index) 
              : 'rgba(255, 255, 255, 0.1)'
          }}
          _before={{
            content: '""',
            display: 'block',
            paddingTop: '100%'
          }}
        >
          <VStack 
            spacing={1}
            justify="center" 
            align="center"
            position="absolute"
            top="0"
            left="0"
            right="0"
            bottom="0"
            p={0.5}
          >
            {Array.isArray(category?.image) ? (
              <HStack spacing={1} justify="center">
                {category.image.map((imgPath, imgIndex) => (
                  <Image
                    key={imgIndex}
                    src={imgPath}
                    alt={`Category ${index + 1} Image ${imgIndex + 1}`}
                    boxSize={{ base: "35px", sm: "35px", md: "50px" }}
                    objectFit="contain"
                    paddingTop={1}
                    filter="drop-shadow(0 2px 4px rgba(0,0,0,0.2))"
                  />
                ))}
              </HStack>
            ) : category?.image && (
              <Image
                src={category.image}
                alt={`Category ${index + 1}`}
                boxSize={{ base: "35px", sm: "40px", md: "50px" }}
                objectFit="contain"
                filter="drop-shadow(0 2px 4px rgba(0,0,0,0.2))"
              />
            )}
            <Box 
              w="100%" 
              px={1}
              display="flex"
              alignItems="center"
              justifyContent="center"
              minH={{ base: "35px", sm: "40px", md: "45px" }}
            >
              <Text 
                fontWeight="600"
                fontSize={{ base: "3xs", sm: "xs", md: "sm" }}
                color="white"
                textAlign="center"
                lineHeight="1"
                w="100%"
                textTransform="uppercase"
                textShadow="0 2px 4px rgba(0,0,0,0.2)"
                noOfLines={4}
              >
                {formatCategoryText(category)}
              </Text>
            </Box>
          </VStack>
        </GridItem>
      ))}
    </Grid>
  )
}

export default BingoBoard
