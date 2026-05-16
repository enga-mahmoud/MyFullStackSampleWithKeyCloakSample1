package com.myapp.orderservice.client;

import org.springframework.security.oauth2.client.OAuth2AuthorizeRequest;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientManager;
import org.springframework.stereotype.Component;

@Component
public class ServiceTokenProvider {

    private final OAuth2AuthorizedClientManager authorizedClientManager;

    public ServiceTokenProvider(OAuth2AuthorizedClientManager authorizedClientManager) {
        this.authorizedClientManager = authorizedClientManager;
    }

    /**
     * Obtains a Bearer token for the order-service-client using the
     * client_credentials grant. The manager caches the token and only
     * requests a new one when the current token is near expiry.
     */
    public String getToken() {
        var authorizeRequest = OAuth2AuthorizeRequest
                .withClientRegistrationId("keycloak")
                .principal("order-service")
                .build();
        var authorizedClient = authorizedClientManager.authorize(authorizeRequest);
        if (authorizedClient == null || authorizedClient.getAccessToken() == null) {
            throw new IllegalStateException("Failed to obtain access token for order-service-client");
        }
        return authorizedClient.getAccessToken().getTokenValue();
    }
}
