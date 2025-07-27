import axios, { AxiosResponse } from 'axios';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5000/api';
const TUNNEL_AUTH_USER = (import.meta as any).env?.VITE_TUNNEL_AUTH_USER;
const TUNNEL_AUTH_PASSWORD = (import.meta as any).env?.VITE_TUNNEL_AUTH_PASSWORD;

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: string;
}

export interface BeaconData {
  uuid: string;
  major: number;
  minor: number;
  rssi: number;
  distance?: number;
}

export interface CheckInRequest {
  location?: LocationData;
  biometricData?: string;
  beaconData?: BeaconData;
  checkInType: 'manual' | 'gps' | 'beacon' | 'face' | 'hybrid';
  notes?: string;
}

export interface CheckOutRequest {
  location?: LocationData;
  biometricData?: string;
  beaconData?: BeaconData;
  checkOutType: 'manual' | 'gps' | 'beacon' | 'face' | 'hybrid';
  notes?: string;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  checkInTime: string;
  checkOutTime?: string;
  location?: LocationData;
  checkInType: string;
  checkOutType?: string;
  totalHours?: number;
  status: 'checked_in' | 'checked_out' | 'incomplete';
  notes?: string;
  isLate: boolean;
  isEarlyLeave: boolean;
  geofenceValidated: boolean;
  beaconValidated: boolean;
  biometricValidated: boolean;
}

export interface TodayAttendanceResponse {
  hasCheckedIn: boolean;
  hasCheckedOut: boolean;
  checkInTime?: string;
  checkOutTime?: string;
  totalHours?: number;
  status: string;
  location?: LocationData;
  isLate: boolean;
  canCheckOut: boolean;
}

export interface GeofenceValidationRequest {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface GeofenceValidationResponse {
  isValid: boolean;
  geofenceName?: string;
  distance?: number;
  message: string;
}

export interface BeaconValidationRequest {
  uuid: string;
  major: number;
  minor: number;
  rssi: number;
}

export interface BeaconValidationResponse {
  isValid: boolean;
  beaconName?: string;
  distance?: number;
  message: string;
}

export interface AttendanceStats {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  earlyLeaveDays: number;
  averageHours: number;
  attendanceRate: number;
}

export interface AttendanceReport {
  userId: string;
  userName: string;
  period: string;
  records: AttendanceRecord[];
  stats: AttendanceStats;
  generatedAt: string;
}

class AttendanceService {
  private api = axios.create({
    baseURL: `${API_BASE_URL}/Attendance`,
    headers: {
      'Content-Type': 'application/json',
      ...(TUNNEL_AUTH_USER && TUNNEL_AUTH_PASSWORD ? {
        'Authorization': `Basic ${btoa(`${TUNNEL_AUTH_USER}:${TUNNEL_AUTH_PASSWORD}`)}`
      } : {})
    },
  });

  constructor() {
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  async checkIn(request: CheckInRequest): Promise<AttendanceRecord> {
    try {
      const response: AxiosResponse<{success: boolean; data: AttendanceRecord; message: string}> = await this.api.post('/checkin', request);
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Check-in failed');
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Check-in failed');
    }
  }

  async checkOut(request: CheckOutRequest): Promise<AttendanceRecord> {
    try {
      const response: AxiosResponse<{success: boolean; data: AttendanceRecord; message: string}> = await this.api.post('/checkout', request);
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Check-out failed');
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Check-out failed');
    }
  }

  async getTodayAttendance(): Promise<TodayAttendanceResponse> {
    try {
      const response: AxiosResponse<{success: boolean; data: TodayAttendanceResponse; message: string}> = await this.api.get('/today');
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch today\'s attendance');
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch today\'s attendance');
    }
  }

  async getAttendanceRecords(
    startDate?: string,
    endDate?: string,
    page: number = 1,
    pageSize: number = 50
  ): Promise<AttendanceRecord[]> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response: AxiosResponse<{success: boolean; data: AttendanceRecord[]; message: string}> = await this.api.get(`/records?${params}`);
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch attendance records');
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch attendance records');
    }
  }

  async validateGeofence(request: GeofenceValidationRequest): Promise<GeofenceValidationResponse> {
    try {
      const response: AxiosResponse<GeofenceValidationResponse> = await this.api.post('/validate-geofence', request);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Geofence validation failed');
    }
  }

  async validateBeacon(request: BeaconValidationRequest): Promise<BeaconValidationResponse> {
    try {
      const response: AxiosResponse<BeaconValidationResponse> = await this.api.post('/validate-beacon', request);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Beacon validation failed');
    }
  }

  async getAttendanceStats(startDate?: string, endDate?: string): Promise<AttendanceStats> {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response: AxiosResponse<{success: boolean; data: AttendanceStats; message: string}> = await this.api.get(`/stats?${params}`);
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch attendance statistics');
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch attendance statistics');
    }
  }

  async generateAttendanceReport(
    startDate: string,
    endDate: string,
    userId?: string
  ): Promise<AttendanceReport> {
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
      });

      if (userId) params.append('userId', userId);

      const response: AxiosResponse<AttendanceReport> = await this.api.get(`/report?${params}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to generate attendance report');
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      await this.api.get('/health');
      return true;
    } catch (error) {
      return false;
    }
  }

  async getCurrentLocation(): Promise<LocationData> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date().toISOString(),
          });
        },
        (error) => {
          reject(new Error(`Location error: ${error.message}`));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        }
      );
    });
  }

  async smartCheckIn(options: {
    enableGPS?: boolean;
    enableBeacon?: boolean;
    enableFace?: boolean;
    biometricData?: string;
    notes?: string;
  } = {}): Promise<AttendanceRecord> {
    try {
      const checkInData: CheckInRequest = {
        checkInType: 'hybrid',
        notes: options.notes,
      };

      if (options.enableGPS) {
        try {
          const location = await this.getCurrentLocation();
          const geofenceValidation = await this.validateGeofence(location);
          
          if (geofenceValidation.isValid) {
            checkInData.location = location;
          } else {
            throw new Error(`Location validation failed: ${geofenceValidation.message}`);
          }
        } catch (error: any) {
          throw new Error(`GPS check-in failed: ${error.message}`);
        }
      }

      if (options.enableFace && options.biometricData) {
        checkInData.biometricData = options.biometricData;
      }

      return await this.checkIn(checkInData);
    } catch (error: any) {
      throw new Error(error.message || 'Smart check-in failed');
    }
  }

  async smartCheckOut(options: {
    enableGPS?: boolean;
    enableBeacon?: boolean;
    enableFace?: boolean;
    biometricData?: string;
    notes?: string;
  } = {}): Promise<AttendanceRecord> {
    try {
      const checkOutData: CheckOutRequest = {
        checkOutType: 'hybrid',
        notes: options.notes,
      };

      if (options.enableGPS) {
        try {
          const location = await this.getCurrentLocation();
          const geofenceValidation = await this.validateGeofence(location);
          
          if (geofenceValidation.isValid) {
            checkOutData.location = location;
          } else {
            throw new Error(`Location validation failed: ${geofenceValidation.message}`);
          }
        } catch (error: any) {
          throw new Error(`GPS check-out failed: ${error.message}`);
        }
      }

      if (options.enableFace && options.biometricData) {
        checkOutData.biometricData = options.biometricData;
      }

      return await this.checkOut(checkOutData);
    } catch (error: any) {
      throw new Error(error.message || 'Smart check-out failed');
    }
  }
}

export default new AttendanceService();
