import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  Platform,
  Vibration,
  ActivityIndicator,
} from 'react-native';
import { Camera, useCameraDevices } from 'react-native-vision-camera';
import Geolocation from '@react-native-community/geolocation';
import { Button, Card, Title, Paragraph, FAB } from 'react-native-paper';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Services
import { AttendanceService } from '../services/AttendanceService';
import { LocationService } from '../services/LocationService';
import { FaceRecognitionService } from '../services/FaceRecognitionService';
import { BeaconService } from '../services/BeaconService';
import { BiometricService } from '../services/BiometricService';

// Store
import { useAuthStore } from '../store/authStore';
import { useLocationStore } from '../store/locationStore';
import { useAttendanceStore } from '../store/attendanceStore';

// Types
import { AttendanceMethod, AttendanceType } from '../types/Attendance';
import { Location } from '../types/Location';

// Utils
import { Colors } from '../utils/colors';
import { formatTime, formatDate } from '../utils/dateUtils';

const { width, height } = Dimensions.get('window');

interface AttendanceScreenProps {
  navigation: any;
}

const AttendanceScreen: React.FC<AttendanceScreenProps> = ({ navigation }) => {
  const { user } = useAuthStore();
  const { currentLocation } = useLocationStore();
  const {
    currentStatus,
    todayAttendance,
    isLoading,
    checkIn,
    checkOut,
    fetchTodayAttendance
  } = useAttendanceStore();

  const [selectedMethod, setSelectedMethod] = useState<AttendanceMethod>(AttendanceMethod.GPS);
  const [showCamera, setShowCamera] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [nearbyBeacons, setNearbyBeacons] = useState<any[]>([]);
  const [geofenceStatus, setGeofenceStatus] = useState<'inside' | 'outside' | 'unknown'>('unknown');

  const cameraRef = useRef<Camera>(null);
  const devices = __DEV__ && Platform.OS === 'ios' ? [] : useCameraDevices();
  const device = devices.find(d => d.position === 'front');

  useEffect(() => {
    initializeScreen();
    const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timeInterval);
  }, []);

  // useEffect(() => {
  //   if (selectedMethod === AttendanceMethod.BEACON) {
  //     startBeaconScanning();
  //   } else {
  //     stopBeaconScanning();
  //   }
  // }, [selectedMethod]);

  useEffect(() => {
    if (currentLocation) {
      checkGeofenceStatus();
    }
  }, [currentLocation]);

  const initializeScreen = async () => {
    try {
      await fetchTodayAttendance();
      await LocationService.startLocationUpdates();

      if (selectedMethod === AttendanceMethod.FACE_RECOGNITION) {
        await requestCameraPermission();
      }
    } catch (error) {
      console.error('Screen initialization error:', error);
    }
  };

  const requestCameraPermission = async () => {
    try {
      if (__DEV__ && Platform.OS === 'ios') {
        console.log('Skipping camera permission request on iOS simulator');
        return;
      }

      const permission = await Camera.requestCameraPermission();
      if (permission === 'denied') {
        Alert.alert(
          'Camera Permission',
          'Camera access is required for face recognition attendance.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Camera permission error:', error);
    }
  };

  // const startBeaconScanning = async () => {
  //   try {
  //     await BeaconService.startRanging({ identifier: 'default', uuid: 'E2C56DB5-DFFB-48D2-B060-D0F5A71096E0' });
  //     BeaconService.onBeaconsDetected((beacons) => {
  //       setNearbyBeacons(beacons);
  //     });
  //   } catch (error) {
  //     console.error('Beacon scanning error:', error);
  //   }
  // };

  // const stopBeaconScanning = () => {
  //   BeaconService.stopRanging({ identifier: 'default', uuid: 'E2C56DB5-DFFB-48D2-B060-D0F5A71096E0' });
  //   setNearbyBeacons([]);
  // };

  const checkGeofenceStatus = async () => {
    try {
      if (!currentLocation) return;

      const isInside = await LocationService.isInsideGeofence(
        currentLocation.latitude,
        currentLocation.longitude
      );

      setGeofenceStatus(isInside ? 'inside' : 'outside');
    } catch (error) {
      console.error('Geofence check error:', error);
      setGeofenceStatus('unknown');
    }
  };

  const handleAttendance = async (type: AttendanceType) => {
    if (isProcessing) return;

    setIsProcessing(true);
    Vibration.vibrate(100);

    try {
      let attendanceData: any = {
        type,
        method: selectedMethod,
        timestamp: new Date().toISOString(),
        deviceInfo: await getDeviceInfo(),
      };

      // Add method-specific data
      switch (selectedMethod) {
        case 'GPS':
          if (!currentLocation) {
            throw new Error('Location not available');
          }
          if (geofenceStatus !== 'inside') {
            throw new Error('You are not within the allowed location');
          }
          attendanceData.location = currentLocation;
          break;

        case AttendanceMethod.FACE_RECOGNITION:
          if (!device) {
            throw new Error('Camera not available');
          }
          const faceData = await captureFaceData();
          attendanceData.faceData = faceData;
          break;

        case AttendanceMethod.BEACON:
          if (nearbyBeacons.length === 0) {
            throw new Error('No authorized beacons detected');
          }
          attendanceData.beaconData = nearbyBeacons[0];
          break;

        case AttendanceMethod.BIOMETRIC:
          const biometricResult = await BiometricService.authenticate();
          if (!biometricResult.success) {
            throw new Error('Biometric authentication failed');
          }
          attendanceData.biometricData = biometricResult;
          break;

        case AttendanceMethod.MANUAL:
          // Manual check-in requires manager approval
          attendanceData.requiresApproval = true;
          break;
      }

      // Submit attendance
      if (type === AttendanceType.CHECK_IN) {
        await checkIn(attendanceData);
      } else {
        await checkOut(attendanceData);
      }

      // Show success feedback
      Alert.alert(
        'Success',
        `${type === AttendanceType.CHECK_IN ? 'Check-in' : 'Check-out'} successful!`,
        [{ text: 'OK' }]
      );

      // Refresh attendance data
      await fetchTodayAttendance();

    } catch (error) {
      console.error('Attendance error:', error);
      Alert.alert(
        'Error',
        (error instanceof Error ? error.message : 'Failed to record attendance. Please try again.'),
        [{ text: 'OK' }]
      );
    } finally {
      setIsProcessing(false);
      setShowCamera(false);
    }
  };

  const captureFaceData = async (): Promise<any> => {
    try {
      if (__DEV__ && Platform.OS === 'ios') {
        console.log('Skipping photo capture on iOS simulator');
        return {
          photoPath: 'simulator-placeholder',
          confidence: 0.95,
          faceId: 'face-simulator-' + Date.now(),
        };
      }

      if (!cameraRef.current) {
        throw new Error('Camera not ready');
      }

      const photo = await cameraRef.current.takePhoto({
        qualityPrioritization: 'speed',
      });

      const faceResult = await FaceRecognitionService.verifyFace(photo.path);

      if (!faceResult.success) {
        throw new Error('Face verification failed');
      }

      return {
        photoPath: photo.path,
        confidence: faceResult.confidence,
        faceId: 'face-' + Date.now(),
      };
    } catch (error) {
      throw new Error(`Face capture failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const getDeviceInfo = async () => {
    if (__DEV__ && Platform.OS === 'ios') {
      console.log('Using placeholder device info on iOS simulator');
      return {
        deviceId: 'ios-simulator-' + Date.now(),
        deviceName: 'iOS Simulator',
        systemVersion: '17.0',
        appVersion: '1.0.0',
        platform: Platform.OS,
      };
    }

    try {
      const DeviceInfo = require('react-native-device-info');
      return {
        deviceId: await DeviceInfo.getUniqueId(),
        deviceName: await DeviceInfo.getDeviceName(),
        systemVersion: DeviceInfo.getSystemVersion(),
        appVersion: DeviceInfo.getVersion(),
        platform: Platform.OS,
      };
    } catch (error) {
      console.error('DeviceInfo error:', error);
      return {
        deviceId: 'unknown-device-' + Date.now(),
        deviceName: 'Unknown Device',
        systemVersion: 'Unknown',
        appVersion: '1.0.0',
        platform: Platform.OS,
      };
    }
  };

  const renderMethodSelector = () => (
    <Card style={styles.methodCard}>
      <Card.Content>
        <Title>Attendance Method</Title>
        <View style={styles.methodContainer}>
          {(['GPS', 'Face', 'Beacon', 'Biometric', 'Manual'] as AttendanceMethod[]).map((method) => (
            <TouchableOpacity
              key={method}
              style={[
                styles.methodButton,
                selectedMethod === method && styles.selectedMethod
              ]}
              onPress={() => setSelectedMethod(method)}
            >
              <Icon
                name={getMethodIcon(method)}
                size={24}
                color={selectedMethod === method ? Colors.white : Colors.primary}
              />
              <Text style={[
                styles.methodText,
                selectedMethod === method && styles.selectedMethodText
              ]}>
                {method}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card.Content>
    </Card>
  );

  const renderStatusCard = () => (
    <Card style={styles.statusCard}>
      <Card.Content>
        <View style={styles.statusHeader}>
          <View>
            <Title style={styles.timeText}>{formatTime(currentTime)}</Title>
            <Paragraph>{formatDate(currentTime)}</Paragraph>
          </View>
          <View style={[
            styles.statusBadge,
            { backgroundColor: currentStatus === 'checked_in' ? Colors.success : Colors.warning }
          ]}>
            <Text style={styles.statusText}>
              {currentStatus === 'checked_in' ? 'Checked In' : 'Checked Out'}
            </Text>
          </View>
        </View>

        {todayAttendance && (
          <View style={styles.attendanceInfo}>
            <Text>Check-in: {todayAttendance.timestamp || 'Not recorded'}</Text>
            <Text>Check-out: {'Not recorded'}</Text>
            <Text>Total Hours: {'0:00'}</Text>
          </View>
        )}
      </Card.Content>
    </Card>
  );

  const renderLocationStatus = () => (
    <Card style={styles.locationCard}>
      <Card.Content>
        <View style={styles.locationHeader}>
          <Icon name="location-on" size={24} color={Colors.primary} />
          <Title>Location Status</Title>
        </View>
        <View style={styles.locationInfo}>
          <View style={[
            styles.locationBadge,
            { backgroundColor: getLocationStatusColor() }
          ]}>
            <Text style={styles.locationText}>
              {geofenceStatus === 'inside' ? 'Inside Work Area' :
               geofenceStatus === 'outside' ? 'Outside Work Area' : 'Checking...'}
            </Text>
          </View>
          {selectedMethod === AttendanceMethod.BEACON && (
            <Text style={styles.beaconText}>
              Beacons detected: {nearbyBeacons.length}
            </Text>
          )}
        </View>
      </Card.Content>
    </Card>
  );

  const renderAttendanceButtons = () => (
    <View style={styles.buttonContainer}>
      <TouchableOpacity
        style={[
          styles.attendanceButton,
          styles.checkInButton,
          (currentStatus === 'checked_in' || isProcessing) && styles.disabledButton
        ]}
        onPress={() => handleAttendance(AttendanceType.CHECK_IN)}
        disabled={currentStatus === 'checked_in' || isProcessing}
      >
        <LinearGradient
          colors={[Colors.success, Colors.successDark]}
          style={styles.buttonGradient}
        >
          {isProcessing ? (
            <ActivityIndicator color={Colors.white} size="large" />
          ) : (
            <>
              <Icon name="login" size={32} color={Colors.white} />
              <Text style={styles.buttonText}>Check In</Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.attendanceButton,
          styles.checkOutButton,
          (currentStatus === 'checked_out' || isProcessing) && styles.disabledButton
        ]}
        onPress={() => handleAttendance(AttendanceType.CHECK_OUT)}
        disabled={currentStatus === 'checked_out' || isProcessing}
      >
        <LinearGradient
          colors={[Colors.error, Colors.errorDark]}
          style={styles.buttonGradient}
        >
          {isProcessing ? (
            <ActivityIndicator color={Colors.white} size="large" />
          ) : (
            <>
              <Icon name="logout" size={32} color={Colors.white} />
              <Text style={styles.buttonText}>Check Out</Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  const renderCamera = () => {
    if (!showCamera || (!device && !(__DEV__ && Platform.OS === 'ios'))) return null;

    if (__DEV__ && Platform.OS === 'ios') {
      return (
        <View style={styles.cameraContainer}>
          <View style={[styles.camera, { backgroundColor: Colors.gray, justifyContent: 'center', alignItems: 'center' }]}>
            <Text style={{ color: Colors.white, fontSize: 18 }}>Camera not available on iOS simulator</Text>
          </View>
          <View style={styles.cameraOverlay}>
            <TouchableOpacity
              style={styles.captureButton}
              onPress={() => handleAttendance(currentStatus === 'checked_out' ? AttendanceType.CHECK_IN : AttendanceType.CHECK_OUT)}
            >
              <Icon name="camera" size={32} color={Colors.white} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowCamera(false)}
            >
              <Icon name="close" size={24} color={Colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.cameraContainer}>
        <Camera
          ref={cameraRef}
          style={styles.camera}
          device={device!}
          isActive={showCamera}
          photo={true}
        />
        <View style={styles.cameraOverlay}>
          <TouchableOpacity
            style={styles.captureButton}
            onPress={() => handleAttendance(currentStatus === 'checked_out' ? AttendanceType.CHECK_IN : AttendanceType.CHECK_OUT)}
          >
            <Icon name="camera" size={32} color={Colors.white} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setShowCamera(false)}
          >
            <Icon name="close" size={24} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const getMethodIcon = (method: AttendanceMethod): string => {
    switch (method) {
      case AttendanceMethod.GPS: return 'location-on';
      case AttendanceMethod.FACE_RECOGNITION: return 'face';
      case AttendanceMethod.BEACON: return 'bluetooth';
      case AttendanceMethod.BIOMETRIC: return 'fingerprint';
      case AttendanceMethod.MANUAL: return 'edit';
      default: return 'help';
    }
  };

  const getLocationStatusColor = (): string => {
    switch (geofenceStatus) {
      case 'inside': return Colors.success;
      case 'outside': return Colors.error;
      default: return Colors.warning;
    }
  };

  if (selectedMethod === AttendanceMethod.FACE_RECOGNITION && showCamera) {
    return renderCamera();
  }

  return (
    <View style={styles.container}>
      {renderStatusCard()}
      {renderLocationStatus()}
      {renderMethodSelector()}
      {renderAttendanceButtons()}

      <FAB
        style={styles.fab}
        icon="history"
        onPress={() => navigation.navigate('AttendanceHistory')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 16,
  },
  statusCard: {
    marginBottom: 16,
    elevation: 4,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  timeText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: Colors.white,
    fontWeight: 'bold',
  },
  attendanceInfo: {
    backgroundColor: Colors.lightGray,
    padding: 12,
    borderRadius: 8,
  },
  locationCard: {
    marginBottom: 16,
    elevation: 4,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationInfo: {
    alignItems: 'flex-start',
  },
  locationBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 8,
  },
  locationText: {
    color: Colors.white,
    fontWeight: 'bold',
  },
  beaconText: {
    color: Colors.gray,
    fontSize: 12,
  },
  methodCard: {
    marginBottom: 24,
    elevation: 4,
  },
  methodContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  methodButton: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: Colors.lightGray,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedMethod: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primaryDark,
  },
  methodText: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  selectedMethodText: {
    color: Colors.white,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 'auto',
  },
  attendanceButton: {
    width: '48%',
    height: 80,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 8,
  },
  checkInButton: {
    // Specific styles for check-in button
  },
  checkOutButton: {
    // Specific styles for check-out button
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 4,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  cancelButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.primary,
  },
});

export default AttendanceScreen;

