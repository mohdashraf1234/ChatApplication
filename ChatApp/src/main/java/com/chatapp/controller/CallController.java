package com.chatapp.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import com.chatapp.model.CallMessage;

@Controller
public class CallController {
    
    @Autowired
    private SimpMessagingTemplate messagingTemplate;
    
  
    
    @MessageMapping("/call.sendMessage")
    public void handleCallMessage(CallMessage incomingCallMessage) { 
        try {
            System.out.println("=== CALL MESSAGE RECEIVED ===");
            System.out.println("Type: " + incomingCallMessage.getType());
            System.out.println("From: " + incomingCallMessage.getSender());
            System.out.println("To: " + incomingCallMessage.getReceiver());
            System.out.println("Timestamp: " + incomingCallMessage.getTimestamp());
            
            // Validate required fields
            if (incomingCallMessage.getReceiver() == null || incomingCallMessage.getReceiver().trim().isEmpty()) {
                System.err.println(" Call message missing receiver");
                return;
            }
            
            if (incomingCallMessage.getSender() == null || incomingCallMessage.getSender().trim().isEmpty()) {
                System.err.println(" Call message missing sender");
                return;
            }
            
            // Send to specific user
            messagingTemplate.convertAndSendToUser(
                incomingCallMessage.getReceiver(),
                "/queue/call",
                incomingCallMessage
            );
            
            System.out.println(" Call message forwarded to: " + incomingCallMessage.getReceiver());
            
        } catch (Exception e) {
            System.err.println(" Error handling call message: " + e.getMessage());
            e.printStackTrace();
        }
    }
}