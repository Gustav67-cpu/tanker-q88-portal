import React from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Tone = "info" | "warning" | "success" | "danger";

const tones: Record<Tone, { bg: string; text: string; icon: keyof typeof Ionicons.glyphMap }> = {
  info: { bg: "bg-navy-50 border-navy-100", text: "text-navy-700", icon: "information-circle-outline" },
  warning: { bg: "bg-amber-50 border-amber-200", text: "text-amber-800", icon: "warning-outline" },
  success: { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-800", icon: "checkmark-circle-outline" },
  danger: { bg: "bg-rose-50 border-rose-200", text: "text-rose-800", icon: "alert-circle-outline" },
};

export function Banner({ tone = "info", children }: { tone?: Tone; children: React.ReactNode }) {
  const t = tones[tone];
  return (
    <View className={`flex-row items-start gap-2 rounded-xl border p-3 mb-3 ${t.bg}`}>
      <Ionicons name={t.icon} size={18} color="#0B3D91" />
      <Text className={`flex-1 text-xs ${t.text}`}>{children}</Text>
    </View>
  );
}

export function BrokerNotice() {
  return (
    <Banner tone="info">
      All negotiations are handled through the Broker/Admin. No direct Charterer–Owner
      communication is permitted through the platform. Broker commission: 2.5% payable by
      Owners' side upon fixture, unless otherwise agreed.
    </Banner>
  );
}
