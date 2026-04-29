import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, View } from "react-native";
import { Redirect } from "expo-router";
import { Header } from "@/components/Header";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

export default function ProfileScreen() {
  const { loading, session, profile, signOut, refreshProfile } = useAuth();
  const [companyName, setCompanyName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (profile) {
      setCompanyName(profile.company_name ?? "");
      setContactPerson(profile.contact_person ?? "");
      setWhatsappNumber(profile.whatsapp_number ?? "");
    }
  }, [profile]);

  if (loading) {
    return (
      <View className="flex-1 bg-bg">
        <Header title="Profile" back />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#0B3D91" />
        </View>
      </View>
    );
  }

  if (!session || !profile) return <Redirect href="/login" />;

  async function save() {
    if (!session?.user) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          company_name: companyName.trim() || null,
          contact_person: contactPerson.trim() || null,
          whatsapp_number: whatsappNumber.trim() || null,
        })
        .eq("id", session.user.id);
      if (error) throw error;
      await refreshProfile();
      Alert.alert("Profile saved");
    } catch (e: any) {
      Alert.alert("Could not save profile", e?.message ?? "Unknown error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className="flex-1 bg-bg">
      <Header title="Profile" subtitle={profile.role} back />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
        <View className="bg-white rounded-2xl p-4 border border-line mb-4">
          <Input label="Email" value={profile.email} editable={false} />
          <Input
            label="Company name"
            value={companyName}
            onChangeText={setCompanyName}
            placeholder="ACME Tankers Ltd"
          />
          <Input
            label="Contact person"
            value={contactPerson}
            onChangeText={setContactPerson}
            placeholder="Jane Doe"
          />
          <Input
            label="WhatsApp number"
            value={whatsappNumber}
            onChangeText={setWhatsappNumber}
            keyboardType="phone-pad"
            placeholder="+44 7…"
            hint="Used by the broker only — never shared with the counterparty."
          />
          <Button label="Save profile" onPress={save} loading={busy} fullWidth />
        </View>
        <Button label="Sign out" variant="danger" onPress={signOut} fullWidth />
        <Text className="text-center text-xs text-muted mt-6">Tanker Q88 Portal</Text>
      </ScrollView>
    </View>
  );
}
