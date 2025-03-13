import { Box, Flex, Image, Spacer, Link } from '@chakra-ui/react'

const Header = () => {
    return (
        <Box as="header" bg="#000212" px={4} py={4}>
            <Flex align="center" maxW="1200px" mx="auto">
                <Link href="/" display="flex" alignItems="center">
                    <Image src="/fpc.png" alt="Bingo Logo" h="50px" />
                </Link>
                <Box ml={3} color="white" fontSize="xl" fontFamily="'Russo One', sans-serif">
                    Jocuri Fotbal Comedie
                </Box>
                <Spacer />
                <Flex gap={6}>
                    {/* <Link color="white" href="#rules" _hover={{ color: 'yellow.400' }}>
                        Rules
                    </Link> */}
                    <Link color="white" href="https://fotbal-comedie.ro" _hover={{ color: 'yellow.400' }}>
                        Back to main website
                    </Link>
                </Flex>
            </Flex>
        </Box>
    )
}

export default Header 