import React from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  body?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon = "boat-outline", title, body, action }: Props) {
  return (
    <View className="items-center justify-center py-12 px-6">
      <View className="bg-navy-50 rounded-full p-4 mb-3">
        <Ionicons name={icon} size={32} color="#0B3D91" />
      </View>
      <Text className="text-base font-semibold text-ink text-center">{title}</Text>
      {body ? <Text className="text-sm text-muted text-center mt-1">{body}</Text> : null}
      {action ? <View className="mt-4 w-full">{action}</View> : null}
    </View>
  );
}
