import { VStack, Button, Text, useColorModeValue } from '@chakra-ui/react';
import { FaClock, FaInfinity } from 'react-icons/fa';

const GameModeSelect = ({ onModeSelect }) => {

  return (
    <VStack spacing={4} p={2} borderRadius="lg">
      <Text fontSize="3xl" fontFamily="'Russo One', sans-serif">
        Select Game Mode
      </Text>
      <Button
        leftIcon={<FaInfinity />}
        colorScheme="teal"
        size="lg"
        onClick={() => onModeSelect(false)}
        w="full"
      >
        Classic Mode
      </Button>
      <Button
        leftIcon={<FaClock />}
        colorScheme="purple"
        size="lg"
        onClick={() => onModeSelect(true)}
        w="full"
      >
        Timed Mode (10s)
      </Button>
    </VStack>
  );
};

export default GameModeSelect; 