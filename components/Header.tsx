import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

interface Props {
  title: string;
  subtitle?: string;
  back?: boolean;
  right?: React.ReactNode;
}

export function Header({ title, subtitle, back, right }: Props) {
  const router = useRouter();
  return (
    <View className="bg-navy-500 px-4 pt-2 pb-4">
      <View className="flex-row items-center">
        {back ? (
          <Pressable onPress={() => router.back()} className="-ml-2 mr-1 p-2">
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </Pressable>
        ) : null}
        <View className="flex-1">
          <Text className="text-white text-lg font-semibold" numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text className="text-navy-100 text-xs mt-0.5" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {right}
      </View>
    </View>
  );
}
