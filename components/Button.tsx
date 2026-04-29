import React from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";

interface Props {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

const styleByVariant: Record<Variant, { container: string; text: string }> = {
  primary: { container: "bg-navy-500 active:bg-navy-600", text: "text-white" },
  secondary: { container: "bg-navy-50 active:bg-navy-100 border border-navy-100", text: "text-navy-600" },
  ghost: { container: "bg-transparent active:bg-navy-50", text: "text-navy-600" },
  danger: { container: "bg-danger active:opacity-90", text: "text-white" },
  success: { container: "bg-success active:opacity-90", text: "text-white" },
};

export function Button({ label, onPress, variant = "primary", loading, disabled, icon, fullWidth }: Props) {
  const s = styleByVariant[variant];
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      className={`${s.container} ${fullWidth ? "w-full" : ""} rounded-xl px-4 py-3 ${
        isDisabled ? "opacity-50" : ""
      }`}
    >
      <View className="flex-row items-center justify-center gap-2">
        {loading ? <ActivityIndicator color={variant === "secondary" || variant === "ghost" ? "#0B3D91" : "#fff"} /> : icon}
        <Text className={`${s.text} font-semibold text-base`}>{label}</Text>
      </View>
    </Pressable>
  );
}
