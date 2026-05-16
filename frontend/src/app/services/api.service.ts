import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface User {
  id?: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  createdAt?: string;
}

export interface Product {
  id?: number;
  name: string;
  description?: string;
  price: number;
  stock: number;
  createdAt?: string;
}

export interface Order {
  id?: number;
  userId: number;
  productId: number;
  quantity: number;
  totalPrice: number;
  status: 'CONFIRMED' | 'FAILED';
  createdAt?: string;
}

export interface CreateOrderRequest {
  userId: number;
  productId: number;
  quantity: number;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly usersUrl = '/api/users';
  private readonly productsUrl = '/api/products';
  private readonly ordersUrl = '/api/orders';

  constructor(private http: HttpClient) {}

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.usersUrl);
  }

  getUser(id: number): Observable<User> {
    return this.http.get<User>(`${this.usersUrl}/${id}`);
  }

  createUser(user: User): Observable<User> {
    return this.http.post<User>(this.usersUrl, user);
  }

  updateUser(id: number, user: User): Observable<User> {
    return this.http.put<User>(`${this.usersUrl}/${id}`, user);
  }

  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.usersUrl}/${id}`);
  }

  getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(this.productsUrl);
  }

  getProduct(id: number): Observable<Product> {
    return this.http.get<Product>(`${this.productsUrl}/${id}`);
  }

  createProduct(product: Product): Observable<Product> {
    return this.http.post<Product>(this.productsUrl, product);
  }

  updateProduct(id: number, product: Product): Observable<Product> {
    return this.http.put<Product>(`${this.productsUrl}/${id}`, product);
  }

  deleteProduct(id: number): Observable<void> {
    return this.http.delete<void>(`${this.productsUrl}/${id}`);
  }

  getOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(this.ordersUrl);
  }

  getOrdersByUser(userId: number): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.ordersUrl}/user/${userId}`);
  }

  createOrder(request: CreateOrderRequest): Observable<Order> {
    return this.http.post<Order>(this.ordersUrl, request);
  }
}
