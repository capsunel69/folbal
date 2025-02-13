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
            updatePlayersList([data.creator]);
        });

        currentChannel.bind('player-joined', function(data) {
            updatePlayersList(data.players);
        });

        currentChannel.bind('answer-submitted', function(data) {
            updateScoreboard(data.scores);
        });
    }

    function updatePlayersList(players) {
        const playersList = $('.players-list');
        playersList.empty();
        
        players.forEach(function(player) {
            const playerName = typeof player === 'string' ? player : player.display_name;
            playersList.append(`<div class="player">${playerName}</div>`);
        });
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

    // ... [Previous JavaScript code continues with all the functions we defined earlier]
});