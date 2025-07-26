import { AttendanceRecord, AttendanceType, AttendanceMethod } from '../types/Attendance';
import { Location } from '../types/Location';
import { AuthService } from './AuthService';

export class AttendanceService {
  private static readonly BASE_URL = 'https://user:bd10a9794f4f06871a7a7f8e254177e3@attendancepro-backend-app-tunnel-52l91rxp.devinapps.com/api/attendance';

  static async checkIn(
    method: AttendanceMethod,
    location?: Location,
    photoBase64?: string,
    notes?: string
  ): Promise<AttendanceRecord> {
    try {
      const token = await AuthService.getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const requestBody = {
        type: AttendanceType.CHECK_IN,
        method,
        location,
        photoBase64,
        notes,
        timestamp: new Date().toISOString(),
      };

      const response = await fetch(`${this.BASE_URL}/checkin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Check-in failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Check-in failed');
    }
  }

  static async checkOut(
    method: AttendanceMethod,
    location?: Location,
    photoBase64?: string,
    notes?: string
  ): Promise<AttendanceRecord> {
    try {
      const token = await AuthService.getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const requestBody = {
        type: AttendanceType.CHECK_OUT,
        method,
        location,
        photoBase64,
        notes,
        timestamp: new Date().toISOString(),
      };

      const response = await fetch(`${this.BASE_URL}/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Check-out failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Check-out failed');
    }
  }

  static async startBreak(
    location?: Location,
    notes?: string
  ): Promise<AttendanceRecord> {
    try {
      const token = await AuthService.getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const requestBody = {
        type: AttendanceType.BREAK_START,
        method: AttendanceMethod.MANUAL,
        location,
        notes,
        timestamp: new Date().toISOString(),
      };

      const response = await fetch(`${this.BASE_URL}/break/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Break start failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Break start failed');
    }
  }

  static async endBreak(
    location?: Location,
    notes?: string
  ): Promise<AttendanceRecord> {
    try {
      const token = await AuthService.getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const requestBody = {
        type: AttendanceType.BREAK_END,
        method: AttendanceMethod.MANUAL,
        location,
        notes,
        timestamp: new Date().toISOString(),
      };

      const response = await fetch(`${this.BASE_URL}/break/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Break end failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Break end failed');
    }
  }

  static async getAttendanceHistory(
    startDate?: string,
    endDate?: string,
    limit: number = 50
  ): Promise<AttendanceRecord[]> {
    try {
      const token = await AuthService.getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      params.append('limit', limit.toString());

      const response = await fetch(`${this.BASE_URL}/history?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch attendance history: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to fetch attendance history');
    }
  }

  static async getCurrentStatus(): Promise<{
    status: 'checked_in' | 'checked_out' | 'on_break';
    lastRecord?: AttendanceRecord;
  }> {
    try {
      const token = await AuthService.getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${this.BASE_URL}/status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch current status: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to fetch current status');
    }
  }

  static async validateLocation(location: Location): Promise<boolean> {
    try {
      const token = await AuthService.getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${this.BASE_URL}/validate-location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ location }),
      });

      if (!response.ok) {
        return false;
      }

      const result = await response.json();
      return result.isValid;
    } catch (error) {
      console.error('Location validation error:', error);
      return false;
    }
  }
}
