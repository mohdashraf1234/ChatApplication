package com.chatapp.model;

public class CallMessage {
    private String type; // CALL_OFFER, CALL_ANSWER, ICE_CANDIDATE, CALL_REJECT, CALL_END
    private String sender;
    private String receiver;
    private Object offer;
    private Object answer;
    private Object candidate;
    private String reason;
    private String timestamp;
    

    public CallMessage() {}
    
    public CallMessage(String type, String sender, String receiver) {
        this.type = type;
        this.sender = sender;
        this.receiver = receiver;
        this.timestamp = java.time.LocalDateTime.now().toString();
    }
    

    public String getType() {
        return type;
    }
    
    public void setType(String type) {
        this.type = type;
    }
    
    public String getSender() {
        return sender;
    }
    
    public void setSender(String sender) {
        this.sender = sender;
    }
    
    public String getReceiver() {
        return receiver;
    }
    
    public void setReceiver(String receiver) {
        this.receiver = receiver;
    }
    
    public Object getOffer() {
        return offer;
    }
    
    public void setOffer(Object offer) {
        this.offer = offer;
    }
    
    public Object getAnswer() {
        return answer;
    }
    
    public void setAnswer(Object answer) {
        this.answer = answer;
    }
    
    public Object getCandidate() {
        return candidate;
    }
    
    public void setCandidate(Object candidate) {
        this.candidate = candidate;
    }
    
    public String getReason() {
        return reason;
    }
    
    public void setReason(String reason) {
        this.reason = reason;
    }
    
    public String getTimestamp() {
        return timestamp;
    }
    
    public void setTimestamp(String timestamp) {
        this.timestamp = timestamp;
    }
    

    @Override
    public String toString() {
        return "CallMessage{" +
                "type='" + type + '\'' +
                ", sender='" + sender + '\'' +
                ", receiver='" + receiver + '\'' +
                ", timestamp='" + timestamp + '\'' +
                '}';
    }
}