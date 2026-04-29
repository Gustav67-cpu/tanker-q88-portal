import React from "react";
import { Text, View } from "react-native";
import { Link, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

export default function NotFound() {
  return (
    <>
      <Stack.Screen options={{ title: "Not found" }} />
      <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-xl font-semibold text-ink">Page not found</Text>
          <Text className="text-sm text-muted text-center mt-2">
            The page you were looking for doesn't exist or you don't have access to it.
          </Text>
          <Link href="/" className="mt-6 text-navy-600 font-semibold">
            Go home
          </Link>
        </View>
      </SafeAreaView>
    </>
  );
}
