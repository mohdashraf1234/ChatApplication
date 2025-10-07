# ChatApp - Real-time Chat & Audio Calling Application

![Java](https://img.shields.io/badge/Java-17-orange)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.0-green)
![WebSocket](https://img.shields.io/badge/WebSocket-STOMP-yellow)
![License](https://img.shields.io/badge/License-MIT-blue)

A full-stack real-time chat application with Audio calling capabilities built with Spring Boot and WebSocket.

##  Features

###  Real-time Chat
- **Public & Private Messaging** - Chat in public rooms or send private messages
- **File Sharing** - Share files with other users
- **User Presence** - See who's online in real-time
- **Typing Indicators** - Know when someone is typing
- **Message History** - View chat history with timestamps

###  Audio & Audio Calling
- **WebRTC Integration** - Peer-to-peer video/audio calls
- **Call Management** - Offer, answer, reject, and end calls
- **ICE Candidate Exchange** - NAT traversal for direct connections
- **Real-time Signaling** - WebSocket-based call signaling

##  Quick Start

### Prerequisites
- Java 17
- spring boot
- Thymeleaf
- Maven 3.6+
- Modern web browser with WebRTC support

### Installation & Run

```bash
# Clone the repository
git clone https://github.com/mohdashraf1234/chatapp.git
cd chatapp

# Build the project
mvn clean install

# Run the application
mvn spring-boot:run
```

Access the application at: `http://localhost:8080`

## Project Structure

```
chatapp/
├── src/main/java/com/chatapp/
│   ├── config/
│   │   ├── CorsConfig.java
│   │   ├── SecurityConfig.java
│   │   └── WebSocketConfig.java
│   ├── controller/
│   │   ├── CallController.java
│   │   ├── ChatController.java
│   │   └── PageController.java
│   └── model/
│       ├── CallMessage.java
│       ├── ChatMessage.java
│       └── MessageType1.java
├── src/main/resources/
│   └── templates/
│       └── index.html
└── pom.xml
```

##  API Endpoints

### WebSocket Connections
- **STOMP Endpoint**: `/chat-websocket`
- **Message Mapping**: `/app/chat.*`, `/app/call.*`

### Message Topics
- `/topic/public` - Public messages
- `/topic/users` - User list updates  
- `/queue/private` - Private messages
- `/queue/call` - Call signaling

##  Configuration

### Key Configurations
```java
// CORS Settings
.allowedOrigins("http://localhost:8082", "http://localhost:8080")
.allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")

// WebSocket Settings
.setAllowedOriginPatterns("*")
.setStreamBytesLimit(50 * 1024 * 1024)
```

## Usage

### Starting a Chat
1. Open `http://localhost:8080`
2. Enter your username
3. Start chatting publicly or privately

### Making Calls
1. Select user from online list
2. Click call button
3. Accept/reject calls as needed

### File Sharing and videos
1. Click attachment button
2. Select file
3. Send with optional caption

   

##  Deployment

### Production Build
```bash
mvn clean package
java -jar target/chatapp-1.0.0.jar
```

##  Troubleshooting

### Common Issues
- **WebSocket fails**: Check port 8080 availability
- **Calls not working**: Ensure HTTPS in production
- **File upload fails**: Check file size limits

##  Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/feature-name`)
3. Commit changes (`git commit -m 'Add feature'`)
4. Push to branch (`git push origin feature/feature-name`)
5. Open Pull Request

##  License

This project is licensed under the MIT License - see LICENSE file for details.


<img width="1215" height="592" alt="chat1 1" src="https://github.com/user-attachments/assets/b0fe7170-5875-41c3-8921-a332cc62b962" />
<img width="1041" height="584" alt="chat1 2" src="https://github.com/user-attachments/assets/e9902f9d-1b0d-4930-8c43-42178a760741" />
<img width="1238" height="569" alt="chat1 4" src="https://github.com/user-attachments/assets/7bf8945b-5c78-4053-bd13-478508473676" />
<img width="1366" height="678" alt="chat1 5" src="https://github.com/user-attachments/assets/f11aee2f-2d40-4eb4-b212-c4570e87a2ef" />
<img width="1366" height="683" alt="chat1 6" src="https://github.com/user-attachments/assets/227c3f17-41ca-4a59-b63c-3fb267ebfbcf" />
<img width="1359" height="676" alt="chat1 7" src="https://github.com/user-attachments/assets/9dfd7252-ce26-4688-860f-38aed7aeca25" />
<img width="1359" height="676" alt="chat1 8" src="https://github.com/user-attachments/assets/b2ebd5bc-1775-401c-84dc-843a4df53cdd" />
<img width="1346" height="655" alt="chat1 9" src="https://github.com/user-attachments/assets/83a041c7-5f25-49a5-a89a-ff6a8df77cb7" />











## 👨‍💻 Developer

**Mohd Ashraf**
- 📧 mohd36089@gmail.com
- 💼 [LinkedIn](https://www.linkedin.com/in/mohd-ashraff/)
- 🔗 [GitHub](https://github.com/mohdashraf1234)

---

<div align="center">

**If you find this project helpful, please give it a star!**

</div>
