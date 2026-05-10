// app/_layout.jsx
import { Stack } from "expo-router";
import React, { useEffect } from "react";
import { Provider } from "react-redux";
import { initDatabase } from "../database/initDB";
import { store } from "../redux/store";

import { DoctorPlanStateProvider } from "../redux/PageStates/DoctorPlanState";

export default function RootLayout() {
  const [dbReady, setDbReady] = React.useState(false);

  useEffect(() => {
    const initAndHydrate = async () => {
      try {
        await initDatabase();
        setDbReady(true);
      } catch (err) {
        console.error("Initialization error:", err);
      }
    };
    initAndHydrate();
  }, []);

  if (!dbReady) {
    return null; // Or a splash screen component
  }

  return (
    <Provider store={store}>
      <DoctorPlanStateProvider>
        <Stack screenOptions={{ headerShown: false, statusBarStyle: 'dark', animation: 'default' }}>
          <Stack.Screen name="Login" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="PlannedScreen" options={{ headerShown: false }} />
          <Stack.Screen name="CreatePlan" options={{ headerShown: false }} />
          <Stack.Screen name="DoctorPlan" options={{ headerShown: false }} />
          <Stack.Screen name="RecentVisit" options={{ headerShown: false }} />
          <Stack.Screen name="DoctorList" options={{ headerShown: false }} />

        </Stack>
      </DoctorPlanStateProvider>
    </Provider>
  );
}
