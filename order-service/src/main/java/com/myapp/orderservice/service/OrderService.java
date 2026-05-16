package com.myapp.orderservice.service;

import com.myapp.orderservice.client.ProductServiceClient;
import com.myapp.orderservice.client.UserServiceClient;
import com.myapp.orderservice.dto.CreateOrderRequest;
import com.myapp.orderservice.dto.ProductDto;
import com.myapp.orderservice.exception.InsufficientStockException;
import com.myapp.orderservice.model.Order;
import com.myapp.orderservice.model.OrderStatus;
import com.myapp.orderservice.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.NoSuchElementException;

@Service
@Slf4j
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrderService {

    private final OrderRepository orderRepository;
    private final UserServiceClient userServiceClient;
    private final ProductServiceClient productServiceClient;

    @Transactional
    public Order createOrder(CreateOrderRequest request) {
        log.info("Creating order: userId={} productId={} qty={}",
                request.getUserId(), request.getProductId(), request.getQuantity());

        // 1. Verify the user exists (throws NoSuchElementException on 404)
        var user = userServiceClient.getUser(request.getUserId());
        log.debug("User verified: {}", user.getUsername());

        // 2. Fetch product and check available stock
        ProductDto product = productServiceClient.getProduct(request.getProductId());
        log.debug("Product fetched: {} stock={}", product.getName(), product.getStock());

        if (product.getStock() < request.getQuantity()) {
            throw new InsufficientStockException(
                    "Insufficient stock for '" + product.getName() + "': "
                    + "requested=" + request.getQuantity()
                    + ", available=" + product.getStock());
        }

        // 3. Decrement stock via PUT on product-service
        // Note: This is a best-effort update without distributed transaction support.
        // In production, use the Saga pattern or an outbox table for consistency.
        product.setStock(product.getStock() - request.getQuantity());
        productServiceClient.updateProduct(request.getProductId(), product);
        log.debug("Stock decremented for product {}", request.getProductId());

        // 4. Persist the order
        Order order = new Order();
        order.setUserId(request.getUserId());
        order.setProductId(request.getProductId());
        order.setQuantity(request.getQuantity());
        order.setTotalPrice(product.getPrice().multiply(BigDecimal.valueOf(request.getQuantity())));
        order.setStatus(OrderStatus.CONFIRMED);

        Order saved = orderRepository.save(order);
        log.info("Order {} confirmed for userId={} productId={} totalPrice={}",
                saved.getId(), saved.getUserId(), saved.getProductId(), saved.getTotalPrice());
        return saved;
    }

    public List<Order> findAll() {
        return orderRepository.findAll();
    }

    public Order findById(Long id) {
        return orderRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Order not found: " + id));
    }

    public List<Order> findByUserId(Long userId) {
        return orderRepository.findByUserId(userId);
    }
}
