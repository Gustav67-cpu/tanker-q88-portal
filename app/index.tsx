import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/lib/auth";

export default function Index() {
  const { loading, session, profile } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator color="#0B3D91" />
      </View>
    );
  }

  if (!session) return <Redirect href="/login" />;
  if (!profile) return <Redirect href="/login" />;

  if (profile.role === "admin") return <Redirect href="/admin" />;
  if (profile.role === "owner") return <Redirect href="/owner" />;
  return <Redirect href="/charterer" />;
}
