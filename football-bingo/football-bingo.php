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

    private function __construct() {
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
        add_shortcode('football_bingo', array($this, 'game_shortcode'));
    }

    public function init() {
        $this->create_tables();
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
            'pusher_cluster' => $this->pusher_cluster
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
            </div>

            <div class="game-section" style="display: none;">
                <div class="scoreboard"></div>
                <div class="question-container"></div>
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

            try {
                // Initialize Pusher
                $pusher = new Pusher\Pusher(
                    $this->pusher_key,
                    $this->pusher_secret,
                    $this->pusher_app_id,
                    array('cluster' => $this->pusher_cluster)
                );

                // Get all players in room
                $players = $wpdb->get_results($wpdb->prepare(
                    "SELECT u.display_name 
                    FROM {$wpdb->prefix}football_bingo_players p
                    JOIN {$wpdb->users} u ON p.user_id = u.ID
                    WHERE p.room_id = %d",
                    $room->id
                ));

                // Trigger event for player joined
                $pusher->trigger('game-' . $room_code, 'player-joined', array(
                    'player' => wp_get_current_user()->display_name,
                    'players' => $players
                ));
            } catch (Exception $e) {
                // Log Pusher error but don't stop execution
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

    private function generate_room_code($length = 6) {
        $characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        $code = '';
        
        for ($i = 0; $i < $length; $i++) {
            $code .= $characters[rand(0, strlen($characters) - 1)];
        }
        
        return $code;
    }
}

FootballBingo::get_instance();