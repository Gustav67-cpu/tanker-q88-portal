import React from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect, Stack } from "expo-router";
import { useAuth } from "@/lib/auth";

export default function ChartererLayout() {
  const { loading, session, profile } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator color="#0B3D91" />
      </View>
    );
  }

  if (!session || !profile) return <Redirect href="/login" />;
  if (profile.role !== "charterer" && profile.role !== "admin") {
    return <Redirect href="/" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
