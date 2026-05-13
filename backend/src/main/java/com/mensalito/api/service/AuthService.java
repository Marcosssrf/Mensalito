package com.mensalito.api.service;

import com.mensalito.api.exception.TooManyRequestsException;
import com.mensalito.api.model.Tenant;
import com.mensalito.api.model.User;
import com.mensalito.api.model.enums.Role;
import com.mensalito.api.repository.TenantRepository;
import com.mensalito.api.repository.UserRepository;
import com.mensalito.api.security.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.concurrent.TimeUnit;

/**
 * AuthService simplificado para a Opção A:
 * - Login/registro/verificação de email → Supabase (frontend chama direto)
 * - Spring só provisiona o tenant+user local após confirmação do Supabase
 * - Logout → blacklist do token no Redis
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private static final String LOGIN_ATTEMPTS_PREFIX = "login:attempts:";
    private static final int MAX_ATTEMPTS = 5;
    private static final long BLOCK_MINUTES = 15;

    private final TenantRepository tenantRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final StringRedisTemplate redisTemplate;

    @Value("${app.admin-secret}")
    private String adminSecret;

    @Value("${app.trusted-proxies:}")
    private java.util.List<String> trustedProxies;

    // -------------------------------------------------------------------------
    // Provisionamento local após registro confirmado pelo Supabase
    // -------------------------------------------------------------------------

    /**
     * Chamado pelo frontend após o usuário confirmar o email no Supabase.
     * Cria o Tenant e o User local se ainda não existirem.
     * Retorna o User (existente ou recém-criado).
     */
    @Transactional
    public User provisionLocalUser(String email, String name,
                                   String schoolName, String schoolPhone,
                                   String schoolDocument) {
        return userRepository.findByEmail(email).orElseGet(() -> {
            Tenant tenant = tenantRepository.findByEmail(email).orElseGet(() -> {
                Tenant t = Tenant.builder()
                        .name(schoolName != null ? schoolName : name)
                        .email(email)
                        .phone(schoolPhone)
                        .document(schoolDocument)
                        .build();
                return tenantRepository.save(t);
            });

            User user = User.builder()
                    .name(name)
                    .email(email)
                    .password(passwordEncoder.encode(java.util.UUID.randomUUID().toString()))
                    .tenant(tenant)
                    .role(Role.OWNER)
                    .active(true)
                    .build();

            log.info("[AuthService] Usuário local provisionado: {}", email);
            return userRepository.save(user);
        });
    }

    // -------------------------------------------------------------------------
    // Logout
    // -------------------------------------------------------------------------

    public void logout(String token) {
        jwtService.invalidateToken(token);
    }

    // -------------------------------------------------------------------------
    // Rate limit (mantido para proteção de outros endpoints)
    // -------------------------------------------------------------------------

    public void checkRateLimit(String clientIp) {
        String key = LOGIN_ATTEMPTS_PREFIX + clientIp;
        String attempts = redisTemplate.opsForValue().get(key);
        if (attempts != null && Integer.parseInt(attempts) >= MAX_ATTEMPTS) {
            throw new TooManyRequestsException(
                    "Muitas tentativas. Tente novamente em " + BLOCK_MINUTES + " minutos.");
        }
    }

    public void registerFailedAttempt(String clientIp) {
        String key = LOGIN_ATTEMPTS_PREFIX + clientIp;
        Long attempts = redisTemplate.opsForValue().increment(key);
        if (attempts != null && attempts == 1) {
            redisTemplate.expire(key, BLOCK_MINUTES, TimeUnit.MINUTES);
        }
    }

    public void unlockIp(String ip) {
        redisTemplate.delete(LOGIN_ATTEMPTS_PREFIX + ip);
    }

    public void unlockIpWithSecret(String ip, String secret) {
        if (!adminSecret.equals(secret)) {
            throw new org.springframework.security.access.AccessDeniedException("Segredo inválido");
        }
        unlockIp(ip);
    }

    public Long getRemainingAttempts(String ip) {
        String key = LOGIN_ATTEMPTS_PREFIX + ip;
        String attempts = redisTemplate.opsForValue().get(key);
        if (attempts == null) return (long) MAX_ATTEMPTS;
        return Math.max(0, MAX_ATTEMPTS - Long.parseLong(attempts));
    }

    public boolean isTrustedProxy(String ip) {
        return trustedProxies != null && trustedProxies.contains(ip);
    }
}
