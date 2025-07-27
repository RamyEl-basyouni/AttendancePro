import AsyncStorage from '@react-native-async-storage/async-storage';
import { LoginCredentials, AuthResponse, User } from '../types/User';
import SecureTokenStorage from '../utils/SecureTokenStorage';

export class AuthService {
  private static readonly TOKEN_KEY = 'auth_token';
  private static readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private static readonly USER_KEY = 'user_data';
  private static readonly BASE_URL = 'https://user:0ba619383fb6c3fd1b4b9958242591c1@attendancepro-backend-app-tunnel-fc4n3tng.devinapps.com/api/auth';

  static async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });
      console.log('response --- ', response);

      if (!response.ok) {
        throw new Error('Invalid credentials');
      }

      const authResponse: AuthResponse = await response.json();

      await SecureTokenStorage.setToken(authResponse.token);
      await SecureTokenStorage.setRefreshToken(authResponse.refreshToken);
      await SecureTokenStorage.setUserData(authResponse.user);

      return authResponse;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Login failed');
    }
  }

  static async logout(): Promise<void> {
    try {
      const token = await this.getToken();
      if (token) {
        await fetch(`${this.BASE_URL}/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await AsyncStorage.multiRemove([
        this.TOKEN_KEY,
        this.REFRESH_TOKEN_KEY,
        this.USER_KEY,
      ]);
    }
  }

  static async getToken(): Promise<string | null> {
    return await SecureTokenStorage.getToken();
  }

  static async getRefreshToken(): Promise<string | null> {
    return await SecureTokenStorage.getRefreshToken();
  }

  static async getUser(): Promise<User | null> {
    const userData = await AsyncStorage.getItem(this.USER_KEY);
    return userData ? JSON.parse(userData) : null;
  }

  static async refreshToken(): Promise<AuthResponse> {
    const refreshToken = await this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch(`${this.BASE_URL}/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const authResponse: AuthResponse = await response.json();

      await SecureTokenStorage.setToken(authResponse.token);
      await SecureTokenStorage.setRefreshToken(authResponse.refreshToken);

      return authResponse;
    } catch (error) {
      await this.logout();
      throw new Error('Session expired. Please login again.');
    }
  }

  static async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    return token !== null;
  }
}
