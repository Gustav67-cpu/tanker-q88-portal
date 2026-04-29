import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { Link, useRouter } from "expo-router";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Banner } from "@/components/Banner";
import { useAuth } from "@/lib/auth";
import { supabaseConfigured } from "@/lib/supabase";

export default function Login() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    setBusy(true);
    setErr(null);
    const { error } = await signIn(email.trim(), password);
    setBusy(false);
    if (error) setErr(error);
    else router.replace("/");
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-navy-500"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerClassName="flex-grow justify-center px-6 py-10">
        <View className="bg-white rounded-3xl p-6 shadow-lg">
          <Text className="text-2xl font-bold text-navy-600 text-center">Tanker Q88 Portal</Text>
          <Text className="text-sm text-muted text-center mt-1 mb-6">
            Owners list. Charterers shop. Broker fixes.
          </Text>

          {!supabaseConfigured ? (
            <Banner tone="danger">
              Supabase keys are missing. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in
              Replit Secrets and Environment Variables, then restart the dev server.
            </Banner>
          ) : null}

          <Input
            label="Email"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            placeholder="you@company.com"
          />
          <Input
            label="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
          />
          {err ? <Text className="text-danger text-xs mb-2">{err}</Text> : null}
          <Button label="Sign in" onPress={onSubmit} loading={busy} fullWidth />

          <View className="flex-row justify-center mt-4">
            <Text className="text-sm text-muted">No account? </Text>
            <Link href="/signup" className="text-sm text-navy-600 font-semibold">
              Create one
            </Link>
          </View>
        </View>
        <Text className="text-center text-xs text-navy-100 mt-6">
          Broker-mediated negotiations · 2.5% commission from Owners
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
