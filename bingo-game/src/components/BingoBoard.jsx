import { Grid, GridItem, Text, useColorModeValue } from '@chakra-ui/react'
import { categories } from '../data/categories'

function BingoBoard({ selectedCells, onCellSelect, validSelections = [], currentInvalidSelection = null }) {
  const getCellBackground = (categoryId) => {
    if (validSelections.includes(categoryId)) return 'linear-gradient(135deg, #00b894, #00a884)'
    if (categoryId === currentInvalidSelection) return 'linear-gradient(135deg, #e17055, #d63031)'
    if (selectedCells.includes(categoryId)) return 'rgba(255, 255, 255, 0.15)'
    return 'rgba(22, 33, 62, 0.95)'
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
      gap={4} 
      w="full" 
      maxW="800px"
      p={6}
      bg="rgba(22, 33, 62, 0.8)"
      borderRadius="xl"
    >
      {categories.map((category) => (
        <GridItem
          key={category.id}
          p={4}
          bg={getCellBackground(category.id)}
          boxShadow={getCellBoxShadow(category.id)}
          borderRadius="lg"
          border="1px solid rgba(255, 255, 255, 0.1)"
          cursor={isCellDisabled(category.id) ? "not-allowed" : "pointer"}
          onClick={() => !isCellDisabled(category.id) && onCellSelect(category)}
          opacity={isCellDisabled(category.id) ? 0.8 : 1}
          transition="all 0.3s ease"
          _hover={{
            transform: isCellDisabled(category.id) ? 'none' : 'translateY(-2px)',
            boxShadow: isCellDisabled(category.id) ? getCellBoxShadow(category.id) : '0 8px 20px rgba(0, 0, 0, 0.4)'
          }}
        >
          <Text 
            fontWeight="bold" 
            fontSize={["xs", "sm"]}
            color="white"
            textShadow="0 2px 4px rgba(0, 0, 0, 0.3)"
          >
            {category.name}
          </Text>
        </GridItem>
      ))}
    </Grid>
  )
}

export default BingoBoard
