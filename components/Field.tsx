import React from "react";
import { Text, View } from "react-native";

export function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <View className="flex-1 mb-3">
      <Text className="text-xs text-muted">{label}</Text>
      <Text className="text-sm text-ink font-medium mt-0.5">
        {value === undefined || value === null || value === "" ? "—" : value}
      </Text>
    </View>
  );
}

export function FieldRow({ children }: { children: React.ReactNode }) {
  return <View className="flex-row gap-3">{children}</View>;
}
