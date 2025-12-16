import { Platform } from 'react-native';

const getBackendUrl = () => {
    // Replace with your local IP if running on a physical device.
    // e.g. 'http://192.168.1.100:3000'

    if (Platform.OS === 'android') {
        // Android Emulator
        return 'http://10.0.2.2:3000';
    }

    // iOS Simulator, Web
    return 'http://localhost:3000';
}

export const BACKEND_URL = getBackendUrl();
