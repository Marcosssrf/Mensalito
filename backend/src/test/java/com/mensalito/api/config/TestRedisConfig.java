package com.mensalito.api.config;

import org.mockito.Mockito;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

@TestConfiguration
public class TestRedisConfig {

    @Bean
    @Primary
    public StringRedisTemplate testStringRedisTemplate() {
        StringRedisTemplate mockTemplate = Mockito.mock(StringRedisTemplate.class);
        ValueOperations<String, String> valueOps = Mockito.mock(ValueOperations.class);
        Mockito.when(mockTemplate.opsForValue()).thenReturn(valueOps);
        return mockTemplate;
    }
}