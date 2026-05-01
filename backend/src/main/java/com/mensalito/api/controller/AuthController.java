package com.mensalito.api.controller;

import com.mensalito.api.dto.request.LoginRequestDTO;
import com.mensalito.api.dto.request.RegisterRequestDTO;
import com.mensalito.api.dto.response.LoginResponseDTO;
import com.mensalito.api.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<LoginResponseDTO> register(@RequestBody @Valid RegisterRequestDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(dto));
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponseDTO> login(
            @RequestBody @Valid LoginRequestDTO dto,
            HttpServletRequest request) {
        String clientIp = getClientIp(request);
        return ResponseEntity.ok(authService.login(dto, clientIp));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@RequestHeader("Authorization") String authHeader) {
        String token = authHeader.substring(7);
        authService.logout(token);
        return ResponseEntity.noContent().build();
    }

    /**
     * Retorna quantas tentativas ainda restam para o IP atual.
     */
    @GetMapping("/login-attempts")
    public ResponseEntity<Map<String, Long>> getLoginAttempts(HttpServletRequest request) {
        String clientIp = getClientIp(request);
        Long remaining = authService.getRemainingAttempts(clientIp);
        return ResponseEntity.ok(Map.of("remainingAttempts", remaining));
    }

    /**
     * Desbloqueia um IP específico. Requer token de OWNER.
     */
    @DeleteMapping("/login-attempts/{ip}")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<Void> unlockIp(@PathVariable String ip) {
        authService.unlockIp(ip);
        return ResponseEntity.noContent().build();
    }

    /**
     * Desbloqueia o próprio IP sem precisar de token.
     * Protegido por um segredo de admin definido em ADMIN_SECRET no .env.
     * Útil quando você se bloqueou e não tem token disponível.
     *
     * Exemplo: POST /api/auth/unlock
     * Body: { "secret": "meu-segredo-admin" }
     */
    @PostMapping("/unlock")
    public ResponseEntity<Void> unlockMe(
            @RequestBody Map<String, String> body,
            HttpServletRequest request) {
        String clientIp = getClientIp(request);
        String secret = body.get("secret");
        authService.unlockIpWithSecret(clientIp, secret);
        return ResponseEntity.noContent().build();
    }

    private String getClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        String ip = request.getRemoteAddr();
        if ("0:0:0:0:0:0:0:1".equals(ip) || "::1".equals(ip)) {
            return "127.0.0.1";
        }
        return ip;
    }
}