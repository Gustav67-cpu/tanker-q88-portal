import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Linking, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Header } from "@/components/Header";
import { Button } from "@/components/Button";
import { Field, FieldRow } from "@/components/Field";
import { VesselStatusBadge } from "@/components/StatusBadge";
import { supabase } from "@/lib/supabase";
import { fmtDate, fmtDwt, fmtNumber } from "@/lib/format";
import { publicShareUrl, shareVesselMessage, waLink } from "@/lib/whatsapp";
import type { Vessel } from "@/lib/types";

// Charterer-safe vessel fields — explicitly excludes owner_id and q88_file_url.
const CHARTERER_SAFE =
  "id,vessel_name,imo_number,dwt,year_built,flag,class_society,loa,beam,max_draft,cargo_capacity_cbm,number_of_tanks,tank_coating,pumps,heating_coils,imo_class,sire_status,cdi_status,last_3_cargoes,trading_area,opening_port,opening_date,status,remarks,public_share_token,created_at,updated_at";

type SafeVessel = Omit<Vessel, "owner_id" | "q88_file_url">;

export default function ChartererVessel() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [v, setV] = useState<SafeVessel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("vessels")
          .select(CHARTERER_SAFE)
          .eq("id", id)
          .maybeSingle();
        if (error) throw error;
        setV((data ?? null) as SafeVessel | null);
      } catch (e: any) {
        Alert.alert("Could not load vessel", e?.message ?? "Unknown error");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  function shareVessel() {
    if (!v) return;
    const url = publicShareUrl(v.public_share_token);
    const msg = shareVesselMessage({
      vesselName: v.vessel_name,
      dwt: v.dwt,
      openingPort: v.opening_port,
      openingDate: v.opening_date,
      shareUrl: url,
    });
    Linking.openURL(waLink(null, msg)).catch(() => Alert.alert("Could not open WhatsApp"));
  }

  if (loading) {
    return (
      <View className="flex-1 bg-bg">
        <Header title="Vessel" back />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#0B3D91" />
        </View>
      </View>
    );
  }

  if (!v) {
    return (
      <View className="flex-1 bg-bg">
        <Header title="Vessel" back />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-muted text-center">Vessel not found or no longer available.</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg">
      <Header title={v.vessel_name} subtitle="Q88 summary" back />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
        <View className="bg-white rounded-2xl p-4 border border-line mb-3">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-base font-semibold text-ink">Identity</Text>
            <VesselStatusBadge status={v.status} />
          </View>
          <FieldRow>
            <Field label="Vessel" value={v.vessel_name} />
            <Field label="IMO" value={v.imo_number} />
          </FieldRow>
          <FieldRow>
            <Field label="Year built" value={v.year_built} />
            <Field label="Flag" value={v.flag} />
          </FieldRow>
        </View>

        <View className="bg-white rounded-2xl p-4 border border-line mb-3">
          <Text className="text-base font-semibold text-ink mb-3">Capacity</Text>
          <FieldRow>
            <Field label="DWT" value={fmtDwt(v.dwt)} />
            <Field label="Cargo cbm" value={fmtNumber(v.cargo_capacity_cbm)} />
          </FieldRow>
          <FieldRow>
            <Field label="LOA" value={fmtNumber(v.loa, " m")} />
            <Field label="Beam" value={fmtNumber(v.beam, " m")} />
          </FieldRow>
          <FieldRow>
            <Field label="Max draft" value={fmtNumber(v.max_draft, " m")} />
            <Field label="Tanks" value={v.number_of_tanks} />
          </FieldRow>
        </View>

        <View className="bg-white rounded-2xl p-4 border border-line mb-3">
          <Text className="text-base font-semibold text-ink mb-3">Equipment</Text>
          <FieldRow>
            <Field label="Tank coating" value={v.tank_coating} />
            <Field label="Pumps" value={v.pumps} />
          </FieldRow>
          <FieldRow>
            <Field label="Heating coils" value={v.heating_coils == null ? "—" : v.heating_coils ? "Yes" : "No"} />
            <Field label="IMO class" value={v.imo_class} />
          </FieldRow>
        </View>

        <View className="bg-white rounded-2xl p-4 border border-line mb-3">
          <Text className="text-base font-semibold text-ink mb-3">Class & Inspection</Text>
          <FieldRow>
            <Field label="Class society" value={v.class_society} />
            <Field label="Flag" value={v.flag} />
          </FieldRow>
          <FieldRow>
            <Field label="SIRE" value={v.sire_status} />
            <Field label="CDI" value={v.cdi_status} />
          </FieldRow>
        </View>

        <View className="bg-white rounded-2xl p-4 border border-line mb-3">
          <Text className="text-base font-semibold text-ink mb-3">Cargo & Position</Text>
          <Field label="Last 3 cargoes" value={v.last_3_cargoes} />
          <Field label="Trading area" value={v.trading_area} />
          <FieldRow>
            <Field label="Opening port" value={v.opening_port} />
            <Field label="Opening date" value={fmtDate(v.opening_date)} />
          </FieldRow>
          <Field label="Remarks" value={v.remarks} />
        </View>

        <View className="mb-3">
          <Button
            label="Select / Request This Tanker"
            onPress={() =>
              router.push({ pathname: "/charterer/request/[id]", params: { id: v.id } })
            }
            fullWidth
          />
        </View>
        <Button label="Share via WhatsApp" variant="secondary" onPress={shareVessel} fullWidth />
      </ScrollView>
    </View>
  );
}
