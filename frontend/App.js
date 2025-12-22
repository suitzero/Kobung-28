import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, SafeAreaView, Switch } from 'react-native';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import CompanionScene from './components/CompanionScene';
import { saveToQueue, getQueue, removeFromQueue, isOnline } from './utils/OfflineManager';
import { BACKEND_URL, ENV_USE_STANDALONE_MODE } from './config';
import { transcribeAudio } from './services/OpenAIService';
import { chatWithGemini } from './services/GeminiService';
import { saveTrainingData } from './utils/TrainingDataManager';

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

  // Continuous Recording
  const [isContinuous, setIsContinuous] = useState(false);
  const continuousTimer = useRef(null);
  const CHUNK_DURATION_MS = 30000; // 30 seconds

  // Mock Mode
  const [isMockMode, setIsMockMode] = useState(false);
  const [isStandalone, setIsStandalone] = useState(ENV_USE_STANDALONE_MODE === 'true');

  // Audio Playback
  const [sound, setSound] = useState();

  useEffect(() => {
    // Request permissions on mount if not granted
    if (permissionResponse && permissionResponse.status !== 'granted') {
      requestPermission();
    }

    // Configure audio session immediately to allow background music
    Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
        shouldDuckAndroid: true,
        staysActiveInBackground: true,
    }).catch(err => console.error("Failed to set initial audio mode", err));

    // Check initial queue size
    checkQueue();
  }, [permissionResponse]);

  // Cleanup sound
  useEffect(() => {
    return sound
      ? () => {
          console.log('Unloading Sound');
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  const checkQueue = async () => {
    const queue = await getQueue();
    setQueueCount(queue.length);
  };

  const playCustomVoice = async (text) => {
    if (isMuted || !text) return;

    // Stop previous sound
    if (sound) {
        await sound.stopAsync();
    }

    if (isMockMode) {
      // In mock mode, just log it or simulate visual feedback
      console.log("[MOCK] Playing audio for:", text);
      setIsSpeaking(true);
      setTimeout(() => setIsSpeaking(false), 2000);
      return;
    }

    try {
        const response = await fetch(`${BACKEND_URL}/speak`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text }),
        });

        const data = await response.json();
        if (data.audioContent) {
            // Play from base64
            const uri = `data:audio/mp3;base64,${data.audioContent}`;
            console.log('Loading Sound');
            const { sound: newSound } = await Audio.Sound.createAsync(
                { uri: uri },
                { shouldPlay: true }
            );
            setSound(newSound);

            setIsSpeaking(true);
            newSound.setOnPlaybackStatusUpdate((status) => {
                if (status.didJustFinish) {
                    setIsSpeaking(false);
                }
            });
        }
    } catch (e) {
        console.error("Failed to play custom voice", e);
        setIsSpeaking(false);
    }
  };

  const stopPlayback = async () => {
      if (sound) {
          await sound.stopAsync();
          setIsSpeaking(false);
      }
  };

  const toggleMute = () => {
    if (!isMuted) {
      stopPlayback();
    }
    setIsMuted(!isMuted);
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    // Stop speaking if the user interrupts
    stopPlayback();

    const userMessage = { role: 'user', content: inputText };
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    if (isMockMode) {
      setTimeout(() => {
        const mockReply = `[MOCK] I heard: "${userMessage.content}". This is a client-only response.`;
        setMessages(prev => [...prev, { role: 'ai', content: mockReply }]);
        playCustomVoice(mockReply);
        setIsLoading(false);
      }, 1000);
      return;
    }

    try {
      let replyText;

      if (isStandalone) {
          // Direct API Call
          const allMessages = [...messages, userMessage];
          replyText = await chatWithGemini(allMessages);
      } else {
          // Backend Call
          const backendUrl = `${BACKEND_URL}/chat`;
          const response = await fetch(backendUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: userMessage.content }),
          });
          const data = await response.json();
          replyText = data.reply;
      }

      const aiMessage = { role: 'ai', content: replyText };

      setMessages(prev => [...prev, aiMessage]);
      playCustomVoice(replyText);

    } catch (error) {
      console.error("Error sending message:", error);
      setMessages(prev => [...prev, { role: 'system', content: `Error: ${error.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = async () => {
    // Stop speaking when user wants to talk
    stopPlayback();

    try {
      if (permissionResponse.status !== 'granted') {
        console.log('Requesting permission..');
        await requestPermission();
      }

      // Allow recording while music plays (MixWithOthers)
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
        shouldDuckAndroid: true,
        staysActiveInBackground: true,
      });

      console.log('Starting recording..');
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
      console.log('Recording started');

      if (isContinuous) {
          // If continuous mode is on, set a timer to stop and restart
          if (continuousTimer.current) clearTimeout(continuousTimer.current);
          continuousTimer.current = setTimeout(cycleRecording, CHUNK_DURATION_MS);
      }
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  // Helper to restart recording in continuous mode
  const cycleRecording = async () => {
      console.log("Cycling recording chunk...");
      await stopRecording(true); // pass flag to indicate we are cycling
      // Small delay to ensure clean state
      setTimeout(startRecording, 500);
  };

  const stopRecording = async (isCycling = false) => {
    console.log('Stopping recording..');

    // Clear timer if manually stopped or cycling
    if (continuousTimer.current) {
        clearTimeout(continuousTimer.current);
        continuousTimer.current = null;
    }

    if (!isCycling) {
        // Only turn off recording state if fully stopping
        setIsRecording(false);
    }

    if (!recording) return;

    try {
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        console.log('Recording stopped and stored at', uri);
        setRecording(undefined);
        sendAudio(uri);
    } catch (e) {
        console.error("Error stopping recording", e);
    }
  };

  // We need to use a Ref for recording to handle the interval closure issue
  const recordingRef = useRef(null);

  // Redefine start/stop with Ref
  const startRecordingRef = async () => {
      stopPlayback();
      try {
        // Ensure any previous recording is unloaded
        if (recordingRef.current) {
            try {
                await recordingRef.current.stopAndUnloadAsync();
            } catch (cleanupErr) {
                console.log("Cleanup previous recording error", cleanupErr);
            }
            recordingRef.current = null;
        }

        await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
            interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
            interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
            shouldDuckAndroid: true,
            staysActiveInBackground: true
        });
        const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
        recordingRef.current = recording;
        setRecording(recording); // Keep state for UI
        setIsRecording(true);

        if (isContinuous) {
            if (continuousTimer.current) clearTimeout(continuousTimer.current);
            continuousTimer.current = setTimeout(cycleRecordingRef, CHUNK_DURATION_MS);
        }
      } catch (err) { console.error('Failed start', err); }
  };

  const stopRecordingRef = async (isCycling = false) => {
      if (continuousTimer.current) { clearTimeout(continuousTimer.current); continuousTimer.current = null; }
      if (!isCycling) setIsRecording(false);

      if (recordingRef.current) {
          try {
              await recordingRef.current.stopAndUnloadAsync();
              const uri = recordingRef.current.getURI();
              recordingRef.current = null;
              setRecording(undefined);
              sendAudio(uri);
          } catch(e) { console.error(e); }
      }
  };

  const cycleRecordingRef = async () => {
      if (!isContinuous) return; // Stop if user toggled off
      await stopRecordingRef(true);
      setTimeout(startRecordingRef, 200);
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

    if (isMockMode) {
      setTimeout(() => {
        const mockTranscription = "This is a mock transcription of your voice.";
        const mockReply = `[MOCK] I heard you say: "${mockTranscription}"`;
        const userMessage = { role: 'user', content: `🎤 ${mockTranscription}` };
        const aiMessage = { role: 'ai', content: mockReply };
        setMessages(prev => [...prev, userMessage, aiMessage]);
        playCustomVoice(mockReply);
        setIsLoading(false);
      }, 1500);
      return;
    }

    try {
      if (isStandalone) {
          // 1. Transcribe directly
          const text = await transcribeAudio(uri);

          // 2. Save for fine-tuning
          await saveTrainingData(uri, text);

          // 3. Continue chat flow
          const userMessage = { role: 'user', content: `🎤 ${text}` };
          setMessages(prev => [...prev, userMessage]);
          setIsLoading(true);

          // 4. Get AI Reply
          const allMessages = [...messages, userMessage];
          const replyText = await chatWithGemini(allMessages);

          const aiMessage = { role: 'ai', content: replyText };
          setMessages(prev => [...prev, aiMessage]);
          playCustomVoice(replyText);

      } else {
          await uploadAudioFile(uri);
      }
    } catch (error) {
      console.error("Error sending voice:", error);
      if (!isStandalone) {
         // Fallback to queue if upload fails (only relevant for backend mode usually)
         await saveToQueue(uri);
         await checkQueue();
      }
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
      playCustomVoice(data.reply);
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
        <View style={styles.headerControls}>
             <View style={styles.switchContainer}>
                <Text style={styles.switchLabel}>Mock</Text>
                <Switch
                    value={isMockMode}
                    onValueChange={setIsMockMode}
                    trackColor={{ false: "#767577", true: "#81b0ff" }}
                    thumbColor={isMockMode ? "#f5dd4b" : "#f4f3f4"}
                />
             </View>
             <View style={styles.switchContainer}>
                <Text style={styles.switchLabel}>Direct AI</Text>
                <Switch
                    value={isStandalone}
                    onValueChange={setIsStandalone}
                    trackColor={{ false: "#767577", true: "#81b0ff" }}
                    thumbColor={isStandalone ? "#00ff00" : "#f4f3f4"}
                />
             </View>
             <View style={styles.switchContainer}>
                <Text style={styles.switchLabel}>Loop</Text>
                <Switch
                    value={isContinuous}
                    onValueChange={(v) => {
                        setIsContinuous(v);
                        if (!v && isRecording) stopRecordingRef(); // Stop if turning off while running
                    }}
                />
             </View>
             <TouchableOpacity onPress={toggleMute} style={styles.muteButton}>
                <Text style={styles.headerButtonText}>{isMuted ? '🔇' : '🔊'}</Text>
             </TouchableOpacity>
        </View>

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
            onPressIn={() => { if(!isContinuous) startRecordingRef(); }}
            onPressOut={() => { if(!isContinuous) stopRecordingRef(); }}
            onPress={() => {
                if (isContinuous) {
                    // Toggle recording if continuous
                    if (isRecording) stopRecordingRef();
                    else startRecordingRef();
                }
            }}
            activeOpacity={0.7}
          >
             <Text style={styles.micButtonText}>{isRecording ? '🟥' : '🎤'}</Text>
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder={isContinuous ? "Tap mic to start/stop loop" : "Type or hold mic..."}
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
  headerControls: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
  },
  switchContainer: {
      backgroundColor: 'rgba(0,0,0,0.5)',
      padding: 5,
      borderRadius: 20,
      flexDirection: 'row',
      alignItems: 'center',
  },
  switchLabel: {
      color: 'white',
      marginRight: 5,
      fontSize: 10,
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
