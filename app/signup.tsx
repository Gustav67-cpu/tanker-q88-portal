import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { Link, useRouter } from "expo-router";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { useAuth } from "@/lib/auth";
import type { UserRole } from "@/lib/types";

type SignupRole = Exclude<UserRole, "admin">;

export default function Signup() {
  const router = useRouter();
  const { signUp } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [role, setRole] = useState<SignupRole>("charterer");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    if (password.length < 6) {
      setErr("Password must be at least 6 characters.");
      return;
    }
    setBusy(true);
    setErr(null);
    const { error } = await signUp(email.trim(), password, role, companyName.trim());
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
          <Text className="text-2xl font-bold text-navy-600 text-center">Create account</Text>
          <Text className="text-sm text-muted text-center mt-1 mb-4">
            Pick your role. Admin/broker accounts are provisioned manually by the platform admin.
          </Text>

          <View className="flex-row bg-bg rounded-xl p-1 mb-4">
            {(["owner", "charterer"] as const).map((r) => (
              <Pressable
                key={r}
                onPress={() => setRole(r)}
                className={`flex-1 py-2 rounded-lg ${role === r ? "bg-navy-500" : ""}`}
              >
                <Text className={`text-center font-semibold capitalize ${role === r ? "text-white" : "text-navy-600"}`}>
                  {r}
                </Text>
              </Pressable>
            ))}
          </View>

          <Input
            label="Company name"
            value={companyName}
            onChangeText={setCompanyName}
            placeholder="ACME Tankers Ltd"
          />
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
            placeholder="At least 6 characters"
          />
          {err ? <Text className="text-danger text-xs mb-2">{err}</Text> : null}
          <Button label="Create account" onPress={onSubmit} loading={busy} fullWidth />

          <View className="flex-row justify-center mt-4">
            <Text className="text-sm text-muted">Already have an account? </Text>
            <Link href="/login" className="text-sm text-navy-600 font-semibold">
              Sign in
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
