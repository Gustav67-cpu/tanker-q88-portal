import React from "react";
import { Text, TextInput, View, TextInputProps } from "react-native";

interface Props extends TextInputProps {
  label?: string;
  error?: string | null;
  hint?: string;
}

export function Input({ label, error, hint, style, ...rest }: Props) {
  return (
    <View className="mb-3">
      {label ? <Text className="mb-1 text-sm font-medium text-ink">{label}</Text> : null}
      <TextInput
        placeholderTextColor="#94A3B8"
        className={`border rounded-xl px-3 py-3 text-base bg-white ${
          error ? "border-danger" : "border-line"
        }`}
        {...rest}
      />
      {error ? <Text className="mt-1 text-xs text-danger">{error}</Text> : null}
      {hint && !error ? <Text className="mt-1 text-xs text-muted">{hint}</Text> : null}
    </View>
  );
}
