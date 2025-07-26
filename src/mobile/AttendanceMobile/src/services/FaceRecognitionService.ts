import { AuthService } from './AuthService';

export interface FaceEnrollmentResult {
  success: boolean;
  enrollmentId?: string;
  message: string;
}

export interface FaceVerificationResult {
  success: boolean;
  confidence: number;
  message: string;
}

export class FaceRecognitionService {
  private static readonly BASE_URL = 'https://user:b29417b278346ab3db5901b11010bd64@attendancepro-backend-app-tunnel-47tg15sr.devinapps.com/api/face-recognition';

  static async enrollFace(photoBase64: string, userId?: string): Promise<FaceEnrollmentResult> {
    try {
      const token = await AuthService.getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${this.BASE_URL}/enroll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          photoBase64,
          userId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Face enrollment failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Face enrollment failed',
      };
    }
  }

  static async verifyFace(photoBase64: string, userId?: string): Promise<FaceVerificationResult> {
    try {
      const token = await AuthService.getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${this.BASE_URL}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          photoBase64,
          userId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Face verification failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      return {
        success: false,
        confidence: 0,
        message: error instanceof Error ? error.message : 'Face verification failed',
      };
    }
  }

  static async checkLiveness(photoBase64: string): Promise<{
    isLive: boolean;
    confidence: number;
    message: string;
  }> {
    try {
      const token = await AuthService.getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${this.BASE_URL}/liveness`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          photoBase64,
        }),
      });

      if (!response.ok) {
        throw new Error(`Liveness check failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      return {
        isLive: false,
        confidence: 0,
        message: error instanceof Error ? error.message : 'Liveness check failed',
      };
    }
  }

  static async deleteFaceData(userId?: string): Promise<boolean> {
    try {
      const token = await AuthService.getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${this.BASE_URL}/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Face data deletion error:', error);
      return false;
    }
  }

  static async getFaceEnrollmentStatus(userId?: string): Promise<{
    isEnrolled: boolean;
    enrollmentDate?: string;
    enrollmentCount: number;
  }> {
    try {
      const token = await AuthService.getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const params = userId ? `?userId=${userId}` : '';
      const response = await fetch(`${this.BASE_URL}/enrollment-status${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch enrollment status: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      return {
        isEnrolled: false,
        enrollmentCount: 0,
      };
    }
  }

  static async updateFaceEnrollment(photoBase64: string, userId?: string): Promise<FaceEnrollmentResult> {
    try {
      const token = await AuthService.getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${this.BASE_URL}/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          photoBase64,
          userId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Face enrollment update failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Face enrollment update failed',
      };
    }
  }
}
