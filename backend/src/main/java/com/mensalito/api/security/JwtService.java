package com.mensalito.api.security;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.jwk.source.RemoteJWKSet;
import com.nimbusds.jose.proc.JWSVerificationKeySelector;
import com.nimbusds.jose.proc.SecurityContext;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.proc.ConfigurableJWTProcessor;
import com.nimbusds.jwt.proc.DefaultJWTProcessor;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.net.URL;
import java.util.Date;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * Valida tokens JWT emitidos pelo Supabase via JWKS (ECC P-256).
 * O Spring não gera mais tokens — isso é responsabilidade do Supabase.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class JwtService {

    @Value("${supabase.url}")
    private String supabaseUrl;

    private final StringRedisTemplate redisTemplate;

    private static final String BLACKLIST_PREFIX = "jwt:blacklist:";

    private ConfigurableJWTProcessor<SecurityContext> jwtProcessor;

    @PostConstruct
    public void init() {
        try {
            URL jwksUrl = new URL(supabaseUrl + "/auth/v1/.well-known/jwks.json");
            JWKSource<SecurityContext> keySource = new RemoteJWKSet<>(jwksUrl);

            jwtProcessor = new DefaultJWTProcessor<>();
            jwtProcessor.setJWSKeySelector(
                new JWSVerificationKeySelector<>(JWSAlgorithm.ES256, keySource)
            );

            log.info("[JwtService] JWKS carregado de {}", jwksUrl);
        } catch (Exception e) {
            throw new IllegalStateException("Falha ao configurar JWKS: " + e.getMessage(), e);
        }
    }

    public boolean isTokenValid(String token) {
        try {
            getClaims(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public void invalidateToken(String token) {
        try {
            Date exp = getClaims(token).getExpirationTime();
            if (exp != null) {
                long ttl = exp.getTime() - System.currentTimeMillis();
                if (ttl > 0) {
                    redisTemplate.opsForValue()
                            .set(BLACKLIST_PREFIX + token, "1", ttl, TimeUnit.MILLISECONDS);
                }
            }
        } catch (Exception ignored) {}
    }

    public boolean isTokenBlacklisted(String token) {
        return Boolean.TRUE.equals(redisTemplate.hasKey(BLACKLIST_PREFIX + token));
    }

    /** No token do Supabase, o email fica na claim "email". */
    public String extractEmail(String token) {
        try {
            return getClaims(token).getStringClaim("email");
        } catch (Exception e) {
            return null;
        }
    }

    /** UUID do usuário no Supabase (claim "sub"). */
    public UUID extractSupabaseUserId(String token) {
        try {
            return UUID.fromString(getClaims(token).getSubject());
        } catch (Exception e) {
            return null;
        }
    }

    private JWTClaimsSet getClaims(String token) throws Exception {
        return jwtProcessor.process(token, null);
    }
}
