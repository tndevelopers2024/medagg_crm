import React, { useState, useEffect } from "react";
import { SafeAreaView, ActivityIndicator, View } from "react-native";
import LoginScreen from "./screens/LoginScreen";
import DashboardScreen from "./screens/DashboardScreen";
import RecordingsListScreen from "./screens/RecordingsListScreen";
import LeadDetailsScreen from "./screens/LeadDetailsScreen";
import { storage } from "./utils/storage";

type Screen = 'login' | 'dashboard' | 'recordings';

const App: React.FC = () => {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentScreen, setCurrentScreen] = useState<Screen>('login');

  useEffect(() => {
    const init = async () => {
      const savedToken = await storage.getToken();
      if (savedToken) {
        setToken(savedToken);
        setCurrentScreen('dashboard');
      }
      setLoading(false);
    };
    init();
  }, []);

  const handleLogin = async (newToken: string) => {
    await storage.saveToken(newToken);
    setToken(newToken);
    setCurrentScreen('dashboard');
  };

  const handleLogout = async () => {
    await storage.removeToken();
    setToken(null);
    setCurrentScreen('login');
  };

  const navigation = {
    navigate: (screen: Screen) => setCurrentScreen(screen),
    goBack: () => setCurrentScreen('dashboard'),
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#5D01F2" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      {currentScreen === 'login' && (
        <LoginScreen onLogin={handleLogin} />
      )}
      {currentScreen === 'dashboard' && token && (
        <DashboardScreen token={token} onLogout={handleLogout} navigation={navigation} />
      )}
    </SafeAreaView>
  );
};

export default App;
