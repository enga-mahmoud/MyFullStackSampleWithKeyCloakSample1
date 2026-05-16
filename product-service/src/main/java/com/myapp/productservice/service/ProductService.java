package com.myapp.productservice.service;

import com.myapp.productservice.model.Product;
import com.myapp.productservice.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProductService {

    private static final Logger log = LoggerFactory.getLogger(ProductService.class);

    private final ProductRepository productRepository;

    public List<Product> findAll() {
        log.info("Fetching all products");
        return productRepository.findAll();
    }

    public Product findById(Long id) {
        log.info("Fetching product id={}", id);
        return productRepository.findById(id)
            .orElseThrow(() -> new NoSuchElementException("Product not found: " + id));
    }

    @Transactional
    public Product create(Product product) {
        log.info("Creating product name={}", product.getName());
        return productRepository.save(product);
    }

    @Transactional
    public Product update(Long id, Product updated) {
        log.info("Updating product id={}", id);
        Product existing = findById(id);
        existing.setName(updated.getName());
        existing.setDescription(updated.getDescription());
        existing.setPrice(updated.getPrice());
        existing.setStock(updated.getStock());
        return productRepository.save(existing);
    }

    @Transactional
    public void delete(Long id) {
        log.info("Deleting product id={}", id);
        productRepository.deleteById(id);
    }
}
