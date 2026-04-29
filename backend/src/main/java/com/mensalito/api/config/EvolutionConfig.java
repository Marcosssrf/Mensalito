package com.mensalito.api.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Getter
@Setter
@Configuration
@ConfigurationProperties(prefix = "evolution")
public class EvolutionConfig {
    private String apiUrl;
    private String apiKey;
    private String instance;
}
