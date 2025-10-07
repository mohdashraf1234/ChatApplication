class ChatApplication {
    constructor() {
        this.stompClient = null;
        this.username = null;
        this.userProfilePic = null;
        this.currentFile = null;
        this.activeUsers = [];
        this.currentChatType = 'public';
        this.currentPrivateChatUser = null;
        this.userProfiles = {};
        
        // Audio Call Variables
        this.localStream = null;
        this.remoteStream = null;
        this.peerConnection = null;
        this.currentCall = null;
        this.callTimer = null;
        this.callStartTime = null;
        this.isMuted = false;
        
        this.pcConfig = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };
        
        this.initialize();
    }

    initialize() {
        this.setupEventListeners();
        this.loadProfilePicture();
        console.log('Chat Application Initialized');
    }

    setupEventListeners() {
        // Login
        document.getElementById('joinBtn').addEventListener('click', () => this.connect());
        document.getElementById('username').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.connect();
        });

        // Message sending
        document.getElementById('sendBtn').addEventListener('click', () => this.sendMessage());
        document.getElementById('message').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
        document.getElementById('message').addEventListener('input', () => this.updateSendButtonState());

        // Receiver input
        document.getElementById('receiver').addEventListener('input', (e) => {
            const receiver = e.target.value.trim();
            receiver ? this.switchToPrivateChat(receiver) : this.switchToPublicChat();
        });

        // File handling
        document.getElementById('fileBtn').addEventListener('click', () => {
            document.getElementById('fileUpload').click();
        });
        document.getElementById('fileUpload').addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.currentFile = e.target.files[0];
                if (this.currentFile.size > 50 * 1024 * 1024) {
                    alert('File size too large. Maximum 50MB allowed.');
                    return;
                }
                this.showFilePreview(this.currentFile);
            }
        });

        // Modal functionality
        document.getElementById('closeModal').addEventListener('click', () => this.closeModal());
        document.getElementById('cancelSend').addEventListener('click', () => this.closeModal());
        document.getElementById('sendFileBtn').addEventListener('click', () => this.sendFile());

        // Chat type switching
        document.getElementById('publicChatBtn').addEventListener('click', () => this.switchToPublicChat());
        document.getElementById('privateChatBtn').addEventListener('click', () => {
            this.currentChatType = 'private';
            document.getElementById('receiver').placeholder = 'To: (Username)';
            document.getElementById('privateChatBtn').classList.add('active');
            document.getElementById('publicChatBtn').classList.remove('active');
        });

        // Profile picture
        document.getElementById('profileUpload').addEventListener('change', (e) => this.handleProfileUpload(e));

        // Call functionality
        document.getElementById('audioCallBtn').addEventListener('click', () => this.startAudioCall());
        document.getElementById('endCallBtn').addEventListener('click', () => this.endCall());
        document.getElementById('endCallBtnModal').addEventListener('click', () => this.endCall());
        document.getElementById('acceptCallBtn').addEventListener('click', () => this.acceptCall());
        document.getElementById('rejectCallBtn').addEventListener('click', () => this.rejectCall());
        document.getElementById('muteCallBtn').addEventListener('click', () => this.toggleMute());
        document.getElementById('closeCallModal').addEventListener('click', () => this.endCall());
        document.getElementById('notificationAccept').addEventListener('click', () => this.acceptCall());
        document.getElementById('notificationReject').addEventListener('click', () => this.rejectCall());

        // Window events
        window.addEventListener('click', (event) => {
            if (event.target === document.getElementById('filePreviewModal')) {
                this.closeModal();
            }
        });

        window.addEventListener('beforeunload', () => this.handlePageUnload());

        // Initialize UI
        this.updateSendButtonState();
        document.getElementById('currentTime').textContent = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        document.getElementById('username').focus();
    }

    // Connection Management
    connect() {
        this.username = document.getElementById('username').value.trim();
        if (!this.username) {
            alert('Please enter your name');
            return;
        }

        this.updateConnectionStatus('🔄 Connecting...', 'connecting');
        
        const socket = new SockJS('/chat-websocket');
        this.stompClient = Stomp.over(socket);
        this.stompClient.debug = null;
        
        this.stompClient.connect({}, (frame) => {
            this.updateConnectionStatus(' Connected', 'connected');
            console.log(' WebSocket Connected for user:', this.username);
            
            this.userProfiles[this.username] = this.userProfilePic;
            document.getElementById('currentUser').textContent = this.username;
            this.updateCurrentUserAvatar();
            
            this.setupWebSocketSubscriptions();
            this.joinChat();
            
        }, (error) => {
            this.updateConnectionStatus('❌ Connection Failed', 'disconnected');
            console.error('STOMP connection error:', error);
            setTimeout(() => this.connect(), 5000);
        });
    }

    setupWebSocketSubscriptions() {
        // Private messages
        this.stompClient.subscribe('/user/queue/private', (message) => {
            try {
                const privateMessage = JSON.parse(message.body);
                if (privateMessage.profilePic && privateMessage.sender !== this.username) {
                    this.userProfiles[privateMessage.sender] = privateMessage.profilePic;
                }
                
                if (privateMessage.type === 'CHAT') {
                    this.showPrivateMessage(privateMessage);
                }
            } catch (error) {
                console.error('Error parsing private message:', error);
            }
        });

        // Private file messages
        this.stompClient.subscribe('/user/queue/private-file', (message) => {
            try {
                const privateFileMessage = JSON.parse(message.body);
                if (privateFileMessage.profilePic && privateFileMessage.sender !== this.username) {
                    this.userProfiles[privateFileMessage.sender] = privateFileMessage.profilePic;
                }
                
                if (privateFileMessage.type === 'FILE') {
                    this.displayFileMessage(privateFileMessage, true);
                }
            } catch (error) {
                console.error('Error parsing private file message:', error);
            }
        });

        // Call messages
        this.stompClient.subscribe('/user/queue/call', (message) => {
            try {
                const callMessage = JSON.parse(message.body);
                this.handleCallMessage(callMessage);
            } catch (error) {
                console.error('Error parsing call message:', error);
            }
        });

        // Public messages
        this.stompClient.subscribe('/topic/public', (message) => {
            try {
                const publicMessage = JSON.parse(message.body);
                if (publicMessage.profilePic && publicMessage.sender !== this.username) {
                    this.userProfiles[publicMessage.sender] = publicMessage.profilePic;
                }
                
                if (publicMessage.type === 'JOIN' || publicMessage.type === 'LEAVE') {
                    this.showSystemMessage(publicMessage.content);
                } else if (publicMessage.sender !== this.username) {
                    if (publicMessage.type === 'FILE') {
                        this.displayFileMessage(publicMessage, false);
                    } else if (publicMessage.type === 'CHAT') {
                        this.showMessage(publicMessage);
                    }
                }
            } catch (error) {
                console.error('Error parsing public message:', error);
            }
        });
        
        // User updates
        this.stompClient.subscribe('/topic/users', (message) => {
            try {
                const userMessage = JSON.parse(message.body);
                if (userMessage.content) {
                    this.activeUsers = userMessage.content.split(',')
                        .filter(user => user && user.trim() !== '' && user !== this.username);
                    this.updateUserList(this.activeUsers);
                }
            } catch (error) {
                console.error('Error parsing user list:', error);
            }
        });
    }

    // Message Handling
    sendMessage() {
        const messageInput = document.getElementById('message');
        const receiverInput = document.getElementById('receiver');
        const messageContent = messageInput.value.trim();
        
        if (!messageContent || !this.stompClient) return;

        const receiver = receiverInput.value.trim() || null;
        
        const chatMessage = {
            sender: this.username,
            content: messageContent,
            type: 'CHAT',
            timestamp: new Date(),
            profilePic: this.userProfilePic,
            ...(receiver && { receiver })
        };
        
        this.stompClient.send("/app/chat.sendMessage", {}, JSON.stringify(chatMessage));
        receiver ? this.displaySentMessage(chatMessage, true) : this.displaySentMessage(chatMessage, false);
        messageInput.value = '';
        this.updateSendButtonState();
    }

    displaySentMessage(message, isPrivate) {
        this.addMessageToChat(message, 'sent', isPrivate);
    }

    showPrivateMessage(message) {
        if (message.type === 'FILE') {
            this.displayFileMessage(message, true);
            return;
        }
        this.addMessageToChat(message, 'received', true);
    }

    showMessage(message) {
        if (message.type === 'JOIN' || message.type === 'LEAVE') {
            this.showSystemMessage(`${message.sender} ${message.type === 'JOIN' ? 'joined' : 'left'} the chat`);
            return;
        }
        if (message.sender !== this.username) {
            this.addMessageToChat(message, 'received', false);
        }
    }

    addMessageToChat(message, type, isPrivate) {
        const chatMessages = document.getElementById('chatMessages');
        const messageElement = document.createElement('div');
        messageElement.className = `message ${type} ${isPrivate ? 'private' : ''}`;
        
        const time = new Date(message.timestamp || new Date()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        const isSent = type === 'sent';
        
        let badgeHtml = '';
        let senderHtml = '';
        
        if (isPrivate) {
            badgeHtml = isSent ? 
                `<div class="private-badge">🔒 Private to ${message.receiver}</div>` :
                `<div class="private-badge">🔒 Private from ${message.sender}</div>`;
        }
        
        if (!isSent) {
            senderHtml = `<div class="message-sender">${message.sender}</div>`;
        }
        
        messageElement.innerHTML = `
            <div class="message-bubble">
                ${senderHtml}
                ${badgeHtml}
                <div class="message-content">${this.escapeHtml(message.content)}</div>
                <div class="message-time">${time}</div>
            </div>
        `;
        
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    showSystemMessage(content) {
        const chatMessages = document.getElementById('chatMessages');
        const messageElement = document.createElement('div');
        messageElement.className = 'message system';
        
        messageElement.innerHTML = `
            <div class="message-bubble">
                <div class="message-content">${this.escapeHtml(content)}</div>
                <div class="message-time">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
            </div>
        `;
        
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // File Handling
    sendFile() {
        if (!this.currentFile || !this.stompClient) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const base64Data = event.target.result.split(',')[1];
            const caption = document.getElementById('fileCaption').value.trim();
            const receiver = document.getElementById('receiver').value.trim() || null;
            
            const fileMessage = {
                sender: this.username,
                content: caption || "",
                type: 'FILE',
                fileName: this.currentFile.name,
                fileType: this.currentFile.type,
                fileSize: this.currentFile.size,
                fileData: base64Data,
                timestamp: new Date().toISOString(),
                profilePic: this.userProfilePic,
                ...(receiver && { receiver })
            };
            
            this.stompClient.send("/app/chat.sendMessage", {}, JSON.stringify(fileMessage));
            receiver ? this.displaySentFile(fileMessage, true) : this.displaySentFile(fileMessage, false);
            this.closeModal();
        };
        
        reader.onerror = (error) => {
            console.error('❌ Error reading file:', error);
            alert('Error reading file. Please try again.');
        };
        
        reader.readAsDataURL(this.currentFile);
    }

    displaySentFile(message, isPrivate) {
        this.addFileMessageToChat(message, 'sent', isPrivate);
    }

    displayFileMessage(message, isPrivate) {
        if (message.sender === this.username && !isPrivate) return;
        if (!message.fileData) {
            this.showSystemMessage(`File "${message.fileName}" could not be loaded`);
            return;
        }

        const isSent = message.sender === this.username;
        this.addFileMessageToChat(message, isSent ? 'sent' : 'received', isPrivate);
    }

    addFileMessageToChat(message, type, isPrivate) {
        const chatMessages = document.getElementById('chatMessages');
        const messageElement = document.createElement('div');
        messageElement.className = `message ${type} ${isPrivate ? 'private' : ''} file-message`;
        
        const time = new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        const isSent = type === 'sent';
        
        let badgeHtml = '';
        let senderHtml = '';
        
        if (isPrivate) {
            badgeHtml = isSent ? 
                `<div class="private-badge">🔒 Private to ${message.receiver}</div>` :
                `<div class="private-badge">🔒 Private from ${message.sender}</div>`;
        }
        
        if (!isSent) {
            senderHtml = `<div class="message-sender">${message.sender}</div>`;
        }
        
        const fileContent = this.createFileContent(message);
        
        messageElement.innerHTML = `
            <div class="message-bubble">
                ${senderHtml}
                ${badgeHtml}
                ${fileContent}
                <div class="message-time">${time}</div>
            </div>
        `;
        
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    createFileContent(message) {
        if (message.fileType.startsWith('image/')) {
            return `
                <div class="file-container">
                    <img src="data:${message.fileType};base64,${message.fileData}" 
                         alt="${message.fileName}" 
                         class="file-image"
                         onclick="chatApp.openImage('data:${message.fileType};base64,${message.fileData}')">
                    ${message.content ? `<div class="file-caption">${this.escapeHtml(message.content)}</div>` : ''}
                </div>
            `;
        } else if (message.fileType.startsWith('video/')) {
            return `
                <div class="file-container">
                    <video controls class="file-video">
                        <source src="data:${message.fileType};base64,${message.fileData}" type="${message.fileType}">
                        Your browser does not support the video tag.
                    </video>
                    ${message.content ? `<div class="file-caption">${this.escapeHtml(message.content)}</div>` : ''}
                </div>
            `;
        } else {
            return `
                <div class="file-container">
                    <div class="file-document">
                        <div class="document-icon">📄</div>
                        <div class="document-info">
                            <div class="document-name">${message.fileName}</div>
                            <div class="document-size">${this.formatFileSize(message.fileSize)}</div>
                        </div>
                        <a href="data:${message.fileType};base64,${message.fileData}" 
                           download="${message.fileName}" 
                           class="download-btn">Download</a>
                    </div>
                    ${message.content ? `<div class="file-caption">${this.escapeHtml(message.content)}</div>` : ''}
                </div>
            `;
        }
    }

    // Audio Call Functions
    async startAudioCall() {
        const receiver = document.getElementById('receiver').value.trim();
        if (!receiver) {
            alert('Please select a user to call');
            return;
        }
        
        if (!this.stompClient || !this.stompClient.connected) {
            alert('Not connected to server');
            return;
        }
        
        document.getElementById('audioCallBtn').disabled = true;
        
        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }, 
                video: false 
            });
            
            this.peerConnection = new RTCPeerConnection(this.pcConfig);
            this.localStream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, this.localStream);
            });
            
            this.peerConnection.ontrack = (event) => {
                console.log('🎵 Remote stream received');
                this.remoteStream = event.streams[0];
                const remoteAudio = new Audio();
                remoteAudio.srcObject = this.remoteStream;
                remoteAudio.play().catch(e => console.log('Remote audio play failed:', e));
            };
            
            this.peerConnection.oniceconnectionstatechange = () => {
                if (this.peerConnection.iceConnectionState === 'disconnected' || 
                    this.peerConnection.iceConnectionState === 'failed') {
                    this.endCall();
                }
            };
            
            this.peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    this.sendCallMessage({
                        type: 'ICE_CANDIDATE',
                        candidate: event.candidate,
                        receiver: receiver
                    });
                }
            };
            
            const offer = await this.peerConnection.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: false
            });
            await this.peerConnection.setLocalDescription(offer);
            
            this.currentCall = {
                receiver: receiver,
                type: 'OUTGOING',
                status: 'CALLING'
            };
            
            this.sendCallMessage({
                type: 'CALL_OFFER',
                offer: offer,
                receiver: receiver
            });
            
            this.showCallModal('outgoing', receiver);
            
        } catch (error) {
            console.error('❌ Error starting call:', error);
            this.handleCallError(error);
            document.getElementById('audioCallBtn').disabled = false;
        }
    }

    handleCallMessage(callMessage) {
        console.log('📞 Call message received:', callMessage);
        
        switch (callMessage.type) {
            case 'CALL_OFFER':
                this.handleIncomingCall(callMessage);
                break;
            case 'CALL_ANSWER':
                this.handleCallAnswer(callMessage);
                break;
            case 'ICE_CANDIDATE':
                this.handleIceCandidate(callMessage);
                break;
            case 'CALL_REJECT':
                this.handleCallReject(callMessage);
                break;
            case 'CALL_END':
                this.handleCallEnd(callMessage);
                break;
        }
    }

    async handleIncomingCall(callMessage) {
        if (this.currentCall) {
            this.sendCallMessage({
                type: 'CALL_REJECT',
                receiver: callMessage.sender,
                reason: 'BUSY'
            });
            return;
        }
        
        this.currentCall = {
            sender: callMessage.sender,
            type: 'INCOMING',
            status: 'RINGING',
            offer: callMessage.offer
        };
        
        this.showCallNotification(callMessage.sender);
        
        setTimeout(() => {
            if (this.currentCall && this.currentCall.status === 'RINGING') {
                this.rejectCall();
            }
        }, 30000);
    }

    async acceptCall() {
        if (!this.currentCall || this.currentCall.type !== 'INCOMING') return;
        
        try {
            this.hideCallNotification();
            
            this.localStream = await navigator.mediaDevices.getUserMedia({ 
                audio: true, 
                video: false 
            });
            
            this.peerConnection = new RTCPeerConnection(this.pcConfig);
            this.localStream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, this.localStream);
            });
            
            this.peerConnection.ontrack = (event) => {
                console.log('🎵 Remote stream received');
                this.remoteStream = event.streams[0];
            };
            
            this.peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    this.sendCallMessage({
                        type: 'ICE_CANDIDATE',
                        candidate: event.candidate,
                        receiver: this.currentCall.sender
                    });
                }
            };
            
            await this.peerConnection.setRemoteDescription(this.currentCall.offer);
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);
            
            this.sendCallMessage({
                type: 'CALL_ANSWER',
                answer: answer,
                receiver: this.currentCall.sender
            });
            
            this.currentCall.status = 'CONNECTED';
            this.showCallModal('incoming', this.currentCall.sender);
            this.startCallTimer();
            
        } catch (error) {
            console.error('❌ Error accepting call:', error);
            alert('Error accepting call: ' + error.message);
            this.endCall();
        }
    }

    async handleCallAnswer(callMessage) {
        if (!this.peerConnection || !this.currentCall) return;
        
        try {
            await this.peerConnection.setRemoteDescription(callMessage.answer);
            this.currentCall.status = 'CONNECTED';
            this.updateCallStatus('Connected');
            this.startCallTimer();
        } catch (error) {
            console.error('Error handling call answer:', error);
            this.endCall();
        }
    }

    async handleIceCandidate(callMessage) {
        if (!this.peerConnection) return;
        
        try {
            await this.peerConnection.addIceCandidate(callMessage.candidate);
        } catch (error) {
            console.error('Error adding ICE candidate:', error);
        }
    }

    rejectCall() {
        if (this.currentCall && this.currentCall.type === 'INCOMING') {
            this.sendCallMessage({
                type: 'CALL_REJECT',
                receiver: this.currentCall.sender,
                reason: 'REJECTED'
            });
        }
        
        this.hideCallNotification();
        this.endCall();
    }

    handleCallReject(callMessage) {
        alert(`Call rejected: ${callMessage.reason}`);
        this.endCall();
    }

    handleCallEnd() {
        alert('Call ended by other user');
        this.endCall();
    }

    endCall() {
        console.log('📞 Ending call');
        
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
        
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }
        
        this.stopCallTimer();
        
        if (this.currentCall && this.currentCall.status === 'CONNECTED') {
            const receiver = this.currentCall.type === 'OUTGOING' ? this.currentCall.receiver : this.currentCall.sender;
            this.sendCallMessage({
                type: 'CALL_END',
                receiver: receiver
            });
        }
        
        this.currentCall = null;
        this.hideCallModal();
        this.hideCallNotification();
        document.getElementById('audioCallBtn').disabled = false;
        document.getElementById('endCallBtn').style.display = 'none';
        document.getElementById('audioCallBtn').style.display = 'inline-block';
    }

    sendCallMessage(callMessage) {
        if (!this.stompClient || !this.stompClient.connected) return;
        
        const message = {
            ...callMessage,
            sender: this.username,
            timestamp: new Date().toISOString()
        };
        
        this.stompClient.send("/app/call.sendMessage", {}, JSON.stringify(message));
    }

    toggleMute() {
        if (!this.localStream) return;
        
        const audioTracks = this.localStream.getAudioTracks();
        if (audioTracks.length > 0) {
            this.isMuted = !this.isMuted;
            audioTracks[0].enabled = !this.isMuted;
            
            const muteBtn = document.getElementById('muteCallBtn');
            muteBtn.innerHTML = this.isMuted ? 
                '<span>🔇</span><span>Unmute</span>' : 
                '<span>🎤</span><span>Mute</span>';
            muteBtn.classList.toggle('muted', this.isMuted);
        }
    }

    // Call UI Functions
    showCallModal(type, user) {
        const modal = document.getElementById('callModal');
        const title = document.getElementById('callTitle');
        const status = document.getElementById('callStatus');
        const acceptBtn = document.getElementById('acceptCallBtn');
        const rejectBtn = document.getElementById('rejectCallBtn');
        const endBtn = document.getElementById('endCallBtnModal');
        const muteBtn = document.getElementById('muteCallBtn');
        
        document.getElementById('callerName').textContent = user;
        this.updateCallAvatar(user);
        
        if (type === 'outgoing') {
            title.textContent = 'Calling...';
            status.textContent = 'Calling ' + user;
            acceptBtn.style.display = 'none';
            rejectBtn.style.display = 'flex';
            endBtn.style.display = 'none';
            muteBtn.style.display = 'none';
            document.getElementById('endCallBtn').style.display = 'inline-block';
            document.getElementById('audioCallBtn').style.display = 'none';
        } else {
            title.textContent = 'In Call';
            status.textContent = 'Connected with ' + user;
            acceptBtn.style.display = 'none';
            rejectBtn.style.display = 'none';
            endBtn.style.display = 'flex';
            muteBtn.style.display = 'flex';
            document.getElementById('endCallBtn').style.display = 'inline-block';
            document.getElementById('audioCallBtn').style.display = 'none';
        }
        
        modal.style.display = 'block';
    }

    hideCallModal() {
        document.getElementById('callModal').style.display = 'none';
    }

    showCallNotification(caller) {
        const notification = document.getElementById('callNotification');
        document.getElementById('notificationCaller').textContent = caller;
        notification.style.display = 'block';
    }

    hideCallNotification() {
        document.getElementById('callNotification').style.display = 'none';
    }

    updateCallStatus(status) {
        document.getElementById('callStatus').textContent = status;
    }

    updateCallAvatar(user) {
        const avatar = document.getElementById('callAvatar');
        if (this.userProfiles[user]) {
            avatar.innerHTML = `<img src="${this.userProfiles[user]}" alt="${user}">`;
        } else {
            avatar.innerHTML = `<div class="profile-placeholder">${user.charAt(0).toUpperCase()}</div>`;
        }
    }

    startCallTimer() {
        this.callStartTime = new Date();
        this.callTimer = setInterval(() => this.updateCallTimer(), 1000);
    }

    stopCallTimer() {
        if (this.callTimer) {
            clearInterval(this.callTimer);
            this.callTimer = null;
        }
        this.callStartTime = null;
        document.getElementById('callTimer').textContent = '00:00';
    }

    updateCallTimer() {
        if (!this.callStartTime) return;
        
        const now = new Date();
        const diff = Math.floor((now - this.callStartTime) / 1000);
        const minutes = Math.floor(diff / 60).toString().padStart(2, '0');
        const seconds = (diff % 60).toString().padStart(2, '0');
        
        document.getElementById('callTimer').textContent = `${minutes}:${seconds}`;
    }

    handleCallError(error) {
        let userMessage = 'Call setup failed. ';
        
        if (error.name === 'NotAllowedError') {
            userMessage += 'Microphone access was denied. Please allow microphone access and try again.';
        } else if (error.name === 'NotFoundError') {
            userMessage += 'No microphone found. Please check your audio devices.';
        } else if (error.name === 'NotSupportedError') {
            userMessage += 'WebRTC is not supported in your browser.';
        } else {
            userMessage += error.message;
        }
        
        alert(userMessage);
        this.endCall();
    }

    // UI Management
    joinChat() {
        if (this.stompClient && this.stompClient.connected) {
            const joinMessage = {
                sender: this.username,
                type: 'JOIN'
            };
            
            this.stompClient.send("/app/chat.addUser", {}, JSON.stringify(joinMessage));
            
            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('sidebar').style.display = 'flex';
            document.getElementById('chatArea').style.display = 'flex';
            document.getElementById('message').focus();
        }
    }

    updateUserList(users) {
        const userList = document.getElementById('userList');
        const noUsers = document.getElementById('noUsers');
        const usersCount = document.getElementById('usersCount');
        
        userList.innerHTML = '';
        usersCount.textContent = `(${users.length})`;
        
        if (users.length === 0) {
            noUsers.style.display = 'block';
            return;
        }
        
        noUsers.style.display = 'none';
        
        users.forEach(user => {
            const userItem = document.createElement('li');
            userItem.className = 'user-item';
            
            const userAvatar = this.userProfiles[user] ? 
                `<img src="${this.userProfiles[user]}" alt="${user}">` : 
                `<div class="profile-placeholder">${user.charAt(0).toUpperCase()}</div>`;
            
            userItem.innerHTML = `
                <div class="user-avatar">
                    ${userAvatar}
                </div>
                <div class="user-info">
                    <div class="user-name">${user}</div>
                    <div class="user-status">Online</div>
                </div>
            `;
            
            userItem.addEventListener('click', () => {
                this.switchToPrivateChat(user);
            });
            
            userList.appendChild(userItem);
        });
    }

    switchToPrivateChat(user) {
        this.currentChatType = 'private';
        this.currentPrivateChatUser = user;
        
        document.getElementById('receiver').value = user;
        document.getElementById('privateChatBtn').classList.add('active');
        document.getElementById('publicChatBtn').classList.remove('active');
        
        this.updateChatHeader(user);
        
        document.querySelectorAll('.user-item').forEach(item => {
            item.classList.remove('private-active');
            if (item.querySelector('.user-name').textContent === user) {
                item.classList.add('private-active');
            }
        });
        
        this.clearChatMessages();
        this.showSystemMessage(`Started private chat with ${user}`);
    }

    switchToPublicChat() {
        this.currentChatType = 'public';
        this.currentPrivateChatUser = null;
        
        document.getElementById('receiver').value = '';
        document.getElementById('receiver').placeholder = 'To: (Public)';
        this.updateChatHeader(null);
        
        document.getElementById('publicChatBtn').classList.add('active');
        document.getElementById('privateChatBtn').classList.remove('active');
        
        document.querySelectorAll('.user-item').forEach(item => {
            item.classList.remove('private-active');
        });
        
        this.clearChatMessages();
        this.showSystemMessage('Welcome to public chat! Start by sending a message.');
    }

    updateChatHeader(receiver) {
        const chatHeaderAvatar = document.getElementById('chatHeaderAvatar');
        
        if (!receiver) {
            document.getElementById('chatWith').textContent = 'Public Chat';
            document.getElementById('chatType').textContent = 'Everyone can see these messages';
            chatHeaderAvatar.innerHTML = '<div class="profile-placeholder">G</div>';
        } else {
            document.getElementById('chatWith').textContent = `Private Chat with ${receiver}`;
            document.getElementById('chatType').textContent = 'Only you and ' + receiver + ' can see these messages';
            
            chatHeaderAvatar.innerHTML = '';
            if (this.userProfiles[receiver]) {
                const img = document.createElement('img');
                img.src = this.userProfiles[receiver];
                chatHeaderAvatar.appendChild(img);
            } else {
                chatHeaderAvatar.innerHTML = `<div class="profile-placeholder">${receiver.charAt(0).toUpperCase()}</div>`;
            }
        }
    }

    clearChatMessages() {
        document.getElementById('chatMessages').innerHTML = '';
    }

    // Profile Picture
    handleProfileUpload(e) {
        if (e.target.files.length > 0) {
            const file = e.target.files[0];
            if (file.size > 100 * 1024) {
                alert('Profile picture must be less than 100KB');
                return;
            }
            
            const reader = new FileReader();
            reader.onload = (event) => {
                this.userProfilePic = event.target.result;
                this.userProfiles[this.username] = this.userProfilePic;
                const preview = document.getElementById('profilePreview');
                preview.innerHTML = `<img src="${this.userProfilePic}" alt="Profile Preview">`;
                localStorage.setItem('userProfilePic', this.userProfilePic);
            };
            reader.readAsDataURL(file);
        }
    }

    loadProfilePicture() {
        const savedProfilePic = localStorage.getItem('userProfilePic');
        if (savedProfilePic) {
            this.userProfilePic = savedProfilePic;
            const preview = document.getElementById('profilePreview');
            preview.innerHTML = `<img src="${savedProfilePic}" alt="Profile Preview">`;
        }
    }

    updateCurrentUserAvatar() {
        const avatar = document.getElementById('currentUserAvatar');
        if (this.userProfilePic) {
            avatar.innerHTML = `<img src="${this.userProfilePic}" alt="${this.username}">`;
        } else {
            avatar.innerHTML = `<div class="profile-placeholder">${this.username.charAt(0).toUpperCase()}</div>`;
        }
    }

    // File Preview
    showFilePreview(file) {
        const preview = document.getElementById('filePreview');
        const modal = document.getElementById('filePreviewModal');
        
        preview.innerHTML = '';
        document.getElementById('fileCaption').value = '';
        
        if (file.type.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            img.className = 'file-preview-image';
            preview.appendChild(img);
        } else if (file.type.startsWith('video/')) {
            const video = document.createElement('video');
            video.src = URL.createObjectURL(file);
            video.controls = true;
            video.className = 'file-preview-video';
            preview.appendChild(video);
        } else {
            const docDiv = document.createElement('div');
            docDiv.className = 'file-preview-document';
            docDiv.innerHTML = `
                <div style="font-size: 48px; margin-bottom: 10px;">📄</div>
                <div class="file-info">
                    <div class="file-name" style="font-weight: bold;">${file.name}</div>
                    <div class="file-size" style="color: #666;">${this.formatFileSize(file.size)}</div>
                </div>
            `;
            preview.appendChild(docDiv);
        }
        
        modal.style.display = 'block';
    }

    closeModal() {
        document.getElementById('filePreviewModal').style.display = 'none';
        document.getElementById('fileUpload').value = '';
        this.currentFile = null;
    }

    openImage(src) {
        window.open(src, '_blank');
    }

    // Utility Functions
    updateConnectionStatus(message, status) {
        const statusDiv = document.getElementById('connectionStatus');
        const statusText = document.getElementById('connectionStatusText');
        
        statusDiv.textContent = message;
        statusDiv.className = 'connection-status ' + status;
        
        if (statusText) {
            statusText.textContent = message.replace('✅ ', '').replace('❌ ', '').replace('🔄 ', '');
            statusText.className = 'user-status ' + status;
        }
    }

    updateSendButtonState() {
        const messageInput = document.getElementById('message');
        const sendBtn = document.getElementById('sendBtn');
        sendBtn.disabled = !messageInput.value.trim();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    handlePageUnload() {
        if (this.stompClient && this.username) {
            this.stompClient.send("/app/chat.leave", {}, 
                JSON.stringify({
                    sender: this.username,
                    type: 'LEAVE'
                })
            );
            this.stompClient.disconnect();
        }
    }
}

// Initialize the application
const chatApp = new ChatApplication();