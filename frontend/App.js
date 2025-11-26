import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import CompanionScene from './components/CompanionScene';

export default function App() {
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage = { role: 'user', content: inputText };
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      // Replace with your backend URL
      // For Android Emulator use 10.0.2.2, for iOS simulator use localhost
      const backendUrl = 'http://localhost:3000/chat';

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

      // Simulate speaking animation
      setIsSpeaking(true);
      setTimeout(() => setIsSpeaking(false), 3000); // Stop after 3 seconds or based on text length

    } catch (error) {
      console.error("Error sending message:", error);
      setMessages(prev => [...prev, { role: 'system', content: 'Error connecting to companion backend.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.sceneContainer}>
        <CompanionScene isSpeaking={isSpeaking} />
      </View>

      <View style={styles.chatContainer}>
        <View style={styles.messagesList}>
            {messages.map((msg, index) => (
              <View key={index} style={[styles.messageBubble, msg.role === 'user' ? styles.userBubble : styles.aiBubble]}>
                <Text style={styles.messageText}>{msg.content}</Text>
              </View>
            ))}
            {isLoading && <Text style={styles.loadingText}>Companion is thinking...</Text>}
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Talk to your companion..."
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
});
