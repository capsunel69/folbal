import { Box, Text, Flex, Link, Icon } from '@chakra-ui/react'
import { FaTiktok, FaYoutube, FaInstagram } from 'react-icons/fa'

const Footer = () => {
  return (
    <Box as="footer" bg="#000212" color="white" py={8}>
      <Flex 
        direction={{ base: 'column', md: 'row' }}
        maxW="1200px"
        mx="auto"
        px={4}
        align="center"
        justify="space-between"
      >
        <Text>&copy; {new Date().getFullYear()} Bingo Fotbal Comedie. All rights reserved.</Text>
        
        <Flex gap={4} mt={{ base: 4, md: 0 }}>
          <Link href="#" _hover={{ color: 'yellow.400' }}>
            <Icon as={FaYoutube} w={6} h={6} />
          </Link>
          <Link href="#" _hover={{ color: 'yellow.400' }}>
            <Icon as={FaTiktok} w={5} h={5} />
          </Link>
          <Link href="#" _hover={{ color: 'yellow.400' }}>
            <Icon as={FaInstagram} w={6} h={6} />
          </Link>
        </Flex>
      </Flex>
    </Box>
  )
}

export default Footer 