import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import * as FileSystem from 'expo-file-system';

const QUEUE_KEY = 'offline_voice_queue';

export const saveToQueue = async (uri) => {
  try {
    const queueJson = await AsyncStorage.getItem(QUEUE_KEY);
    const queue = queueJson ? JSON.parse(queueJson) : [];

    // Move file to permanent storage
    const fileName = uri.split('/').pop();
    const newPath = FileSystem.documentDirectory + fileName;
    await FileSystem.moveAsync({
      from: uri,
      to: newPath
    });

    queue.push({
      uri: newPath,
      timestamp: Date.now(),
      id: Date.now().toString()
    });

    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    console.log('Saved to offline queue', queue.length);
    return queue.length;
  } catch (e) {
    console.error("Error saving to queue", e);
    return -1;
  }
};

export const getQueue = async () => {
  try {
    const queueJson = await AsyncStorage.getItem(QUEUE_KEY);
    return queueJson ? JSON.parse(queueJson) : [];
  } catch (e) {
    return [];
  }
};

export const removeFromQueue = async (id) => {
  try {
    const queue = await getQueue();
    const updatedQueue = queue.filter(item => item.id !== id);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(updatedQueue));

    // Optionally delete the file if we want to clean up immediately,
    // but usually we rely on success to mean it's uploaded.
    // However, if we remove from queue, we should probably delete the local file too
    // to save space, assuming it was uploaded.
    const item = queue.find(i => i.id === id);
    if (item) {
        await FileSystem.deleteAsync(item.uri, { idempotent: true });
    }

    return updatedQueue.length;
  } catch (e) {
    console.error("Error removing from queue", e);
  }
}

export const clearQueue = async () => {
  try {
      const queue = await getQueue();
      // Delete all files
      for (const item of queue) {
          await FileSystem.deleteAsync(item.uri, { idempotent: true });
      }
      await AsyncStorage.removeItem(QUEUE_KEY);
  } catch (e) {
      console.error("Error clearing queue", e);
  }
};

export const isOnline = async () => {
  const state = await NetInfo.fetch();
  return state.isConnected && state.isInternetReachable;
};
