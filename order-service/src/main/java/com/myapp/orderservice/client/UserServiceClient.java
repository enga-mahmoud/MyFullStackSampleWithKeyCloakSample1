package com.myapp.orderservice.client;

import com.myapp.orderservice.dto.UserDto;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.util.NoSuchElementException;

@Component
public class UserServiceClient {

    private final WebClient webClient;
    private final ServiceTokenProvider tokenProvider;

    @Value("${services.user-service.url}")
    private String baseUrl;

    public UserServiceClient(WebClient webClient, ServiceTokenProvider tokenProvider) {
        this.webClient = webClient;
        this.tokenProvider = tokenProvider;
    }

    public UserDto getUser(Long userId) {
        try {
            return webClient.get()
                    .uri(baseUrl + "/api/users/" + userId)
                    .headers(h -> h.setBearerAuth(tokenProvider.getToken()))
                    .retrieve()
                    .bodyToMono(UserDto.class)
                    .block();
        } catch (WebClientResponseException.NotFound e) {
            throw new NoSuchElementException("User not found: " + userId);
        }
    }
}
