package com.mensalito.api.controller;

import com.mensalito.api.dto.request.LoginRequestDTO;
import com.mensalito.api.dto.response.LoginResponseDTO;
import com.mensalito.api.model.User;
import com.mensalito.api.security.JwtService;
import com.mensalito.api.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(value = "/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UserService userService;
    private final JwtService jwtService;

    @PostMapping(value = "/login")
    public ResponseEntity<LoginResponseDTO> login(@RequestBody @Valid LoginRequestDTO dto) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(dto.email(), dto.password())
        );

        User user = (User) userService.loadUserByUsername(dto.email());
        String token = jwtService.generateToken(user);

        return ResponseEntity.ok(new LoginResponseDTO(
                token,
                user.getName(),
                user.getTenant().getId()
        ));
    }

}
