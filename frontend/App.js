import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import CompanionScene from './components/CompanionScene';
import { saveToQueue, getQueue, removeFromQueue, isOnline } from './utils/OfflineManager';
import { BACKEND_URL } from './config';

export default function App() {
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [queueCount, setQueueCount] = useState(0);

  // Voice state
  const [recording, setRecording] = useState();
  const [permissionResponse, requestPermission] = Audio.usePermissions();
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    // Request permissions on mount if not granted
    if (permissionResponse && permissionResponse.status !== 'granted') {
      requestPermission();
    }
    // Check initial queue size
    checkQueue();
  }, [permissionResponse]);

  const checkQueue = async () => {
    const queue = await getQueue();
    setQueueCount(queue.length);
  };

  const speak = (text) => {
    if (isMuted) return;

    // Stop previous speech
    Speech.stop();

    Speech.speak(text, {
      onStart: () => setIsSpeaking(true),
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
      onError: (err) => {
        console.error("Speech error:", err);
        setIsSpeaking(false);
      },
    });
  };

  const toggleMute = () => {
    if (!isMuted) {
      Speech.stop();
      setIsSpeaking(false);
    }
    setIsMuted(!isMuted);
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    // Stop speaking if the user interrupts
    Speech.stop();
    setIsSpeaking(false);

    const userMessage = { role: 'user', content: inputText };
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const backendUrl = `${BACKEND_URL}/chat`;

      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessage.content }),
      });

      const data = await response.json();
      const aiMessage = { role: 'ai', content: data.reply };

      setMessages(prev => [...prev, aiMessage]);
      speak(data.reply);

    } catch (error) {
      console.error("Error sending message:", error);
      setMessages(prev => [...prev, { role: 'system', content: 'Error connecting to companion backend.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = async () => {
    // Stop speaking when user wants to talk
    Speech.stop();
    setIsSpeaking(false);

    try {
      if (permissionResponse.status !== 'granted') {
        console.log('Requesting permission..');
        await requestPermission();
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log('Starting recording..');
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
      console.log('Recording started');
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    console.log('Stopping recording..');
    setRecording(undefined);
    setIsRecording(false);

    if (!recording) return;

    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    console.log('Recording stopped and stored at', uri);

    sendAudio(uri);
  };

  const sendAudio = async (uri) => {
    // Check connection
    const online = await isOnline();
    if (!online) {
        console.log("Offline: Queueing audio");
        await saveToQueue(uri);
        await checkQueue();
        setMessages(prev => [...prev, { role: 'system', content: 'Offline: Recording queued for sync.' }]);
        return;
    }

    setIsLoading(true);
    try {
      await uploadAudioFile(uri);
    } catch (error) {
      console.error("Error sending voice:", error);
      // Fallback to queue if upload fails
      await saveToQueue(uri);
      await checkQueue();
      setMessages(prev => [...prev, { role: 'system', content: 'Upload failed. Queued for later.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const uploadAudioFile = async (uri) => {
      const backendUrl = `${BACKEND_URL}/voice`;

      const formData = new FormData();
      formData.append('audio', {
        uri: uri,
        type: 'audio/m4a', // expo-av default is m4a
        name: 'voice.m4a',
      });

      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");

      const data = await response.json();

      // Add user's transcribed text
      const userMessage = { role: 'user', content: `🎤 ${data.transcription}` };
      const aiMessage = { role: 'ai', content: data.reply };

      setMessages(prev => [...prev, userMessage, aiMessage]);
      speak(data.reply);
  };

  const syncQueue = async () => {
    const queue = await getQueue();
    if (queue.length === 0) return;

    const online = await isOnline();
    if (!online) {
        setMessages(prev => [...prev, { role: 'system', content: 'Still offline. Cannot sync.' }]);
        return;
    }

    setMessages(prev => [...prev, { role: 'system', content: `Syncing ${queue.length} items...` }]);

    // Process queue
    let successCount = 0;
    for (const item of queue) {
        try {
            await uploadAudioFile(item.uri);
            await removeFromQueue(item.id);
            successCount++;
        } catch (e) {
            console.error("Failed to sync item", item.id, e);
        }
    }

    await checkQueue();
    setMessages(prev => [...prev, { role: 'system', content: `Sync complete. Sent ${successCount} items.` }]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={toggleMute} style={styles.muteButton}>
           <Text style={styles.headerButtonText}>{isMuted ? '🔇 Unmute' : '🔊 Mute'}</Text>
        </TouchableOpacity>
        {queueCount > 0 && (
             <TouchableOpacity onPress={syncQueue} style={[styles.muteButton, { marginTop: 10, backgroundColor: 'orange' }]}>
                <Text style={styles.headerButtonText}>🔄 Sync ({queueCount})</Text>
             </TouchableOpacity>
        )}
      </View>

      <View style={styles.sceneContainer}>
        <CompanionScene isSpeaking={isSpeaking} />
      </View>

      <View style={styles.chatContainer}>
        <View style={styles.messagesList}>
            {messages.map((msg, index) => (
              <View key={index} style={[styles.messageBubble, msg.role === 'user' ? styles.userBubble : styles.aiBubble, msg.role === 'system' && styles.systemBubble]}>
                <Text style={styles.messageText}>{msg.content}</Text>
              </View>
            ))}
            {isLoading && <Text style={styles.loadingText}>Companion is listening/thinking...</Text>}
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.inputContainer}>
          <TouchableOpacity
            style={[styles.micButton, isRecording && styles.micButtonRecording]}
            onPressIn={startRecording}
            onPressOut={stopRecording}
            activeOpacity={0.7}
          >
             <Text style={styles.micButtonText}>{isRecording ? '🔴' : '🎤'}</Text>
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type or hold mic..."
            placeholderTextColor="#999"
          />
          <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    alignItems: 'flex-end',
  },
  muteButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 8,
    borderRadius: 20,
  },
  headerButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  sceneContainer: {
    flex: 1, // Takes up top half
    width: '100%',
  },
  chatContainer: {
    flex: 1, // Takes up bottom half
    backgroundColor: '#16213e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 10,
  },
  messagesList: {
    flex: 1,
    paddingVertical: 10,
  },
  messageBubble: {
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
    maxWidth: '80%',
  },
  userBubble: {
    backgroundColor: '#0f3460',
    alignSelf: 'flex-end',
  },
  aiBubble: {
    backgroundColor: '#e94560',
    alignSelf: 'flex-start',
  },
  systemBubble: {
    backgroundColor: '#444',
    alignSelf: 'center',
  },
  messageText: {
    color: '#fff',
  },
  loadingText: {
    color: '#ccc',
    fontStyle: 'italic',
    alignSelf: 'center',
    marginTop: 5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    color: '#fff',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: '#e94560',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  micButton: {
    backgroundColor: '#0f3460',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  micButtonRecording: {
    backgroundColor: 'red',
    borderWidth: 2,
    borderColor: '#fff',
  },
  micButtonText: {
    fontSize: 24,
  }
});
