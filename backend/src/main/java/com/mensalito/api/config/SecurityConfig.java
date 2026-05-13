package com.mensalito.api.config;

import com.mensalito.api.security.JwtFilter;
import com.mensalito.api.security.WebhookAuthFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfigurationSource;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtFilter jwtFilter;
    private final WebhookAuthFilter webhookAuthFilter;
    private final CorsConfigurationSource corsConfigurationSource;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource))
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // Provision e logout são públicos (token validado pelo JwtFilter)
                        .requestMatchers("/api/auth/provision", "/api/auth/logout").permitAll()
                        // Convites: preview e accept são públicos; criar exige auth
                        .requestMatchers(HttpMethod.GET,  "/api/invites/*/preview").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/invites/accept").permitAll()
                        // Webhooks — autenticação feita via HMAC no WebhookAuthFilter
                        .requestMatchers(HttpMethod.POST, "/api/webhooks/**").permitAll()
                        // Tudo mais exige autenticação
                        .anyRequest().authenticated()
                )
                // WebhookAuthFilter valida HMAC antes do JwtFilter
                .addFilterBefore(webhookAuthFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config)
            throws Exception {
        return config.getAuthenticationManager();
    }
}