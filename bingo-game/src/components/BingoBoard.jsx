import { Grid, GridItem, Text, Image, VStack, useColorModeValue } from '@chakra-ui/react'
import { categories } from '../data/categories'

function BingoBoard({ selectedCells, onCellSelect, validSelections = [], currentInvalidSelection = null }) {
  const getCellBackground = (categoryId, index) => {
    if (validSelections.includes(categoryId)) return 'correct.500'
    if (categoryId === currentInvalidSelection) return 'incorrect.500'
    if (selectedCells.includes(categoryId)) return 'brand.100'
    
    // Modern chess board pattern
    const row = Math.floor(index / 4)
    const col = index % 4
    return (row + col) % 2 === 0 
      ? '#0f172a'  // Darker square
      : '#1e293b'  // Lighter square
  }

  const getCellBoxShadow = (categoryId) => {
    if (validSelections.includes(categoryId)) return '0 0 20px rgba(0, 184, 148, 0.5)'
    if (categoryId === currentInvalidSelection) return '0 0 20px rgba(225, 112, 85, 0.5)'
    return '0 4px 12px rgba(0, 0, 0, 0.2)'
  }

  const isCellDisabled = (categoryId) => {
    return validSelections.includes(categoryId)
  }

  return (
    <Grid
      templateColumns="repeat(4, 1fr)"
      gap={2} // Add small gap for better mobile view
      w="100%"
      maxW="800px"
      mx="auto"
      px={{ base: 2, md: 4 }}
    >
      {categories.map((category, index) => (
        <GridItem
          key={category.id}
          onClick={() => !isCellDisabled(category.id) && onCellSelect(category.id)}
          cursor={isCellDisabled(category.id) ? 'default' : 'pointer'}
          p={{ base: 2, md: 4 }} // Responsive padding
          bg={getCellBackground(category.id, index)}
          transition="all 0.3s ease"
          borderRadius="lg" // Rounded corners
          boxShadow={getCellBoxShadow(category.id)}
          _hover={{
            transform: !isCellDisabled(category.id) && 'translateY(-2px)',
            bg: isCellDisabled(category.id) 
              ? getCellBackground(category.id, index) 
              : 'rgba(255, 255, 255, 0.1)'
          }}
        >
          <VStack spacing={2} justify="center" h="100%" align="center">
            {category.image && (
              <Image 
                src={`/images/${category.image}`}
                alt={category.name}
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
              {category.name}
            </Text>
          </VStack>
        </GridItem>
      ))}
    </Grid>
  )
}

export default BingoBoard
