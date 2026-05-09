package com.mensalito.api.controller;

import com.mensalito.api.dto.request.LoginRequestDTO;
import com.mensalito.api.dto.request.RegisterRequestDTO;
import com.mensalito.api.dto.response.LoginResponseDTO;
import com.mensalito.api.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
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

    @PostMapping("/register")
    public ResponseEntity<LoginResponseDTO> register(@RequestBody @Valid RegisterRequestDTO dto) {
        // 1. Cadastra tenant + user em transação própria
        LoginResponseDTO response = authService.register(dto);

        // 2. Provisiona instância Evolution APÓS o commit — falha aqui NÃO afeta o cadastro
        try {
            authService.provisionEvolutionInstanceAfterRegister(response.tenantId(), dto.schoolName());
        } catch (Exception e) {
            log.warn("[AuthController] Falha ao provisionar Evolution (não bloqueia cadastro): {}", e.getMessage());
        }

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
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

    @GetMapping("/login-attempts")
    public ResponseEntity<Map<String, Long>> getLoginAttempts(HttpServletRequest request) {
        String clientIp = getClientIp(request);
        Long remaining = authService.getRemainingAttempts(clientIp);
        return ResponseEntity.ok(Map.of("remainingAttempts", remaining));
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
        String secret = body.get("secret");
        authService.unlockIpWithSecret(clientIp, secret);
        return ResponseEntity.noContent().build();
    }

    private static final String TRUSTED_PROXY_HEADER = "X-Forwarded-For";

    private String getClientIp(HttpServletRequest request) {
        String remoteAddr = request.getRemoteAddr();
        boolean isLoopback = "127.0.0.1".equals(remoteAddr)
                || "0:0:0:0:0:0:0:1".equals(remoteAddr)
                || "::1".equals(remoteAddr);

        if (isLoopback || authService.isTrustedProxy(remoteAddr)) {
            String forwarded = request.getHeader(TRUSTED_PROXY_HEADER);
            if (forwarded != null && !forwarded.isBlank()) {
                // Pega o primeiro IP da cadeia (o cliente original)
                return forwarded.split(",")[0].trim();
            }
        }

        return "127.0.0.1".equals(remoteAddr) ? remoteAddr
                : ("0:0:0:0:0:0:0:1".equals(remoteAddr) || "::1".equals(remoteAddr)) ? "127.0.0.1"
                : remoteAddr;
    }
}
