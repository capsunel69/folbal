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
        const answer = $(this).data('answer');
        const questionId = $('.question-container').data('question-id');
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
                <div class="score-entry">
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

    // Handle answer submission
    $(document).on('click', '.answer-btn', function() {
        const answer = $(this).data('answer');
        const questionId = $('.question-container').data('question-id');
        
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
                if (response.success) {
                    // Wait for the next question
                    $('.answers-grid').empty();
                    $('.question-text').text('Waiting for next question...');
                } else {
                    alert('Error: ' + (response.data.message || 'Failed to submit answer'));
                }
            },
            error: function(xhr, status, error) {
                console.error('AJAX Error:', status, error);
            }
        });
    });
});