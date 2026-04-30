package com.mensalito.api.controller;

import com.mensalito.api.dto.request.InviteRequestDTO;
import com.mensalito.api.dto.request.RegisterWithInviteRequestDTO;
import com.mensalito.api.dto.response.InvitePreviewResponseDTO;
import com.mensalito.api.dto.response.InviteResponseDTO;
import com.mensalito.api.dto.response.LoginResponseDTO;
import com.mensalito.api.service.InviteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/invites")
@RequiredArgsConstructor
public class InviteController {

    private final InviteService inviteService;

    @PreAuthorize("hasRole('OWNER')")
    @PostMapping
    public ResponseEntity<InviteResponseDTO> createInvite(@RequestBody @Valid InviteRequestDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(inviteService.createInvite(dto));
    }

    @GetMapping("/{token}/preview")
    public ResponseEntity<InvitePreviewResponseDTO> preview(@PathVariable String token) {
        return ResponseEntity.ok(inviteService.previewInvite(token));
    }

    // Rejeita se já estiver autenticado (owner/teacher não podem aceitar convite)
    @PostMapping("/accept")
    public ResponseEntity<LoginResponseDTO> accept(@RequestBody @Valid RegisterWithInviteRequestDTO dto,
                                                   Authentication authentication) {
        if (authentication != null && authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(inviteService.registerWithInvite(dto));
    }
}