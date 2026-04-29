import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/Button";
import { Field, FieldRow } from "@/components/Field";
import { supabase } from "@/lib/supabase";
import { fmtDate, fmtDwt, fmtNumber } from "@/lib/format";
import type { PublicVessel } from "@/lib/types";

export default function PublicShare() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const [vessel, setVessel] = useState<PublicVessel | null>(null);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const { data, error } = await supabase.rpc("public_vessel_by_token", { token });
        if (error) throw error;
        const row = Array.isArray(data) ? data[0] : data;
        if (!row) {
          setErrored(true);
          return;
        }
        setVessel(row as PublicVessel);
      } catch {
        setErrored(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  function contactBroker() {
    const name = vessel?.vessel_name ?? "tanker";
    const text = `Open tanker: ${name} – please revert.`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    Linking.openURL(url).catch(() => {});
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#0B3D91" />
        </View>
      </SafeAreaView>
    );
  }

  if (errored || !vessel) {
    return (
      <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-base font-semibold text-ink mb-2">Share link inactive</Text>
          <Text className="text-sm text-muted text-center">
            This share link is no longer active.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <View className="bg-navy-500 px-4 py-4">
        <Text className="text-white text-lg font-semibold" numberOfLines={1}>
          {vessel.vessel_name}
        </Text>
        <Text className="text-navy-100 text-xs mt-0.5">Tanker Q88 — public summary</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
        <View className="bg-white rounded-2xl p-4 border border-line mb-3">
          <Text className="text-base font-semibold text-ink mb-3">Identity</Text>
          <FieldRow>
            <Field label="Vessel" value={vessel.vessel_name} />
            <Field label="IMO" value={vessel.imo_number} />
          </FieldRow>
          <FieldRow>
            <Field label="Year built" value={vessel.year_built} />
            <Field label="Flag" value={vessel.flag} />
          </FieldRow>
        </View>

        <View className="bg-white rounded-2xl p-4 border border-line mb-3">
          <Text className="text-base font-semibold text-ink mb-3">Capacity</Text>
          <FieldRow>
            <Field label="DWT" value={fmtDwt(vessel.dwt)} />
            <Field label="Cargo cbm" value={fmtNumber(vessel.cargo_capacity_cbm)} />
          </FieldRow>
          <FieldRow>
            <Field label="LOA" value={fmtNumber(vessel.loa, " m")} />
            <Field label="Beam" value={fmtNumber(vessel.beam, " m")} />
          </FieldRow>
          <FieldRow>
            <Field label="Max draft" value={fmtNumber(vessel.max_draft, " m")} />
            <Field label="Tanks" value={vessel.number_of_tanks} />
          </FieldRow>
        </View>

        <View className="bg-white rounded-2xl p-4 border border-line mb-3">
          <Text className="text-base font-semibold text-ink mb-3">Equipment</Text>
          <FieldRow>
            <Field label="Tank coating" value={vessel.tank_coating} />
            <Field label="Pumps" value={vessel.pumps} />
          </FieldRow>
          <FieldRow>
            <Field
              label="Heating coils"
              value={vessel.heating_coils == null ? "—" : vessel.heating_coils ? "Yes" : "No"}
            />
            <Field label="IMO class" value={vessel.imo_class} />
          </FieldRow>
        </View>

        <View className="bg-white rounded-2xl p-4 border border-line mb-3">
          <Text className="text-base font-semibold text-ink mb-3">Class & Inspection</Text>
          <FieldRow>
            <Field label="Class society" value={vessel.class_society} />
            <Field label="Flag" value={vessel.flag} />
          </FieldRow>
          <FieldRow>
            <Field label="SIRE" value={vessel.sire_status} />
            <Field label="CDI" value={vessel.cdi_status} />
          </FieldRow>
        </View>

        <View className="bg-white rounded-2xl p-4 border border-line mb-3">
          <Text className="text-base font-semibold text-ink mb-3">Cargo & Position</Text>
          <Field label="Last 3 cargoes" value={vessel.last_3_cargoes} />
          <Field label="Trading area" value={vessel.trading_area} />
          <FieldRow>
            <Field label="Opening port" value={vessel.opening_port} />
            <Field label="Opening date" value={fmtDate(vessel.opening_date)} />
          </FieldRow>
          <Field label="Remarks" value={vessel.remarks} />
        </View>

        <Button label="Get in touch via Broker" variant="success" onPress={contactBroker} fullWidth />

        <Pressable
          onPress={() => Linking.openURL("/").catch(() => {})}
          className="mt-6 items-center"
        >
          <Text className="text-xs text-muted">Powered by Tanker Q88 Portal</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
