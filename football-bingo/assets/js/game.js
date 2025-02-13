jQuery(document).ready(function($) {
    // Initialize Pusher
    const pusher = new Pusher(footballBingo.pusher_key, {
        cluster: footballBingo.pusher_cluster
    });

    let currentRoom = null;
    let currentChannel = null;

    // Event Listeners
    $('#create-room').on('click', createRoom);
    $('#join-room').on('click', function() {
        const roomCode = $('#room-code-input').val();
        if (roomCode) {
            joinRoom(roomCode);
        }
    });

    $(document).on('click', '.answer-btn', function() {
        if ($(this).prop('disabled')) {
            return; // Don't do anything if button is disabled
        }
        
        const answer = $(this).data('answer');
        const questionId = $('.question-container').data('question-id');
        
        // Disable all answer buttons immediately
        $('.answer-btn').prop('disabled', true);
        
        submitAnswer(questionId, answer);
    });

    $('#start-game').on('click', function() {
        console.log('Start game button clicked'); // Debug log
        $.ajax({
            url: footballBingo.ajax_url,
            type: 'POST',
            data: {
                action: 'start_game',
                room_code: currentRoom,
                nonce: footballBingo.nonce
            },
            success: function(response) {
                console.log('Start game response:', response); // Debug log
                if (response.success) {
                    $('.waiting-room').hide();
                    $('.game-section').show();
                    
                    // Add channel binding for game started event if not already added
                    currentChannel.bind('game-started', function(data) {
                        console.log('Game started event received:', data); // Debug log
                        $('.waiting-room').hide();
                        $('.game-section').show();
                    });
                } else {
                    alert('Error: ' + (response.data.message || 'Failed to start game'));
                }
            },
            error: function(xhr, status, error) {
                console.error('AJAX Error:', status, error);
                alert('Failed to start game. Please try again.');
            }
        });
    });

    // Room Functions
    function createRoom() {
        $.ajax({
            url: footballBingo.ajax_url,
            type: 'POST',
            data: {
                action: 'create_room',
                nonce: footballBingo.nonce
            },
            success: function(response) {
                if (response.success) {
                    joinGameChannel(response.data.room_code);
                    $('#room-code').text(response.data.room_code);
                    currentRoom = response.data.room_code;
                    $('.room-section').hide();
                    $('.waiting-room').show();
                } else {
                    console.error('Server Error:', response);
                    alert('Error: ' + (response.data.message || 'Failed to create room'));
                }
            },
            error: function(xhr, status, error) {
                console.error('AJAX Error:', {
                    status: status,
                    error: error,
                    response: xhr.responseText,
                    statusCode: xhr.status
                });
                alert('Failed to create room. Please check browser console for details.');
            }
        });
    }

    function joinRoom(roomCode) {
        $.ajax({
            url: footballBingo.ajax_url,
            type: 'POST',
            data: {
                action: 'join_room',
                room_code: roomCode,
                nonce: footballBingo.nonce
            },
            success: function(response) {
                if (response.success) {
                    joinGameChannel(roomCode);
                    currentRoom = roomCode;
                    $('.room-section').hide();
                    $('.waiting-room').show();
                } else {
                    alert('Error: ' + (response.data.message || 'Failed to join room'));
                }
            },
            error: function(xhr, status, error) {
                console.error('AJAX Error:', status, error);
                alert('Failed to join room. Please try again.');
            }
        });
    }

    // Channel Management
    function joinGameChannel(roomCode) {
        // Unsubscribe from previous channel if exists
        if (currentChannel) {
            currentChannel.unsubscribe();
        }

        // Subscribe to new channel
        currentChannel = pusher.subscribe('game-' + roomCode);

        // Set up channel event listeners
        currentChannel.bind('room-created', function(data) {
            console.log('Room created event:', data);
            const isCreator = data.creator === footballBingo.current_user;
            updatePlayersList([data.creator], isCreator);
        });

        currentChannel.bind('player-joined', function(data) {
            console.log('Player joined event:', data);
            const isCreator = data.players && 
                            data.players.length > 0 && 
                            data.players[0].display_name === footballBingo.current_user;
            console.log('Is creator:', isCreator, 'Current user:', footballBingo.current_user);
            updatePlayersList(data.players, isCreator);
        });

        currentChannel.bind('game-started', function(data) {
            console.log('Game started event received:', data);
            startGameUI();
        });

        currentChannel.bind('answer-submitted', function(data) {
            updateScoreboard(data.scores);
        });

        currentChannel.bind('scores-updated', function(data) {
            updateScoreboard(data.scores);
            highlightCorrectAnswer(data.correct_answer);
        });

        currentChannel.bind('next-question', function(data) {
            setTimeout(function() {
                displayQuestion(data);
                // Re-enable answer buttons for next question
                $('.answer-btn').prop('disabled', false);
            }, 2000);
        });

        currentChannel.bind('game-over', function(data) {
            console.log('Game over event received:', data);
            showGameOver(data.final_scores);
        });

        currentChannel.bind('all-players-answered', function(data) {
            console.log('All players answered:', data);
            // Show correct answer to everyone
            highlightCorrectAnswer(data.correct_answer);
            updateScoreboard(data.scores);
            
            // Wait a moment before showing next question or game over
            setTimeout(function() {
                if (data.next_question) {
                    displayQuestion(data.next_question);
                    $('.answer-btn').prop('disabled', false);
                } else if (data.is_game_over) {
                    showGameOver(data.final_scores);
                }
            }, 2000);
        });

        currentChannel.bind('game-restart', function() {
            console.log('Game restart received');
            window.location.reload(); // Force reload for all players
        });
    }

    function updatePlayersList(players, isCreator) {
        console.log('Updating players list:', players, 'Is creator:', isCreator); // Debug log
        const playersList = $('.players-list');
        playersList.empty();
        
        players.forEach(function(player) {
            const playerName = typeof player === 'string' ? player : player.display_name;
            playersList.append(`<div class="player">${playerName}</div>`);
        });

        // Show start game button if creator and at least 2 players
        if (isCreator && players.length >= 2) {
            console.log('Showing start game button'); // Debug log
            $('#start-game').show();
        } else {
            console.log('Hiding start game button. isCreator:', isCreator, 'players.length:', players.length); // Debug log
            $('#start-game').hide();
        }
    }

    function updateScoreboard(scores) {
        const scoreboard = $('.scoreboard');
        scoreboard.empty();
        
        scores.forEach(function(score) {
            scoreboard.append(`
                <div class="score-item">
                    <span class="player-name">${score.display_name}</span>
                    <span class="player-score">${score.score}</span>
                </div>
            `);
        });
    }

    function startGameUI() {
        console.log('Starting game UI');
        $('.waiting-room').hide();
        $('.game-section').show();
        fetchNextQuestion();
    }

    function fetchNextQuestion() {
        console.log('Fetching next question');
        $.ajax({
            url: footballBingo.ajax_url,
            type: 'POST',
            data: {
                action: 'get_next_question',
                room_code: currentRoom,
                nonce: footballBingo.nonce
            },
            success: function(response) {
                console.log('Question data:', response);
                if (response.success) {
                    displayQuestion(response.data);
                } else {
                    alert('Error: ' + (response.data.message || 'Failed to get question'));
                }
            },
            error: function(xhr, status, error) {
                console.error('AJAX Error:', status, error);
            }
        });
    }

    function displayQuestion(questionData) {
        const questionContainer = $('.question-container');
        questionContainer.data('question-id', questionData.id);
        
        $('.question-text').text(questionData.question);
        
        const answersGrid = $('.answers-grid');
        answersGrid.empty();
        
        questionData.options.forEach(function(option) {
            answersGrid.append(`
                <button class="answer-btn" data-answer="${option}">
                    ${option}
                </button>
            `);
        });
    }

    function submitAnswer(questionId, answer) {
        console.log('Submitting answer:', { questionId, answer });
        
        // Disable only this user's answer buttons
        $('.answer-btn').prop('disabled', true);
        
        $.ajax({
            url: footballBingo.ajax_url,
            type: 'POST',
            data: {
                action: 'submit_answer',
                room_code: currentRoom,
                question_id: questionId,
                answer: answer,
                nonce: footballBingo.nonce
            },
            success: function(response) {
                console.log('Submit answer response:', response);
                
                if (response.success) {
                    // Show this user their correct/incorrect answer
                    if (response.data.correct) {
                        $('.answer-btn').each(function() {
                            if ($(this).data('answer') === answer) {
                                $(this).addClass('correct');
                            }
                        });
                    } else {
                        $('.answer-btn').each(function() {
                            if ($(this).data('answer') === answer) {
                                $(this).addClass('incorrect');
                            }
                        });
                    }

                    // Update scoreboard
                    updateScoreboard(response.data.scores);
                    
                    // Show waiting message for this user
                    $('.question-text').append('<div class="waiting-message">Waiting for other players...</div>');
                } else {
                    alert('Error: ' + (response.data.message || 'Failed to submit answer'));
                    $('.answer-btn').prop('disabled', false);
                }
            },
            error: function(xhr, status, error) {
                console.error('AJAX Error:', status, error);
                alert('Failed to submit answer. Please try again.');
                $('.answer-btn').prop('disabled', false);
            }
        });
    }

    function highlightCorrectAnswer(correctAnswer) {
        $('.answer-btn').each(function() {
            const $btn = $(this);
            if ($btn.data('answer') === correctAnswer) {
                $btn.addClass('correct');
            } else {
                $btn.addClass('incorrect');
            }
        });
        $('.answer-btn').prop('disabled', true);
    }

    function showGameOver(finalScores) {
        // Hide game section and show results
        $('.game-section').hide();
        $('.game-results').show();
        
        const $finalScoreboard = $('.final-scoreboard');
        $finalScoreboard.empty();
        
        finalScores.forEach(function(score, index) {
            $finalScoreboard.append(`
                <div class="final-score-item ${index === 0 ? 'winner' : ''}">
                    <span class="player-name">${score.display_name}</span>
                    <span class="final-score">${score.score}</span>
                </div>
            `);
        });

        // Only show play again button to room creator
        if (finalScores[0].display_name === footballBingo.current_user) {
            $('.game-results').append(`
                <button class="game-button play-again">Play Again</button>
            `);
        }
    }

    // Update play again click handler
    $(document).on('click', '.play-again', function() {
        console.log('Play again clicked');
        $.ajax({
            url: footballBingo.ajax_url,
            type: 'POST',
            data: {
                action: 'restart_game',
                room_code: currentRoom,
                nonce: footballBingo.nonce
            },
            success: function(response) {
                console.log('Restart game response:', response);
                if (response.success) {
                    // The game-restart event will handle the reload for all players
                } else {
                    alert('Failed to restart game: ' + response.data.message);
                }
            },
            error: function() {
                alert('Failed to restart game. Please try again.');
            }
        });
    });
});