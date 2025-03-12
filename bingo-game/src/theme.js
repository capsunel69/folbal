import { extendTheme } from '@chakra-ui/react'

const theme = extendTheme({
  styles: {
    global: {
      body: {
        bg: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        color: 'rgba(255, 255, 255, 0.95)',
        minHeight: '100vh',
      }
    }
  },
  colors: {
    brand: {
      100: 'rgba(255, 255, 255, 0.15)',
      500: '#4CAF50',
      600: '#45a049',
      700: 'rgba(0, 0, 0, 0.6)',
    },
    correct: {
      500: 'linear-gradient(135deg, #00b894, #00a884)',
    },
    incorrect: {
      500: 'linear-gradient(135deg, #e17055, #d63031)',
    }
  },
  components: {
    Button: {
      baseStyle: {
        borderRadius: '25px',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        fontWeight: 'bold',
        transition: 'all 0.3s ease',
        _hover: {
          transform: 'translateY(-2px)',
        }
      },
      variants: {
        solid: {
          bg: 'linear-gradient(135deg, #6c5ce7, #a55eea)',
          color: 'white',
          boxShadow: '0 5px 15px rgba(108, 92, 231, 0.3)',
          _hover: {
            boxShadow: '0 8px 20px rgba(108, 92, 231, 0.4)',
          },
        },
        outline: {
          bg: 'transparent',
          border: '2px solid rgba(255, 255, 255, 0.2)',
          _hover: {
            bg: 'rgba(255, 255, 255, 0.15)',
          },
        }
      },
    },
    Container: {
      baseStyle: {
        maxW: 'container.lg',
        bg: 'rgba(22, 33, 62, 0.95)',
        borderRadius: '20px',
        boxShadow: '0 0 50px rgba(0, 0, 0, 0.5), inset 0 0 30px rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        padding: '60px',
      }
    }
  },
})

export default theme

