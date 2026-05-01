package com.mensalito.api.service;

import com.mensalito.api.dto.request.LoginRequestDTO;
import com.mensalito.api.dto.request.RegisterRequestDTO;
import com.mensalito.api.dto.response.LoginResponseDTO;
import com.mensalito.api.exception.TooManyRequestsException;
import com.mensalito.api.model.Tenant;
import com.mensalito.api.model.User;
import com.mensalito.api.model.enums.Role;
import com.mensalito.api.repository.TenantRepository;
import com.mensalito.api.repository.UserRepository;
import com.mensalito.api.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.concurrent.TimeUnit;

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
    private final AuthenticationManager authenticationManager;
    private final StringRedisTemplate redisTemplate;

    @Value("${app.admin-secret}")
    private String adminSecret;

    @Transactional
    public LoginResponseDTO register(RegisterRequestDTO dto) {
        if (userRepository.existsByEmail(dto.email())) {
            throw new IllegalArgumentException("Email já cadastrado");
        }

        Tenant tenant = Tenant.builder()
                .name(dto.schoolName())
                .email(dto.email())
                .phone(dto.schoolPhone())
                .document(dto.schoolDocument())
                .build();
        tenant = tenantRepository.save(tenant);

        User user = User.builder()
                .name(dto.name())
                .email(dto.email())
                .password(passwordEncoder.encode(dto.password()))
                .tenant(tenant)
                .role(Role.OWNER)
                .active(true)
                .build();
        user = userRepository.save(user);

        String token = jwtService.generateToken(user);
        return new LoginResponseDTO(token, user.getName(), tenant.getId(), user.getRole());
    }

    public LoginResponseDTO login(LoginRequestDTO dto, String clientIp) {
        checkRateLimit(clientIp);

        try {
            Authentication auth = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(dto.email(), dto.password())
            );

            // login bem-sucedido — limpa as tentativas
            redisTemplate.delete(LOGIN_ATTEMPTS_PREFIX + clientIp);

            User user = (User) auth.getPrincipal();
            String token = jwtService.generateToken(user);
            return new LoginResponseDTO(token, user.getName(), user.getTenant().getId(), user.getRole());

        } catch (BadCredentialsException ex) {
            registerFailedAttempt(clientIp);
            throw ex;
        }
    }

    public void logout(String token) {
        jwtService.invalidateToken(token);
    }


    public void unlockIpWithSecret(String ip, String secret) {
        if (!adminSecret.equals(secret)) {
            throw new org.springframework.security.access.AccessDeniedException("Segredo inválido");
        }
        unlockIp(ip);
    }

    public void unlockIp(String ip) {
        redisTemplate.delete(LOGIN_ATTEMPTS_PREFIX + ip);
    }

    public Long getRemainingAttempts(String ip) {
        String key = LOGIN_ATTEMPTS_PREFIX + ip;
        String attempts = redisTemplate.opsForValue().get(key);
        if (attempts == null) return 0L;
        long used = Long.parseLong(attempts);
        return Math.max(0, MAX_ATTEMPTS - used);
    }
    private void checkRateLimit(String clientIp) {
        String key = LOGIN_ATTEMPTS_PREFIX + clientIp;
        String attempts = redisTemplate.opsForValue().get(key);
        if (attempts != null && Integer.parseInt(attempts) >= MAX_ATTEMPTS) {
            throw new TooManyRequestsException(
                    "Muitas tentativas de login. Tente novamente em " + BLOCK_MINUTES + " minutos."
            );
        }
    }

    private void registerFailedAttempt(String clientIp) {
        String key = LOGIN_ATTEMPTS_PREFIX + clientIp;
        Long attempts = redisTemplate.opsForValue().increment(key);
        if (attempts != null && attempts == 1) {
            redisTemplate.expire(key, BLOCK_MINUTES, TimeUnit.MINUTES);
        }
    }
}