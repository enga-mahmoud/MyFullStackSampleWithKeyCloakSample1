package com.myapp.orderservice.client;

import com.myapp.orderservice.dto.ProductDto;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.util.NoSuchElementException;

@Component
public class ProductServiceClient {

    private final WebClient webClient;
    private final ServiceTokenProvider tokenProvider;

    @Value("${services.product-service.url}")
    private String baseUrl;

    public ProductServiceClient(WebClient webClient, ServiceTokenProvider tokenProvider) {
        this.webClient = webClient;
        this.tokenProvider = tokenProvider;
    }

    public ProductDto getProduct(Long productId) {
        try {
            return webClient.get()
                    .uri(baseUrl + "/api/products/" + productId)
                    .headers(h -> h.setBearerAuth(tokenProvider.getToken()))
                    .retrieve()
                    .bodyToMono(ProductDto.class)
                    .block();
        } catch (WebClientResponseException.NotFound e) {
            throw new NoSuchElementException("Product not found: " + productId);
        }
    }

    public ProductDto updateProduct(Long productId, ProductDto product) {
        return webClient.put()
                .uri(baseUrl + "/api/products/" + productId)
                .headers(h -> h.setBearerAuth(tokenProvider.getToken()))
                .bodyValue(product)
                .retrieve()
                .bodyToMono(ProductDto.class)
                .block();
    }
}
