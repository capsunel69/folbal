# Romanian Football Player Guesser

Welcome to the Romanian Football Player Guesser game! This interactive web application challenges you to guess the names of Romanian football players based on various attributes. Test your knowledge and see if you can identify the players with the fewest attempts!

## Features

- **Player Search**: Start typing a player's name to see suggestions and select the player you want to guess.
- **Hints**: Use hints to get clues about the player's team, position, nationality, age, or shirt number. Each hint costs one attempt.
- **Attempts**: You have 8 attempts to guess the correct player.
- **Responsive Design**: The game is designed to work on both desktop and mobile devices.
- **Loading Screen**: A loading screen is displayed while player data is being fetched and images are preloaded.

## How to Play

1. **Start the Game**: The game begins with a random selection of a target player from the list of Romanian football players.
2. **Make a Guess**: Use the search bar to find and select a player you think matches the target player.
3. **View Feedback**: After each guess, you'll receive feedback on how close your guess was in terms of team, position, nationality, age, and shirt number.
4. **Use Hints**: If you're stuck, click the "Hint" button to receive a clue. Remember, each hint costs one attempt.
5. **Win or Lose**: The game ends when you either guess the player correctly or run out of attempts. If you win, you'll see a congratulatory message. If you lose, the correct player's name will be revealed.
6. **Play Again**: Click "Play Again" to start a new game with a different target player.

## Technical Details

- **HTML/CSS**: The game is styled using CSS with a focus on a modern, gradient-based design.
- **JavaScript**: The game logic, including player data fetching, image preloading, and user interaction handling, is implemented in JavaScript.
- **Responsive Design**: Media queries are used to ensure the game is playable on various screen sizes.

## Setup and Installation

1. **Clone the Repository**: 
   ```bash
   git clone https://github.com/yourusername/romanian-football-player-guesser.git
   ```
2. **Open the Game**: Navigate to the project directory and open `index.html` in your web browser.

## Dependencies

- The game fetches player data from an external JSON file hosted on AWS S3.
- Player and team images are also loaded from AWS S3.

## Contributing

Contributions are welcome! If you have suggestions for improvements or new features, feel free to open an issue or submit a pull request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.

## Acknowledgments

- Thanks to all contributors and testers who helped make this game possible.
- Special thanks to the creators of the fonts and icons used in the game.

Enjoy playing the Romanian Football Player Guesser and challenge your friends to see who knows Romanian football players best!