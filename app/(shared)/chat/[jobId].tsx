import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, FlatList, SafeAreaView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { getSocket } from '../../../src/hooks/useSocket';
import { useAuthStore } from '../../../src/stores/authStore';

interface Message {
  id: string;
  senderId: string;
  text?: string;
  imageUrl?: string;
  timestamp: string;
  isRead?: boolean;
}

export default function ChatScreen() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const router = useRouter();
  const socket = getSocket();
  const user = useAuthStore(state => state.user);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!socket) return;
    
    // Join room
    socket.emit('join:job', jobId);

    const messageHandler = (msg: Message) => {
      setMessages(prev => [...prev, msg]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      
      // Mark as read if it's not ours
      if (msg.senderId !== user?.id) {
        socket.emit('chat:read', { jobId, messageId: msg.id });
      }
    };

    socket.on('chat:message', messageHandler);

    return () => {
      socket.off('chat:message', messageHandler);
    };
  }, [socket, jobId, user?.id]);

  const sendMessage = () => {
    if (!inputText.trim() && !socket) return;
    
    socket?.emit('chat:send', { jobId, text: inputText.trim() });
    setInputText('');
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      // In a real app, upload to Firebase Storage and get URL
      const mockUrl = result.assets[0].uri;
      socket?.emit('chat:send', { jobId, imageUrl: mockUrl });
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.senderId === user?.id;
    const timeString = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (isMe) {
      return (
        <View style={[styles.messageWrapper, styles.messageWrapperRight]}>
          <LinearGradient colors={['#FF6B1A', '#F59E0B']} style={styles.bubbleRight}>
            {item.text ? <Text style={styles.textRight}>{item.text}</Text> : null}
            <View style={styles.timestampRow}>
              <Text style={styles.timestampRight}>{timeString}</Text>
              <Text style={styles.readReceipt}>{item.isRead ? '✓✓' : '✓'}</Text>
            </View>
          </LinearGradient>
        </View>
      );
    }

    return (
      <View style={[styles.messageWrapper, styles.messageWrapperLeft]}>
        <View style={styles.bubbleLeft}>
          {item.text ? <Text style={styles.textLeft}>{item.text}</Text> : null}
          <Text style={styles.timestampLeft}>{timeString}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Job Chat</Text>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView 
        style={styles.keyboardAvoid} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.listContent}
        />

        <View style={styles.inputContainer}>
          <TouchableOpacity onPress={pickImage} style={styles.attachBtn}>
            <Text style={styles.attachText}>📷</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            placeholderTextColor="#C4B5A5"
          />
          <TouchableOpacity onPress={sendMessage} style={styles.sendBtn} disabled={!inputText.trim()}>
            <Text style={[styles.sendText, !inputText.trim() && { opacity: 0.5 }]}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDF6EE' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#EEE0CC' },
  backBtn: { width: 60 },
  backText: { color: '#6B5C4E', fontFamily: 'Nunito-Bold' },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: 'Syne-Bold', fontSize: 18, color: '#1C1410' },
  keyboardAvoid: { flex: 1 },
  listContent: { padding: 16, gap: 12 },
  messageWrapper: { width: '100%', marginBottom: 16 },
  messageWrapperRight: { alignItems: 'flex-end' },
  messageWrapperLeft: { alignItems: 'flex-start' },
  bubbleRight: {
    maxWidth: '80%',
    padding: 12,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 5,
  },
  bubbleLeft: {
    maxWidth: '80%',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderWidth: 1,
    borderColor: '#F5E8D5',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 5,
    borderBottomRightRadius: 16,
  },
  textRight: { color: '#FFFFFF', fontFamily: 'Nunito-SemiBold', fontSize: 16 },
  textLeft: { color: '#1C1410', fontFamily: 'Nunito-SemiBold', fontSize: 16 },
  timestampRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 4, marginTop: 4 },
  timestampRight: { fontFamily: 'DMMono-Regular', fontSize: 10, color: 'rgba(255,255,255,0.7)' },
  timestampLeft: { fontFamily: 'DMMono-Regular', fontSize: 10, color: '#C4B5A5', marginTop: 4, textAlign: 'right' },
  readReceipt: { fontFamily: 'DMMono-Medium', fontSize: 10, color: '#FFFFFF' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#EEE0CC' },
  attachBtn: { padding: 8, marginRight: 8 },
  attachText: { fontSize: 24 },
  input: { flex: 1, height: 40, backgroundColor: '#FDF6EE', borderRadius: 20, paddingHorizontal: 16, fontFamily: 'Nunito-Regular', color: '#1C1410' },
  sendBtn: { marginLeft: 12, paddingHorizontal: 12, paddingVertical: 8 },
  sendText: { fontFamily: 'Nunito-Bold', color: '#FF6B1A', fontSize: 16 },
});
