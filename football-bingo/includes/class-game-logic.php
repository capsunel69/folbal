<?php
class GameLogic {
    private $pusher;

    public function __construct($pusher) {
        $this->pusher = $pusher;
    }

    public function handle_answer_submission($room_code, $user_id, $question_id, $answer) {
        global $wpdb;
        
        // Process answer and calculate score
        $score = $this->calculate_score($question_id, $answer);
        
        // Update player's score
        $wpdb->update(
            $wpdb->prefix . 'football_bingo_players',
            array('score' => $score),
            array('user_id' => $user_id)
        );

        // Get updated scores
        $scores = $this->get_room_scores($room_code);

        // Broadcast update
        $this->pusher->trigger('game-' . $room_code, 'answer-submitted', array(
            'scores' => $scores
        ));

        return $scores;
    }

    private function calculate_score($question_id, $answer) {
        global $wpdb;
        
        $question = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}football_bingo_questions WHERE id = %d",
            $question_id
        ));

        if ($question && $question->correct_answer === $answer) {
            return $question->points;
        }

        return 0;
    }

    private function get_room_scores($room_code) {
        global $wpdb;
        
        return $wpdb->get_results($wpdb->prepare(
            "SELECT u.display_name, p.score 
            FROM {$wpdb->prefix}football_bingo_players p
            JOIN {$wpdb->users} u ON p.user_id = u.ID
            JOIN {$wpdb->prefix}football_bingo_rooms r ON p.room_id = r.id
            WHERE r.room_code = %s
            ORDER BY p.score DESC",
            $room_code
        ));
    }
}