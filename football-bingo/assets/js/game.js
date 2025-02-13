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
                    alert('Error: ' + (response.data.message || 'Failed to create room'));
                }
            },
            error: function(xhr, status, error) {
                console.error('AJAX Error:', status, error);
                alert('Failed to create room. Please try again.');
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

    // ... [Previous JavaScript code continues with all the functions we defined earlier]
});