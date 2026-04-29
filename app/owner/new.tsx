import React, { useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { Header } from "@/components/Header";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type { VesselStatus } from "@/lib/types";

interface FormState {
  vessel_name: string;
  imo_number: string;
  dwt: string;
  year_built: string;
  flag: string;
  class_society: string;
  loa: string;
  beam: string;
  max_draft: string;
  cargo_capacity_cbm: string;
  number_of_tanks: string;
  tank_coating: string;
  pumps: string;
  heating_coils: boolean | null;
  imo_class: string;
  sire_status: string;
  cdi_status: string;
  last_3_cargoes: string;
  trading_area: string;
  opening_port: string;
  opening_date: string;
  status: VesselStatus;
  remarks: string;
  q88_file_url: string | null;
}

const EMPTY: FormState = {
  vessel_name: "",
  imo_number: "",
  dwt: "",
  year_built: "",
  flag: "",
  class_society: "",
  loa: "",
  beam: "",
  max_draft: "",
  cargo_capacity_cbm: "",
  number_of_tanks: "",
  tank_coating: "",
  pumps: "",
  heating_coils: null,
  imo_class: "",
  sire_status: "",
  cdi_status: "",
  last_3_cargoes: "",
  trading_area: "",
  opening_port: "",
  opening_date: "",
  status: "Open",
  remarks: "",
  q88_file_url: null,
};

export default function NewVessel() {
  const router = useRouter();
  const { session } = useAuth();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function uploadFile(uri: string, name: string) {
    if (!session?.user) return;
    try {
      setUploading(true);
      const userId = session.user.id;
      const safeName = name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${userId}/${Date.now()}-${safeName}`;

      // Read the file as a binary and upload. ArrayBuffer is reliable across web and RN.
      const res = await fetch(uri);
      const arrayBuffer = await res.arrayBuffer();

      const { error } = await supabase.storage
        .from("q88-files")
        .upload(path, arrayBuffer, { upsert: true, contentType: undefined });
      if (error) throw error;

      set("q88_file_url", path);
      Alert.alert("Q88 file uploaded", name);
    } catch (e: any) {
      Alert.alert("Upload failed", e?.message ?? "Unknown error");
    } finally {
      setUploading(false);
    }
  }

  async function pickDocument() {
    try {
      const r = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (r.canceled || !r.assets?.[0]) return;
      const a = r.assets[0];
      await uploadFile(a.uri, a.name ?? "document");
    } catch (e: any) {
      Alert.alert("Could not pick document", e?.message ?? "Unknown error");
    }
  }

  async function pickImage() {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission needed", "Photo library access is required.");
        return;
      }
      const r = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
      });
      if (r.canceled || !r.assets?.[0]) return;
      const a = r.assets[0];
      const name = a.fileName ?? `image-${Date.now()}.jpg`;
      await uploadFile(a.uri, name);
    } catch (e: any) {
      Alert.alert("Could not pick image", e?.message ?? "Unknown error");
    }
  }

  async function onSave() {
    if (!form.vessel_name.trim()) {
      Alert.alert("Vessel name required");
      return;
    }
    if (!session?.user) return;
    setBusy(true);
    try {
      const payload = {
        owner_id: session.user.id,
        vessel_name: form.vessel_name.trim(),
        imo_number: form.imo_number.trim() || null,
        dwt: form.dwt ? Number(form.dwt) : null,
        year_built: form.year_built ? Number(form.year_built) : null,
        flag: form.flag.trim() || null,
        class_society: form.class_society.trim() || null,
        loa: form.loa ? Number(form.loa) : null,
        beam: form.beam ? Number(form.beam) : null,
        max_draft: form.max_draft ? Number(form.max_draft) : null,
        cargo_capacity_cbm: form.cargo_capacity_cbm ? Number(form.cargo_capacity_cbm) : null,
        number_of_tanks: form.number_of_tanks ? Number(form.number_of_tanks) : null,
        tank_coating: form.tank_coating.trim() || null,
        pumps: form.pumps.trim() || null,
        heating_coils: form.heating_coils,
        imo_class: form.imo_class.trim() || null,
        sire_status: form.sire_status.trim() || null,
        cdi_status: form.cdi_status.trim() || null,
        last_3_cargoes: form.last_3_cargoes.trim() || null,
        trading_area: form.trading_area.trim() || null,
        opening_port: form.opening_port.trim() || null,
        opening_date: form.opening_date.trim() || null,
        status: form.status,
        remarks: form.remarks.trim() || null,
        q88_file_url: form.q88_file_url,
      };
      const { error } = await supabase.from("vessels").insert(payload);
      if (error) throw error;
      router.replace("/owner");
    } catch (e: any) {
      Alert.alert("Could not save vessel", e?.message ?? "Unknown error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className="flex-1 bg-bg">
      <Header title="New vessel" back />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
        <Section title="Identity">
          <Input
            label="Vessel name *"
            value={form.vessel_name}
            onChangeText={(v) => set("vessel_name", v)}
            placeholder="MT Aegean Pioneer"
          />
          <Input
            label="IMO number"
            value={form.imo_number}
            onChangeText={(v) => set("imo_number", v)}
            keyboardType="number-pad"
          />
        </Section>

        <Section title="Capacity">
          <Input
            label="DWT"
            value={form.dwt}
            onChangeText={(v) => set("dwt", v)}
            keyboardType="numeric"
          />
          <Input
            label="Year built"
            value={form.year_built}
            onChangeText={(v) => set("year_built", v)}
            keyboardType="number-pad"
          />
          <Input
            label="LOA (m)"
            value={form.loa}
            onChangeText={(v) => set("loa", v)}
            keyboardType="numeric"
          />
          <Input
            label="Beam (m)"
            value={form.beam}
            onChangeText={(v) => set("beam", v)}
            keyboardType="numeric"
          />
          <Input
            label="Max draft (m)"
            value={form.max_draft}
            onChangeText={(v) => set("max_draft", v)}
            keyboardType="numeric"
          />
          <Input
            label="Cargo capacity (cbm)"
            value={form.cargo_capacity_cbm}
            onChangeText={(v) => set("cargo_capacity_cbm", v)}
            keyboardType="numeric"
          />
          <Input
            label="Number of tanks"
            value={form.number_of_tanks}
            onChangeText={(v) => set("number_of_tanks", v)}
            keyboardType="number-pad"
          />
        </Section>

        <Section title="Equipment">
          <Input
            label="Tank coating"
            value={form.tank_coating}
            onChangeText={(v) => set("tank_coating", v)}
            placeholder="Epoxy / Marineline / SS"
          />
          <Input
            label="Pumps"
            value={form.pumps}
            onChangeText={(v) => set("pumps", v)}
            placeholder="3 x 600 m3/h"
          />
          <Text className="mb-1 text-sm font-medium text-ink">Heating coils</Text>
          <View className="flex-row gap-2 mb-3">
            {[
              { v: true as const, label: "Yes" },
              { v: false as const, label: "No" },
              { v: null as null, label: "—" },
            ].map((opt) => {
              const selected = form.heating_coils === opt.v;
              return (
                <Pressable
                  key={String(opt.label)}
                  onPress={() => set("heating_coils", opt.v)}
                  className={`px-4 py-2 rounded-full border ${
                    selected
                      ? "bg-navy-500 border-navy-500"
                      : "bg-white border-line"
                  }`}
                >
                  <Text
                    className={`text-sm font-semibold ${
                      selected ? "text-white" : "text-ink"
                    }`}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Input
            label="IMO class"
            value={form.imo_class}
            onChangeText={(v) => set("imo_class", v)}
            placeholder="II / III"
          />
        </Section>

        <Section title="Class & Inspection">
          <Input
            label="Flag"
            value={form.flag}
            onChangeText={(v) => set("flag", v)}
            placeholder="Marshall Islands"
          />
          <Input
            label="Class society"
            value={form.class_society}
            onChangeText={(v) => set("class_society", v)}
            placeholder="LR / DNV / ABS"
          />
          <Input
            label="SIRE status"
            value={form.sire_status}
            onChangeText={(v) => set("sire_status", v)}
          />
          <Input
            label="CDI status"
            value={form.cdi_status}
            onChangeText={(v) => set("cdi_status", v)}
          />
        </Section>

        <Section title="Cargo & Position">
          <Input
            label="Last 3 cargoes"
            value={form.last_3_cargoes}
            onChangeText={(v) => set("last_3_cargoes", v)}
            placeholder="ULSD / Jet A1 / Naphtha"
          />
          <Input
            label="Trading area"
            value={form.trading_area}
            onChangeText={(v) => set("trading_area", v)}
            placeholder="Worldwide / Med / WAF"
          />
          <Input
            label="Opening port"
            value={form.opening_port}
            onChangeText={(v) => set("opening_port", v)}
          />
          <Input
            label="Opening date"
            value={form.opening_date}
            onChangeText={(v) => set("opening_date", v)}
            placeholder="YYYY-MM-DD"
          />

          <Text className="mb-1 text-sm font-medium text-ink">Status</Text>
          <View className="flex-row bg-white rounded-xl p-1 mb-3 border border-line">
            {(["Open", "Fixed", "Hidden"] as VesselStatus[]).map((s) => {
              const selected = form.status === s;
              return (
                <Pressable
                  key={s}
                  onPress={() => set("status", s)}
                  className={`flex-1 py-2 rounded-lg ${selected ? "bg-navy-500" : ""}`}
                >
                  <Text
                    className={`text-center text-sm font-semibold ${
                      selected ? "text-white" : "text-navy-600"
                    }`}
                  >
                    {s}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Input
            label="Remarks"
            value={form.remarks}
            onChangeText={(v) => set("remarks", v)}
            multiline
            numberOfLines={3}
          />
        </Section>

        <Section title="Q88 file (optional)">
          <Text className="text-xs text-muted mb-2">
            Upload a Q88 PDF/Word/Excel or a photo. Stored privately; broker will share via signed link.
          </Text>
          <View className="flex-row gap-2 mb-2">
            <View className="flex-1">
              <Button
                label={uploading ? "Uploading…" : "Pick document"}
                variant="secondary"
                onPress={pickDocument}
                disabled={uploading}
                fullWidth
              />
            </View>
            <View className="flex-1">
              <Button
                label={uploading ? "Uploading…" : "Pick image"}
                variant="secondary"
                onPress={pickImage}
                disabled={uploading}
                fullWidth
              />
            </View>
          </View>
          {form.q88_file_url ? (
            <Text className="text-xs text-emerald-700">Uploaded: {form.q88_file_url}</Text>
          ) : (
            <Text className="text-xs text-muted">No file uploaded yet.</Text>
          )}
        </Section>

        <View className="mt-2">
          <Button label="Save vessel" onPress={onSave} loading={busy} fullWidth />
        </View>
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
