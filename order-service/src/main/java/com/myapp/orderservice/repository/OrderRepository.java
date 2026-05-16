package com.myapp.orderservice.repository;

import com.myapp.orderservice.model.Order;
import com.myapp.orderservice.model.OrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findByUserId(Long userId);
    List<Order> findByProductId(Long productId);
    List<Order> findByStatus(OrderStatus status);
}
