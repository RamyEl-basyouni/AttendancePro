import SecureTokenStorage from '../utils/SecureTokenStorage'

export class ApiService {
  private baseURL: string

  constructor() {
    this.baseURL = 'https://user:b29417b278346ab3db5901b11010bd64@attendancepro-backend-app-tunnel-47tg15sr.devinapps.com/api'
  }

  private async getHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    try {
      const token = await SecureTokenStorage.getToken()
      if (token) {
        headers.Authorization = `Bearer ${token}`
      }
    } catch (error) {
      console.warn('Failed to get auth token:', error)
    }

    return headers
  }

  async get<T>(endpoint: string): Promise<{ data: T }> {
    const headers = await this.getHeaders()
    
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'GET',
      headers
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return { data: await response.json() }
  }

  async post<T>(endpoint: string, data?: any): Promise<{ data: T }> {
    const headers = await this.getHeaders()
    
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers,
      body: data ? JSON.stringify(data) : undefined
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return { data: await response.json() }
  }

  async put<T>(endpoint: string, data?: any): Promise<{ data: T }> {
    const headers = await this.getHeaders()
    
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'PUT',
      headers,
      body: data ? JSON.stringify(data) : undefined
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return { data: await response.json() }
  }

  async delete<T>(endpoint: string): Promise<{ data: T }> {
    const headers = await this.getHeaders()
    
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'DELETE',
      headers
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return { data: await response.json() }
  }
}

export const apiService = new ApiService()
