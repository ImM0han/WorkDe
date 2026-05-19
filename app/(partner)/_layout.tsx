import { Tabs, useRouter } from 'expo-router';
import { Platform, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';

export default function PartnerLayout() {
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#EEE0CC',
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#FF6B1A',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarLabelStyle: { fontFamily: 'Nunito-SemiBold', fontSize: 11, marginTop: 4 },
      }}
    >
      <Tabs.Screen 
        name="index"         
        options={{ 
          title: 'Home',
          tabBarIcon: ({ color }) => <Feather name="home" size={24} color={color} />
        }} 
      />
      <Tabs.Screen 
        name="jobs"          
        options={{ 
          title: 'Jobs',
          tabBarIcon: ({ color }) => <Feather name="clipboard" size={24} color={color} />
        }} 
      />
      <Tabs.Screen 
        name="search"        
        options={{
          title: '',
          tabBarIcon: () => null,
          tabBarButton: (props) => (
            <TouchableOpacity
              {...(props as any)}
              style={[props.style, { justifyContent: 'center', alignItems: 'center' }]}
              onPress={() => router.push('/(partner)/search')}
              activeOpacity={0.8}
            >
              <View
                style={{
                  top: -15,
                  width: 56, height: 56,
                  borderRadius: 28,
                  overflow: 'hidden',
                  elevation: 8,
                  shadowColor: '#FF6B1A',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                }}
              >
                <LinearGradient colors={['#FF8C42','#FF6B1A']} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <Feather name="search" size={26} color="white" />
                </LinearGradient>
              </View>
            </TouchableOpacity>
          )
        }}
      />
      <Tabs.Screen 
        name="notifications" 
        options={{ 
          title: 'Alerts',
          tabBarIcon: ({ color }) => <Feather name="bell" size={24} color={color} />
        }} 
      />
      <Tabs.Screen 
        name="profile"       
        options={{ 
          title: 'Profile',
          tabBarIcon: ({ color }) => <Feather name="user" size={24} color={color} />
        }} 
      />
      
      <Tabs.Screen name="(modals)" options={{ href: null }} />
    </Tabs>
  );
}
