import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, ActivityIndicator, Image, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './lib/auth';
import HomeScreen from './screens/HomeScreen';
import WalkScreen from './screens/WalkScreen';
import MapScreen from './screens/MapScreen';
import HistoryScreen from './screens/HistoryScreen';
import FriendDogsScreen from './screens/FriendDogsScreen';
import DogProfileScreen from './screens/DogProfileScreen';

const Tab = createBottomTabNavigator();

function AppNavigator() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Image source={require('./assets/img/loading-dog.png')} style={styles.loadingImage} />
        <Text style={styles.loadingTitle}>おさんぽノート</Text>
        <Text style={styles.loadingSubText}>もうすぐ出発！🐾</Text>
        <ActivityIndicator size="large" color="#fff" style={{ marginTop: 16 }} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#FF8C42',
          tabBarInactiveTintColor: '#B2BEC3',
          tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#F0F0F0' },
        }}
      >
        <Tab.Screen
          name="ホーム"
          component={HomeScreen}
          options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🏠</Text> }}
        />
        <Tab.Screen
          name="散歩"
          component={WalkScreen}
          options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🐾</Text> }}
        />
        <Tab.Screen
          name="マップ"
          component={MapScreen}
          options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🗺️</Text> }}
        />
        <Tab.Screen
          name="履歴"
          component={HistoryScreen}
          options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>📋</Text> }}
        />
        <Tab.Screen
          name="友達犬"
          component={FriendDogsScreen}
          options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🐶</Text> }}
        />
        <Tab.Screen
          name="わんこ"
          component={DogProfileScreen}
          options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🦴</Text> }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fddb13',
  },
  loadingImage: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
  },
  loadingTitle: {
    marginTop: 16,
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 2,
  },
  loadingSubText: {
    marginTop: 12,
    fontSize: 16,
    color: '#fff',
  },
});

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
