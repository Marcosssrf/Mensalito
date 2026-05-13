package com.mensalito.api.controller;

import com.mensalito.api.dto.request.InviteRequestDTO;
import com.mensalito.api.dto.response.InvitePreviewResponseDTO;
import com.mensalito.api.dto.response.InviteResponseDTO;
import com.mensalito.api.service.InviteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

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

    /**
     * Aceita o convite — usuário já deve estar autenticado via Supabase.
     * Fluxo: frontend registra no Supabase → confirma email → chama este endpoint com o token JWT.
     *
     * Body esperado:
     * {
     *   "token": "<invite-token>",
     *   "email": "<email do usuário autenticado>",
     *   "name": "<nome do usuário>"
     * }
     */
    @PostMapping("/accept")
    public ResponseEntity<Void> accept(@RequestBody Map<String, String> body) {
        String token = body.get("token");
        String email = body.get("email");
        String name  = body.get("name");

        if (token == null || token.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        inviteService.acceptInvite(token, email, name != null ? name : "");
        return ResponseEntity.ok().build();
    }
}
