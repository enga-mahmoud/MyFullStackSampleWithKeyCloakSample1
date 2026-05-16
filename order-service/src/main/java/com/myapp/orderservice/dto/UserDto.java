package com.myapp.orderservice.dto;

import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class UserDto {
    private Long id;
    private String username;
    private String email;
    private String firstName;
    private String lastName;
}
