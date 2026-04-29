package com.mensalito.api.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Getter
@Setter
@Configuration
@ConfigurationProperties(prefix = "abacatepay")
public class AbacatePayConfig {
    private String apiKey;
    private String baseUrl;
    private String returnUrl;
    private String completionUrl;
}
