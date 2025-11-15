package com.example.handserver.controller;

import com.example.handserver.model.HandStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.MediaType;
import java.util.concurrent.atomic.AtomicReference;

@RestController
public class HandController {

    private final AtomicReference<HandStatus> latest = new AtomicReference<>(new HandStatus());

    @GetMapping(path = "/hand_status", produces = MediaType.APPLICATION_JSON_VALUE)
    public HandStatus getStatus() {
        return latest.get();
    }

    @PostMapping(path = "/hand_status_update", consumes = MediaType.APPLICATION_JSON_VALUE)
    public String updateStatus(@RequestBody HandStatus status) {
        latest.set(status);
        return "{\"status\":\"ok\"}";
    }
}
