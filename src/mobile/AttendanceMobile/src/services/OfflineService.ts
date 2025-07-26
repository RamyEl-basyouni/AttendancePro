import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';
import SecureTokenStorage from '../utils/SecureTokenStorage';
import { useOfflineStore } from '../store/offlineStore';

export class OfflineService {
  private static readonly OFFLINE_DATA_KEY = 'offline_data';
  private static isInitialized = false;

  static async initialize(): Promise<void> {
    if (this.isInitialized) return;

    if (__DEV__ && Platform.OS === 'ios') {
      console.log('Skipping NetInfo initialization on iOS simulator');
      useOfflineStore.getState().setOnlineStatus(true); // Assume online for iOS simulator
      await this.loadPendingData();
      this.isInitialized = true;
      return;
    }

    NetInfo.addEventListener(state => {
      const isOnline = state.isConnected && state.isInternetReachable;
      useOfflineStore.getState().setOnlineStatus(isOnline || false);
      
      if (isOnline) {
        this.syncPendingData();
      }
    });

    await this.loadPendingData();
    
    this.isInitialized = true;
  }

  static async isOnline(): Promise<boolean> {
    if (__DEV__ && Platform.OS === 'ios') {
      console.log('Assuming online status on iOS simulator');
      return true;
    }

    const state = await NetInfo.fetch();
    return state.isConnected && state.isInternetReachable || false;
  }

  static async storePendingData(type: 'attendance' | 'leave_request' | 'profile_update', data: any): Promise<void> {
    const offlineStore = useOfflineStore.getState();
    
    offlineStore.addPendingData({
      type,
      data,
    });

    await this.savePendingData();
  }

  static async syncPendingData(): Promise<void> {
    const offlineStore = useOfflineStore.getState();
    const { pendingData } = offlineStore;

    if (pendingData.length === 0) return;

    offlineStore.setSyncInProgress(true);

    const batchSize = 10;
    const batches = [];
    for (let i = 0; i < pendingData.length; i += batchSize) {
      batches.push(pendingData.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      try {
        const syncPromises = batch.map(async (item) => {
          try {
            await this.syncSingleItem(item);
            offlineStore.removePendingData(item.id);
          } catch (error) {
            console.error('Failed to sync item:', item.id, error);
            offlineStore.incrementRetryCount(item.id);
            
            const retryDelay = Math.pow(2, item.retryCount + 1) * 1000;
            setTimeout(() => {
            }, retryDelay);
            
            if (item.retryCount >= 2) { // Will be 3 after increment
              offlineStore.removePendingData(item.id);
            }
          }
        });

        await Promise.allSettled(syncPromises);
      } catch (error) {
        console.error('Batch sync failed:', error);
      }
    }

    offlineStore.setSyncInProgress(false);
    offlineStore.setLastSyncTime(new Date().toISOString());
    
    await this.savePendingData();
  }

  private static async syncSingleItem(item: any): Promise<void> {
    const baseUrl = 'https://user:b29417b278346ab3db5901b11010bd64@attendancepro-backend-app-tunnel-47tg15sr.devinapps.com/api';
    let endpoint = '';
    
    switch (item.type) {
      case 'attendance':
        endpoint = `${baseUrl}/attendance/checkin`;
        break;
      case 'leave_request':
        endpoint = `${baseUrl}/leave/request`;
        break;
      case 'profile_update':
        endpoint = `${baseUrl}/users/profile`;
        break;
      default:
        throw new Error(`Unknown sync type: ${item.type}`);
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await SecureTokenStorage.getToken()}`,
      },
      body: JSON.stringify(item.data),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }

  private static async loadPendingData(): Promise<void> {
    try {
      const storedData = await AsyncStorage.getItem(this.OFFLINE_DATA_KEY);
      if (storedData) {
        const pendingData = JSON.parse(storedData);
        const offlineStore = useOfflineStore.getState();
        
        offlineStore.clearPendingData();
        pendingData.forEach((item: any) => {
          offlineStore.addPendingData(item);
        });
      }
    } catch (error) {
      console.error('Failed to load pending data:', error);
    }
  }

  private static async savePendingData(): Promise<void> {
    try {
      const { pendingData } = useOfflineStore.getState();
      await AsyncStorage.setItem(this.OFFLINE_DATA_KEY, JSON.stringify(pendingData));
    } catch (error) {
      console.error('Failed to save pending data:', error);
    }
  }

  static async clearPendingData(): Promise<void> {
    const offlineStore = useOfflineStore.getState();
    offlineStore.clearPendingData();
    await AsyncStorage.removeItem(this.OFFLINE_DATA_KEY);
  }
}
