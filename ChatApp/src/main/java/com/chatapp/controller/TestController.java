package com.chatapp.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class TestController {

    @GetMapping("/api/test")
    public String test() {
        return "Server is running!";
    }
    
    @GetMapping("/api/check-files")
    public String checkFiles() {
        return "CSS and JS files should be accessible";
    }
}