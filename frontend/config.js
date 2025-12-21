import { Platform } from 'react-native';
import { GEMINI_API_KEY, OPENAI_API_KEY, USE_STANDALONE_MODE } from '@env';

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
export const ENV_GEMINI_API_KEY = GEMINI_API_KEY;
export const ENV_OPENAI_API_KEY = OPENAI_API_KEY;
export const ENV_USE_STANDALONE_MODE = USE_STANDALONE_MODE;
