package com.myapp.userservice.service;

import com.myapp.userservice.model.User;
import com.myapp.userservice.repository.UserRepository;
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
public class UserService {

    private static final Logger log = LoggerFactory.getLogger(UserService.class);

    private final UserRepository userRepository;

    public List<User> findAll() {
        log.info("Fetching all users");
        return userRepository.findAll();
    }

    public User findById(Long id) {
        log.info("Fetching user id={}", id);
        return userRepository.findById(id)
            .orElseThrow(() -> new NoSuchElementException("User not found: " + id));
    }

    @Transactional
    public User create(User user) {
        log.info("Creating user username={}", user.getUsername());
        return userRepository.save(user);
    }

    @Transactional
    public User update(Long id, User updated) {
        log.info("Updating user id={}", id);
        User existing = findById(id);
        existing.setUsername(updated.getUsername());
        existing.setEmail(updated.getEmail());
        existing.setFirstName(updated.getFirstName());
        existing.setLastName(updated.getLastName());
        return userRepository.save(existing);
    }

    @Transactional
    public void delete(Long id) {
        log.info("Deleting user id={}", id);
        userRepository.deleteById(id);
    }
}
