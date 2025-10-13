package com.chatapp.controller;

import com.chatapp.model.ChatMessage;
import com.chatapp.model.MessageType1;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Controller
public class ChatController {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;
    
    private final Set<String> activeUsers = ConcurrentHashMap.newKeySet();

    @MessageMapping("/chat.sendMessage")
    public void sendMessage(@Payload ChatMessage chatMessage, SimpMessageHeaderAccessor headerAccessor) {
        chatMessage.setTimestamp(LocalDateTime.now());
        
        System.out.println("=== SENDING MESSAGE ===");
        System.out.println("Sender: " + chatMessage.getSender());
        System.out.println("Receiver: " + chatMessage.getReceiver());
        System.out.println("Content: " + chatMessage.getContent());
        System.out.println("Type: " + chatMessage.getType());
        
        String sender = chatMessage.getSender();
        String receiver = chatMessage.getReceiver();
        
        
        if (!activeUsers.contains(sender)) {
            System.out.println("ERROR: Sender " + sender + " not in active users!");
            return;
        }

        if (receiver == null || receiver.trim().isEmpty()) {
           
            System.out.println("Sending PUBLIC message to /topic/public");
            messagingTemplate.convertAndSend("/topic/public", chatMessage);
        } else {
           
            if (!activeUsers.contains(receiver)) {
                System.out.println("ERROR: Receiver " + receiver + " not in active users!");
                System.out.println("Active users: " + activeUsers);
                return;
            }
            
            System.out.println("Sending PRIVATE message from " + sender + " to " + receiver);
            
            // Send to receiver
            messagingTemplate.convertAndSendToUser(receiver, "/queue/private", chatMessage);
            System.out.println("Sent to receiver: " + receiver);
            
           
            messagingTemplate.convertAndSendToUser(sender, "/queue/private", chatMessage);
            System.out.println("Sent to sender: " + sender);
            
          
            System.out.println("DEBUG: Also sending as public for testing");
            ChatMessage debugMessage = new ChatMessage();
            debugMessage.setSender(sender);
            debugMessage.setContent("" + chatMessage.getContent());
            debugMessage.setType(MessageType1.CHAT);
            debugMessage.setTimestamp(LocalDateTime.now());
            messagingTemplate.convertAndSend("/topic/public", debugMessage);
        }
        System.out.println("=== MESSAGE SENT ===");
    }
    
    
    

    @MessageMapping("/chat.addUser")
    public void addUser(@Payload ChatMessage chatMessage, SimpMessageHeaderAccessor headerAccessor) {
        String username = chatMessage.getSender();
        
        System.out.println("=== USER JOINING ===");
        System.out.println("Username: " + username);
        
        if (username != null && !username.trim().isEmpty()) {
            headerAccessor.getSessionAttributes().put("username", username);
            
            if (activeUsers.add(username)) {
                System.out.println("User added: " + username);
                System.out.println("Active users now: " + activeUsers);
                
                
                ChatMessage joinMessage = new ChatMessage();
                joinMessage.setType(MessageType1.JOIN);
                joinMessage.setSender(username);
                joinMessage.setContent(username + " joined the chat");
                joinMessage.setTimestamp(LocalDateTime.now());
                
                messagingTemplate.convertAndSend("/topic/public", joinMessage);
                System.out.println("Join notification sent");
                
          
                updateActiveUsers();
            } else {
                System.out.println("User already exists: " + username);
            }
        }
        System.out.println("=== USER JOINED ===");
    }

    @MessageMapping("/chat.leave")
    public void leaveUser(@Payload ChatMessage chatMessage, SimpMessageHeaderAccessor headerAccessor) {
        String username = chatMessage.getSender();
        
        System.out.println("=== USER LEAVING ===");
        System.out.println("Username: " + username);
        
        if (username != null && activeUsers.remove(username)) {
            System.out.println("User removed: " + username);
            System.out.println("Active users now: " + activeUsers);
            
            ChatMessage leaveMessage = new ChatMessage();
            leaveMessage.setType(MessageType1.LEAVE);
            leaveMessage.setSender(username);
            leaveMessage.setContent(username + " left the chat");
            leaveMessage.setTimestamp(LocalDateTime.now());
            
            messagingTemplate.convertAndSend("/topic/public", leaveMessage);
            System.out.println("Leave notification sent");
            
            updateActiveUsers();
        }
        System.out.println("=== USER LEFT ===");
    }


    @MessageMapping("/chat.file")
    public void sendFile(@Payload ChatMessage chatMessage) {
        chatMessage.setTimestamp(LocalDateTime.now());
        chatMessage.setType(MessageType1.FILE);

        String sender = chatMessage.getSender();
        String receiver = chatMessage.getReceiver();

        System.out.println("=== SENDING FILE MESSAGE ===");
        System.out.println("Sender: " + sender);
        System.out.println("Receiver: " + receiver);
        System.out.println("File Name: " + chatMessage.getFileName());
        System.out.println("File Type: " + chatMessage.getFileType());
        System.out.println("File Size: " + chatMessage.getFileSize());
        System.out.println("Content/Caption: " + chatMessage.getContent());

      
        if (!activeUsers.contains(sender)) {
            System.out.println("ERROR: Sender " + sender + " not in active users!");
            return;
        }

        if (receiver == null || receiver.trim().isEmpty()) {
           
            System.out.println("Sending PUBLIC FILE to /topic/public");
            messagingTemplate.convertAndSend("/topic/public", chatMessage);
            System.out.println("Public file sent by " + sender);
        } else {
            
            if (!activeUsers.contains(receiver)) {
                System.out.println("ERROR: Receiver " + receiver + " not in active users!");
                System.out.println("Active users: " + activeUsers);
                return;
            }
            
            System.out.println("Sending PRIVATE FILE from " + sender + " to " + receiver);
            
         
            messagingTemplate.convertAndSendToUser(receiver, "/queue/private", chatMessage);
            System.out.println("File sent to receiver: " + receiver);
            
            messagingTemplate.convertAndSendToUser(sender, "/queue/private", chatMessage);
            System.out.println("File sent to sender: " + sender);
            
   
            System.out.println("DEBUG: Also sending file notification as public");
            ChatMessage debugMessage = new ChatMessage();
            debugMessage.setSender(sender);
            debugMessage.setContent("[FILE to " + receiver + "]: " + (chatMessage.getContent() != null ? chatMessage.getContent() : chatMessage.getFileName()));
            debugMessage.setType(MessageType1.CHAT);
            debugMessage.setTimestamp(LocalDateTime.now());
            messagingTemplate.convertAndSend("/topic/public", debugMessage);
            
            System.out.println("Private file sent from " + sender + " to " + receiver);
        }
        System.out.println("=== FILE MESSAGE SENT ===");
    }

    private void updateActiveUsers() {
        System.out.println("=== UPDATING USER LIST ===");
        System.out.println("Current active users: " + activeUsers);
        
        ChatMessage userListMessage = new ChatMessage();
        userListMessage.setType(MessageType1.USERS);
        userListMessage.setSender("System");
        userListMessage.setContent(String.join(",", activeUsers));
        userListMessage.setTimestamp(LocalDateTime.now());
        
        messagingTemplate.convertAndSend("/topic/users", userListMessage);
        System.out.println("User list updated and sent");
        System.out.println("=== USER LIST UPDATED ===");
    }

}
