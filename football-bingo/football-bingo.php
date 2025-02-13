<?php
/*
Plugin Name: Football Bingo
Description: Multiplayer football bingo game
Version: 1.0
*/

if (!defined('ABSPATH')) exit;

class FootballBingo {
    private static $instance = null;
    private $pusher_app_id = '1940326'; // Replace with your Pusher credentials
    private $pusher_key = '9646a9522cd23ea11527';
    private $pusher_secret = '2187c9ca929c25b0f11b';
    private $pusher_cluster = 'eu';

    public static function get_instance() {
        if (self::$instance == null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function __construct() {
        // First check if composer autoload exists
        $composer_autoload = plugin_dir_path(__FILE__) . 'vendor/autoload.php';
        if (file_exists($composer_autoload)) {
            require_once $composer_autoload;
        } else {
            // Manual class loading if composer autoload doesn't exist
            require_once plugin_dir_path(__FILE__) . 'vendor/pusher/pusher-php-server/src/Pusher.php';
            require_once plugin_dir_path(__FILE__) . 'vendor/pusher/pusher-php-server/src/PusherInterface.php';
            require_once plugin_dir_path(__FILE__) . 'vendor/pusher/pusher-php-server/src/PusherException.php';
        }
        
        add_action('init', array($this, 'init'));
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
        add_action('wp_ajax_create_room', array($this, 'create_room'));
        add_action('wp_ajax_join_room', array($this, 'join_room'));
        add_action('wp_ajax_submit_answer', array($this, 'submit_answer'));
        add_action('wp_ajax_start_game', array($this, 'start_game'));
        add_action('wp_ajax_get_next_question', array($this, 'get_next_question'));
        add_action('wp_ajax_restart_game', array($this, 'restart_game'));
        add_shortcode('football_bingo', array($this, 'game_shortcode'));
    }

    public function init() {
        $this->create_tables();
        $this->insert_default_questions();
    }

    public function create_tables() {
        global $wpdb;
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');

        $charset_collate = $wpdb->get_charset_collate();

        $sql = "CREATE TABLE IF NOT EXISTS {$wpdb->prefix}football_bingo_rooms (
            id INT AUTO_INCREMENT PRIMARY KEY,
            room_code VARCHAR(10) NOT NULL,
            status ENUM('waiting', 'in_progress', 'completed') DEFAULT 'waiting',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) $charset_collate;";

        dbDelta($sql);

        $sql = "CREATE TABLE IF NOT EXISTS {$wpdb->prefix}football_bingo_players (
            id INT AUTO_INCREMENT PRIMARY KEY,
            room_id INT,
            user_id INT,
            score INT DEFAULT 0,
            finished_at TIMESTAMP NULL,
            FOREIGN KEY (room_id) REFERENCES {$wpdb->prefix}football_bingo_rooms(id)
        ) $charset_collate;";

        dbDelta($sql);

        // Create questions table
        $sql = "CREATE TABLE IF NOT EXISTS {$wpdb->prefix}football_bingo_questions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            question TEXT NOT NULL,
            correct_answer VARCHAR(255) NOT NULL,
            options TEXT NOT NULL,
            points INT DEFAULT 10
        ) $charset_collate;";

        dbDelta($sql);

        // Check if last_answer_id column exists before adding it
        $column_exists = $wpdb->get_results($wpdb->prepare(
            "SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = %s 
            AND TABLE_NAME = %s 
            AND COLUMN_NAME = 'last_answer_id'",
            DB_NAME,
            $wpdb->prefix . 'football_bingo_players'
        ));

