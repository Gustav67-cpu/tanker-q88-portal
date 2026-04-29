import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Header } from "@/components/Header";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { BrokerNotice } from "@/components/Banner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

interface Form {
  cargo: string;
  quantity: string;
  load_port: string;
  discharge_port: string;
  laycan_from: string;
  laycan_to: string;
  freight_idea: string;
  demurrage_idea: string;
  charter_party_form: string;
  special_requirements: string;
  charterer_company: string;
  charterer_contact_person: string;
  charterer_whatsapp_number: string;
}

export default function ChartererRequest() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session, profile, refreshProfile } = useAuth();

  const [vesselName, setVesselName] = useState<string | null>(null);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState<Form>({
    cargo: "",
    quantity: "",
    load_port: "",
    discharge_port: "",
    laycan_from: "",
    laycan_to: "",
    freight_idea: "",
    demurrage_idea: "",
    charter_party_form: "",
    special_requirements: "",
    charterer_company: "",
    charterer_contact_person: "",
    charterer_whatsapp_number: "",
  });

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("vessels")
          .select("id, vessel_name, owner_id")
          .eq("id", id)
          .maybeSingle();
        if (error) throw error;
        if (!data) {
          Alert.alert("Vessel not found");
          router.back();
          return;
        }
        setVesselName(data.vessel_name);
        setOwnerId(data.owner_id);
      } catch (e: any) {
        Alert.alert("Could not load vessel", e?.message ?? "Unknown error");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, router]);

  // Pre-fill from profile.
  useEffect(() => {
    if (profile) {
      setForm((f) => ({
        ...f,
        charterer_company: f.charterer_company || profile.company_name || "",
        charterer_contact_person: f.charterer_contact_person || profile.contact_person || "",
        charterer_whatsapp_number: f.charterer_whatsapp_number || profile.whatsapp_number || "",
      }));
    }
  }, [profile]);

  function set<K extends keyof Form>(k: K, v: Form[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit() {
    if (!session?.user || !id || !ownerId) return;
    if (!form.cargo.trim()) {
      Alert.alert("Cargo is required");
      return;
    }
    setBusy(true);
    try {
      // 1) Persist contact info onto profile so future requests pre-fill.
      const profileUpdate: Record<string, string | null> = {};
      if (form.charterer_company.trim()) profileUpdate.company_name = form.charterer_company.trim();
      if (form.charterer_contact_person.trim())
        profileUpdate.contact_person = form.charterer_contact_person.trim();
      if (form.charterer_whatsapp_number.trim())
        profileUpdate.whatsapp_number = form.charterer_whatsapp_number.trim();
      if (Object.keys(profileUpdate).length > 0) {
        const { error: pErr } = await supabase
          .from("profiles")
          .update(profileUpdate)
          .eq("id", session.user.id);
        if (pErr) throw pErr;
        await refreshProfile();
      }

      // 2) Create the fixture request.
      const { error: fErr } = await supabase.from("fixture_requests").insert({
        vessel_id: id,
        charterer_id: session.user.id,
        owner_id: ownerId,
        broker_id: null,
        status: "New request",
        cargo: form.cargo.trim() || null,
        quantity: form.quantity.trim() || null,
        load_port: form.load_port.trim() || null,
        discharge_port: form.discharge_port.trim() || null,
        laycan_from: form.laycan_from.trim() || null,
        laycan_to: form.laycan_to.trim() || null,
        freight_idea: form.freight_idea.trim() || null,
        demurrage_idea: form.demurrage_idea.trim() || null,
        charter_party_form: form.charter_party_form.trim() || null,
        special_requirements: form.special_requirements.trim() || null,
      });
      if (fErr) throw fErr;

      Alert.alert(
        "Sent to Broker",
        "They will review and contact you on WhatsApp.",
        [
          {
            text: "OK",
            onPress: () => router.replace("/charterer/my-requests"),
          },
        ]
      );
    } catch (e: any) {
      Alert.alert("Could not send request", e?.message ?? "Unknown error");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <View className="flex-1 bg-bg">
        <Header title="Request tanker" back />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#0B3D91" />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg">
      <Header title="Request tanker" subtitle={vesselName ?? undefined} back />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
        <BrokerNotice />

        <Section title="Cargo & ports">
          <Input label="Cargo *" value={form.cargo} onChangeText={(v) => set("cargo", v)} placeholder="ULSD" />
          <Input
            label="Quantity"
            value={form.quantity}
            onChangeText={(v) => set("quantity", v)}
            placeholder="30,000 mt +/- 5%"
          />
          <Input label="Load port" value={form.load_port} onChangeText={(v) => set("load_port", v)} />
          <Input
            label="Discharge port"
            value={form.discharge_port}
            onChangeText={(v) => set("discharge_port", v)}
          />
          <Input
            label="Laycan from"
            value={form.laycan_from}
            onChangeText={(v) => set("laycan_from", v)}
            placeholder="YYYY-MM-DD"
          />
          <Input
            label="Laycan to"
            value={form.laycan_to}
            onChangeText={(v) => set("laycan_to", v)}
            placeholder="YYYY-MM-DD"
          />
        </Section>

        <Section title="Commercial">
          <Input
            label="Freight idea"
            value={form.freight_idea}
            onChangeText={(v) => set("freight_idea", v)}
            placeholder="WS125 / lump sum / $/mt"
          />
          <Input
            label="Demurrage idea"
            value={form.demurrage_idea}
            onChangeText={(v) => set("demurrage_idea", v)}
            placeholder="$/day"
          />
          <Input
            label="C/P form"
            value={form.charter_party_form}
            onChangeText={(v) => set("charter_party_form", v)}
            placeholder="ASBATANKVOY / BPVOY4 / SHELLVOY6"
          />
          <Input
            label="Special requirements"
            value={form.special_requirements}
            onChangeText={(v) => set("special_requirements", v)}
            multiline
            numberOfLines={3}
          />
        </Section>

        <Section title="Your contact (Broker only)">
          <Text className="text-xs text-muted mb-2">
            Used by the broker to revert to you on WhatsApp. Saved to your profile for next time.
          </Text>
          <Input
            label="Company"
            value={form.charterer_company}
            onChangeText={(v) => set("charterer_company", v)}
          />
          <Input
            label="Contact person"
            value={form.charterer_contact_person}
            onChangeText={(v) => set("charterer_contact_person", v)}
          />
          <Input
            label="WhatsApp number"
            value={form.charterer_whatsapp_number}
            onChangeText={(v) => set("charterer_whatsapp_number", v)}
            keyboardType="phone-pad"
            placeholder="+44 7…"
          />
        </Section>

        <Button label="Send request to Broker" onPress={onSubmit} loading={busy} fullWidth />
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-4 bg-white rounded-2xl p-4 border border-line">
      <Text className="text-base font-semibold text-ink mb-3">{title}</Text>
      {children}
    </View>
  );
}
