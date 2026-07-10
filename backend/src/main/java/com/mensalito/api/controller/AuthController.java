package com.mensalito.api.controller;

import com.mensalito.api.dto.response.UserResponseDTO;
import com.mensalito.api.model.User;
import com.mensalito.api.service.AuthService;
import com.mensalito.api.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;


@Slf4j
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final UserService userService;

    /**
     * Chamado pelo frontend logo após o usuário confirmar o email no Supabase
     * e receber o token. Cria (ou retorna) o Tenant e User local.
     *
     *
     * Body esperado:
     * {
     *   "email":          "<email do usuário>",
     *   "name":           "<nome do usuário>",
     *   "schoolName":     "<nome da escola>",       // opcional
     *   "schoolPhone":    "<telefone da escola>",    // opcional
     *   "schoolDocument": "<CNPJ/CPF da escola>"    // opcional
     * }
     */
    @PostMapping("/provision")
    public ResponseEntity<UserResponseDTO> provision(
            @RequestBody Map<String, String> body) {

        String email          = body.get("email");
        String name           = body.get("name");
        String schoolName     = body.get("schoolName");
        String schoolPhone    = body.get("schoolPhone");
        String schoolDocument = body.get("schoolDocument");

        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        User user = authService.provisionLocalUser(email, name, schoolName, schoolPhone, schoolDocument);
        return ResponseEntity.ok(userService.toResponse(user));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@RequestHeader("Authorization") String authHeader) {
        authService.logout(authHeader.substring(7));
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/login-attempts/{ip}")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<Void> unlockIp(@PathVariable String ip) {
        authService.unlockIp(ip);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/unlock")
    public ResponseEntity<Void> unlockMe(
            @RequestBody Map<String, String> body,
            HttpServletRequest request) {
        String clientIp = getClientIp(request);
        authService.unlockIpWithSecret(clientIp, body.get("secret"));
        return ResponseEntity.noContent().build();
    }

    private String getClientIp(HttpServletRequest request) {
        String remoteAddr = request.getRemoteAddr();
        boolean isLoopback = "127.0.0.1".equals(remoteAddr)
                || "0:0:0:0:0:0:0:1".equals(remoteAddr)
                || "::1".equals(remoteAddr);
        if (isLoopback || authService.isTrustedProxy(remoteAddr)) {
            String forwarded = request.getHeader("X-Forwarded-For");
            if (forwarded != null && !forwarded.isBlank()) {
                return forwarded.split(",")[0].trim();
            }
        }
        return remoteAddr;
    }
}