        if (empty($column_exists)) {
            $sql = "ALTER TABLE {$wpdb->prefix}football_bingo_players 
                    ADD COLUMN last_answer_id INT NULL";
            $wpdb->query($sql);
        }
    }

    public function enqueue_scripts() {
        // Enqueue Pusher JS library
        wp_enqueue_script('pusher-js', 'https://js.pusher.com/8.0.1/pusher.min.js', array(), '8.0.1', true);
        
        // Enqueue our game scripts and styles
        wp_enqueue_script('football-bingo', plugins_url('assets/js/game.js', __FILE__), array('jquery', 'pusher-js'), '1.0', true);
        wp_enqueue_style('football-bingo', plugins_url('assets/css/style.css', __FILE__));
        
        wp_localize_script('football-bingo', 'footballBingo', array(
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('football_bingo_nonce'),
            'pusher_key' => $this->pusher_key,
            'pusher_cluster' => $this->pusher_cluster,
            'current_user' => wp_get_current_user()->display_name
        ));
    }

    public function game_shortcode() {
        if (!is_user_logged_in()) {
            return 'Please log in to play.';
        }

        ob_start();
        ?>
        <div class="football-bingo-game">
            <div class="room-section">
                <button id="create-room" class="game-button">Create Room</button>
                <div class="join-room">
                    <input type="text" id="room-code-input" placeholder="Enter Room Code">
                    <button id="join-room" class="game-button">Join Room</button>
                </div>
            </div>
            
            <div class="waiting-room" style="display: none;">
                <h2>Waiting for players...</h2>
                <div class="room-code">Room Code: <span id="room-code"></span></div>
                <div class="players-list"></div>
                <button id="start-game" class="game-button" style="display: none;">Start Game</button>
            </div>

            <div class="game-section" style="display: none;">
                <div class="scoreboard"></div>
                <div class="question-container">
                    <h3 class="question-text"></h3>
                    <div class="answers-grid">
                        <!-- Answers will be inserted here dynamically -->
                    </div>
                </div>
                <div class="game-status">
                    <span class="current-round"></span>
                    <span class="timer"></span>
                </div>
            </div>

            <div class="game-results" style="display: none;">
                <h2>Game Results</h2>
                <div class="final-scoreboard"></div>
            </div>
        </div>
        <?php
        return ob_get_clean();
    }

    public function create_room() {
        try {
            error_log('Starting create_room function');
            check_ajax_referer('football_bingo_nonce', 'nonce');

            if (!class_exists('Pusher\Pusher')) {
                error_log('Pusher class not found');
                throw new Exception('Required dependencies are missing.');
            }

            global $wpdb;
            $user_id = get_current_user_id();
            error_log('User ID: ' . $user_id);

            // Generate unique room code
            $room_code = $this->generate_room_code();
            error_log('Generated room code: ' . $room_code);

            // Insert new room
            $result = $wpdb->insert(
                $wpdb->prefix . 'football_bingo_rooms',
                array(
                    'room_code' => $room_code,
                    'status' => 'waiting'
                ),
                array('%s', '%s')
            );

            if ($result === false) {
                error_log('Database error when creating room: ' . $wpdb->last_error);
                throw new Exception('Failed to create room: ' . $wpdb->last_error);
            }

            $room_id = $wpdb->insert_id;
            error_log('Created room with ID: ' . $room_id);

            // Add creator as first player
            $result = $wpdb->insert(
                $wpdb->prefix . 'football_bingo_players',
                array(
                    'room_id' => $room_id,
                    'user_id' => $user_id,
                    'score' => 0
                ),
                array('%d', '%d', '%d')
            );

            if ($result === false) {
                error_log('Database error when adding player: ' . $wpdb->last_error);
                throw new Exception('Failed to add player: ' . $wpdb->last_error);
            }

            try {
                error_log('Initializing Pusher');
                
                // Create Pusher instance with explicit namespace
                $pusher = new \Pusher\Pusher(
                    $this->pusher_key,
                    $this->pusher_secret,
                    $this->pusher_app_id,
                    array(
                        'cluster' => $this->pusher_cluster,
                        'encrypted' => true
                    )
                );

                error_log('Pusher instance created successfully');

                // Trigger event for room creation
                $event_data = array(
                    'room_code' => $room_code,
                    'creator' => wp_get_current_user()->display_name
                );
                
                $pusher->trigger('game-' . $room_code, 'room-created', $event_data);
                error_log('Pusher event triggered successfully');
                
            } catch (Exception $e) {
                error_log('Pusher error: ' . $e->getMessage());
                error_log('Pusher error trace: ' . $e->getTraceAsString());
                // Continue execution despite Pusher error
            }

            wp_send_json_success(array(
                'room_code' => $room_code,
                'room_id' => $room_id
            ));

        } catch (Exception $e) {
            error_log('Football Bingo Critical Error: ' . $e->getMessage());
            error_log('Stack trace: ' . $e->getTraceAsString());
            wp_send_json_error(array(
                'message' => 'Failed to create room: ' . $e->getMessage()
            ));
        }
    }

    public function join_room() {
        try {
            check_ajax_referer('football_bingo_nonce', 'nonce');

            if (!isset($_POST['room_code'])) {
                throw new Exception('Room code is required');
            }

            global $wpdb;
            $user_id = get_current_user_id();
            $room_code = sanitize_text_field($_POST['room_code']);

            // Check if room exists
            $room = $wpdb->get_row($wpdb->prepare(
                "SELECT * FROM {$wpdb->prefix}football_bingo_rooms WHERE room_code = %s AND status = 'waiting'",
                $room_code
            ));

            if (!$room) {
                throw new Exception('Room not found or game already started');
            }

            // Check if player already in room
            $existing_player = $wpdb->get_var($wpdb->prepare(
                "SELECT id FROM {$wpdb->prefix}football_bingo_players WHERE room_id = %d AND user_id = %d",
                $room->id,
                $user_id
            ));

            if (!$existing_player) {
                $result = $wpdb->insert(
                    $wpdb->prefix . 'football_bingo_players',
                    array(
                        'room_id' => $room->id,
                        'user_id' => $user_id,
                        'score' => 0
                    ),
                    array('%d', '%d', '%d')
                );

                if ($result === false) {
                    throw new Exception('Failed to add player to room: ' . $wpdb->last_error);
                }
            }

            // Get all players in room
            $players = $wpdb->get_results($wpdb->prepare(
                "SELECT u.display_name, p.id, p.user_id
                FROM {$wpdb->prefix}football_bingo_players p
                JOIN {$wpdb->users} u ON p.user_id = u.ID
                WHERE p.room_id = %d
                ORDER BY p.id ASC", // Order by ID to ensure creator is first
                $room->id
            ));

            try {
                // Initialize Pusher
                $pusher = new Pusher\Pusher(
                    $this->pusher_key,
                    $this->pusher_secret,
                    $this->pusher_app_id,
                    array('cluster' => $this->pusher_cluster)
                );

                // Trigger event for player joined
                $pusher->trigger('game-' . $room_code, 'player-joined', array(
                    'player' => wp_get_current_user()->display_name,
                    'players' => array_map(function($player) {
                        return array('display_name' => $player->display_name);
                    }, $players)
                ));
            } catch (Exception $e) {
                error_log('Pusher error: ' . $e->getMessage());
            }

            wp_send_json_success(array(
                'room_code' => $room_code,
                'room_id' => $room->id
            ));

        } catch (Exception $e) {
            error_log('Football Bingo Error: ' . $e->getMessage());
            wp_send_json_error(array(
                'message' => $e->getMessage()
            ));
        }
    }

    public function start_game() {
        try {
            check_ajax_referer('football_bingo_nonce', 'nonce');

            if (!isset($_POST['room_code'])) {
                throw new Exception('Room code is required');
            }

            global $wpdb;
            $user_id = get_current_user_id();
            $room_code = sanitize_text_field($_POST['room_code']);

            // Get room info
            $room = $wpdb->get_row($wpdb->prepare(
                "SELECT * FROM {$wpdb->prefix}football_bingo_rooms WHERE room_code = %s",
                $room_code
            ));

            if (!$room) {
                throw new Exception('Room not found');
            }

            // Check if user is room creator (first player to join)
            $is_creator = $wpdb->get_var($wpdb->prepare(
                "SELECT 1 FROM {$wpdb->prefix}football_bingo_players 
                WHERE room_id = %d AND user_id = %d 
                ORDER BY id ASC LIMIT 1",
                $room->id,
                $user_id
            ));

            if (!$is_creator) {
                throw new Exception('Only the room creator can start the game');
            }

            // Count players
            $player_count = $wpdb->get_var($wpdb->prepare(
                "SELECT COUNT(*) FROM {$wpdb->prefix}football_bingo_players WHERE room_id = %d",
                $room->id
            ));

            if ($player_count < 2) {
                throw new Exception('At least 2 players are required to start the game');
            }

            if ($player_count > 8) {
                throw new Exception('Maximum 8 players allowed');
            }

            // Update room status
            $wpdb->update(
                $wpdb->prefix . 'football_bingo_rooms',
                array('status' => 'in_progress'),
                array('id' => $room->id),
                array('%s'),
                array('%d')
            );

            // Initialize Pusher
            $pusher = new Pusher\Pusher(
                $this->pusher_key,
                $this->pusher_secret,
                $this->pusher_app_id,
                array('cluster' => $this->pusher_cluster)
            );

            // Trigger game start event
            $pusher->trigger('game-' . $room_code, 'game-started', array(
                'message' => 'Game started!'
            ));

            wp_send_json_success(array(
                'message' => 'Game started successfully'
            ));

        } catch (Exception $e) {
            wp_send_json_error(array(
                'message' => $e->getMessage()
            ));
        }
    }

    public function get_next_question() {
        try {
            check_ajax_referer('football_bingo_nonce', 'nonce');

            if (!isset($_POST['room_code'])) {
                throw new Exception('Room code is required');
            }

            global $wpdb;
            
            // Get a random question
            $question = $wpdb->get_row(
                "SELECT * FROM {$wpdb->prefix}football_bingo_questions 
                ORDER BY RAND() 
                LIMIT 1"
            );

            if (!$question) {
                throw new Exception('No questions available');
            }

            // Convert options string to array
            $options = json_decode($question->options);

            wp_send_json_success(array(
                'id' => $question->id,
                'question' => $question->question,
                'options' => $options
            ));

        } catch (Exception $e) {
            wp_send_json_error(array(
                'message' => $e->getMessage()
            ));
        }
    }

    public function submit_answer() {
        try {
            check_ajax_referer('football_bingo_nonce', 'nonce');
            
            if (!isset($_POST['room_code']) || !isset($_POST['question_id']) || !isset($_POST['answer'])) {
                throw new Exception('Missing required data');
            }

            global $wpdb;
            $user_id = get_current_user_id();
            $room_code = sanitize_text_field($_POST['room_code']);
            $question_id = intval($_POST['question_id']);
            $answer = sanitize_text_field($_POST['answer']);

            // Get the room and question
            $room = $wpdb->get_row($wpdb->prepare(
                "SELECT * FROM {$wpdb->prefix}football_bingo_rooms WHERE room_code = %s",
                $room_code
            ));

            $question = $wpdb->get_row($wpdb->prepare(
                "SELECT * FROM {$wpdb->prefix}football_bingo_questions WHERE id = %d",
                $question_id
            ));

            // Calculate points
            $points = ($question->correct_answer === $answer) ? $question->points : 0;

            // Update player's score and last answered question
            $wpdb->query($wpdb->prepare(
                "UPDATE {$wpdb->prefix}football_bingo_players 
                SET score = score + %d,
                    last_answer_id = %d
                WHERE room_id = %d AND user_id = %d",
                $points,
                $question_id,
                $room->id,
                $user_id
            ));

            // Get total players and players who answered
            $total_players = $wpdb->get_var($wpdb->prepare(
                "SELECT COUNT(*) FROM {$wpdb->prefix}football_bingo_players WHERE room_id = %d",
                $room->id
            ));

            $players_answered = $wpdb->get_var($wpdb->prepare(
                "SELECT COUNT(*) FROM {$wpdb->prefix}football_bingo_players 
                WHERE room_id = %d AND last_answer_id = %d",
                $room->id,
                $question_id
            ));

            // Get current scores
            $scores = $wpdb->get_results($wpdb->prepare(
                "SELECT u.display_name, p.score 
                FROM {$wpdb->prefix}football_bingo_players p
                JOIN {$wpdb->users} u ON p.user_id = u.ID
                WHERE p.room_id = %d
                ORDER BY p.score DESC",
                $room->id
            ));

            // Initialize Pusher
            $pusher = new Pusher\Pusher(
                $this->pusher_key,
                $this->pusher_secret,
                $this->pusher_app_id,
                array('cluster' => $this->pusher_cluster)
            );

            // If all players have answered
            if ($players_answered >= $total_players) {
                // Get total questions and check if this was the last one
                $total_questions = $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}football_bingo_questions");
                $is_last_question = $question_id >= $total_questions;

                $next_question = null;
                if (!$is_last_question) {
                    $next_question = $wpdb->get_row(
                        "SELECT * FROM {$wpdb->prefix}football_bingo_questions 
                        WHERE id > {$question_id}
                        ORDER BY id ASC 
                        LIMIT 1"
                    );
                }

                $pusher->trigger('game-' . $room_code, 'all-players-answered', array(
                    'correct_answer' => $question->correct_answer,
                    'scores' => $scores,
                    'next_question' => $next_question ? array(
                        'id' => $next_question->id,
                        'question' => $next_question->question,
                        'options' => json_decode($next_question->options)
                    ) : null,
                    'is_game_over' => $is_last_question,
                    'final_scores' => $is_last_question ? $scores : null
                ));

                if ($is_last_question) {
                    // Update room status to completed
                    $wpdb->update(
                        $wpdb->prefix . 'football_bingo_rooms',
                        array('status' => 'completed'),
                        array('id' => $room->id)
                    );
                }
            }

            wp_send_json_success(array(
                'correct' => $question->correct_answer === $answer,
                'points' => $points,
                'scores' => $scores
            ));

        } catch (Exception $e) {
            wp_send_json_error(array(
                'message' => $e->getMessage()
            ));
        }
    }

    public function restart_game() {
        try {
            check_ajax_referer('football_bingo_nonce', 'nonce');
            
            if (!isset($_POST['room_code'])) {
                throw new Exception('Room code is required');
            }

            global $wpdb;
            $room_code = sanitize_text_field($_POST['room_code']);
            $user_id = get_current_user_id();

            // Verify user is room creator
            $room = $wpdb->get_row($wpdb->prepare(
                "SELECT r.*, p.user_id as creator_id 
                FROM {$wpdb->prefix}football_bingo_rooms r
                JOIN {$wpdb->prefix}football_bingo_players p ON r.id = p.room_id
                WHERE r.room_code = %s
                ORDER BY p.id ASC
                LIMIT 1",
                $room_code
            ));

            if ($room->creator_id != $user_id) {
                throw new Exception('Only the room creator can restart the game');
            }

            // Reset room status and player scores
            $wpdb->update(
                $wpdb->prefix . 'football_bingo_rooms',
                array('status' => 'waiting'),
                array('id' => $room->id)
            );

            $wpdb->query($wpdb->prepare(
                "UPDATE {$wpdb->prefix}football_bingo_players 
                SET score = 0, last_answer_id = NULL 
                WHERE room_id = %d",
                $room->id
            ));

            // Initialize Pusher
            $pusher = new Pusher\Pusher(
                $this->pusher_key,
                $this->pusher_secret,
                $this->pusher_app_id,
                array('cluster' => $this->pusher_cluster)
            );

            // Broadcast restart event
            $pusher->trigger('game-' . $room_code, 'game-restart', array());

            wp_send_json_success();

        } catch (Exception $e) {
            wp_send_json_error(array(
                'message' => $e->getMessage()
            ));
        }
    }

    private function generate_room_code($length = 6) {
        $characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        $code = '';
        
        for ($i = 0; $i < $length; $i++) {
            $code .= $characters[rand(0, strlen($characters) - 1)];
        }
        
        return $code;
    }

    private function insert_default_questions() {
        global $wpdb;
        
        // Check if questions already exist
        $count = $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}football_bingo_questions");
        if ($count > 0) {
            return; // Skip if questions already exist
        }
        
        $default_questions = array(
            array(
                'question' => 'Which team won the first FIFA World Cup?',
                'correct_answer' => 'Uruguay',
                'options' => json_encode(['Brazil', 'Uruguay', 'Argentina', 'Italy']),
                'points' => 10
            ),
            array(
                'question' => 'Who has scored the most goals in World Cup history?',
                'correct_answer' => 'Miroslav Klose',
                'options' => json_encode(['Pele', 'Miroslav Klose', 'Ronaldo', 'Maradona']),
                'points' => 10
            ),
            array(
                'question' => 'Which country has won the most World Cups?',
                'correct_answer' => 'Brazil',
                'options' => json_encode(['Germany', 'Brazil', 'Italy', 'Argentina']),
                'points' => 10
            ),
            array(
                'question' => 'Who won the FIFA World Cup 2022?',
                'correct_answer' => 'Argentina',
                'options' => json_encode(['France', 'Argentina', 'Brazil', 'Croatia']),
                'points' => 10
            )
        );

        foreach ($default_questions as $question) {
            $wpdb->insert(
                $wpdb->prefix . 'football_bingo_questions',
                $question,
                array('%s', '%s', '%s', '%d')
            );
        }
    }
}

FootballBingo::get_instance();