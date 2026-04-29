import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Header } from "@/components/Header";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { BrokerNotice } from "@/components/Banner";
import { Field, FieldRow } from "@/components/Field";
import { FixtureStatusBadge } from "@/components/StatusBadge";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type {
  FixtureRequest,
  FixtureStatus,
  OfferCounter,
  Profile,
  Vessel,
} from "@/lib/types";
import { fmtDate, fmtDwt } from "@/lib/format";
import {
  brokerToOwnerMessage,
  chartererToBrokerMessage,
  waLink,
} from "@/lib/whatsapp";

const STATUSES: FixtureStatus[] = [
  "New request",
  "Under broker review",
  "Sent to Owner",
  "Owner countered",
  "Sent to Charterer",
  "Charterer countered",
  "Subjects",
  "Fixed",
  "Failed",
  "Cancelled",
];

interface FullData {
  req: FixtureRequest;
  vessel: Vessel | null;
  charterer: Profile | null;
  owner: Profile | null;
  counters: OfferCounter[];
}

export default function AdminRequestDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const [data, setData] = useState<FullData | null>(null);
  const [loading, setLoading] = useState(true);

  // Counter to charterer (broker on behalf of owner)
  const [cToCh, setCToCh] = useState({
    freight: "",
    demurrage: "",
    laycan_from: "",
    laycan_to: "",
    load_port: "",
    discharge_port: "",
    subjects: "",
    remarks: "",
  });
  // Counter to owner
  const [cToOw, setCToOw] = useState({
    freight: "",
    demurrage: "",
    laycan_from: "",
    laycan_to: "",
    load_port: "",
    discharge_port: "",
    subjects: "",
    remarks: "",
  });
  const [busyCh, setBusyCh] = useState(false);
  const [busyOw, setBusyOw] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const reqRes = await supabase
        .from("fixture_requests")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (reqRes.error) throw reqRes.error;
      const req = reqRes.data as FixtureRequest | null;
      if (!req) {
        Alert.alert("Fixture not found");
        router.back();
        return;
      }
      const [vesRes, chRes, owRes, cRes] = await Promise.all([
        supabase.from("vessels").select("*").eq("id", req.vessel_id).maybeSingle(),
        supabase.from("profiles").select("*").eq("id", req.charterer_id).maybeSingle(),
        supabase.from("profiles").select("*").eq("id", req.owner_id).maybeSingle(),
        supabase
          .from("offers_counters")
          .select("*")
          .eq("fixture_request_id", id)
          .order("created_at", { ascending: true }),
      ]);
      if (vesRes.error) throw vesRes.error;
      if (chRes.error) throw chRes.error;
      if (owRes.error) throw owRes.error;
      if (cRes.error) throw cRes.error;
      setData({
        req,
        vessel: (vesRes.data ?? null) as Vessel | null,
        charterer: (chRes.data ?? null) as Profile | null,
        owner: (owRes.data ?? null) as Profile | null,
        counters: (cRes.data ?? []) as OfferCounter[],
      });
    } catch (e: any) {
      Alert.alert("Could not load", e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    load();
  }, [load]);

  async function changeStatus(next: FixtureStatus) {
    if (!data || !session?.user) return;
    try {
      const payload: Record<string, unknown> = { status: next };
      if (!data.req.broker_id) payload.broker_id = session.user.id;
      const { error } = await supabase
        .from("fixture_requests")
        .update(payload)
        .eq("id", data.req.id);
      if (error) throw error;
      await load();
    } catch (e: any) {
      Alert.alert("Could not update status", e?.message ?? "Unknown error");
    }
  }

  async function sendCounter(to: "charterer" | "owner") {
    if (!data) return;
    const setBusy = to === "charterer" ? setBusyCh : setBusyOw;
    const f = to === "charterer" ? cToCh : cToOw;
    setBusy(true);
    try {
      const { error } = await supabase.from("offers_counters").insert({
        fixture_request_id: data.req.id,
        sender_role: "broker",
        sent_to_role: to,
        freight: f.freight.trim() || null,
        demurrage: f.demurrage.trim() || null,
        laycan_from: f.laycan_from.trim() || null,
        laycan_to: f.laycan_to.trim() || null,
        load_port: f.load_port.trim() || null,
        discharge_port: f.discharge_port.trim() || null,
        subjects: f.subjects.trim() || null,
        remarks: f.remarks.trim() || null,
      });
      if (error) throw error;
      if (to === "charterer") {
        setCToCh({
          freight: "",
          demurrage: "",
          laycan_from: "",
          laycan_to: "",
          load_port: "",
          discharge_port: "",
          subjects: "",
          remarks: "",
        });
      } else {
        setCToOw({
          freight: "",
          demurrage: "",
          laycan_from: "",
          laycan_to: "",
          load_port: "",
          discharge_port: "",
          subjects: "",
          remarks: "",
        });
      }
      await load();
      Alert.alert(`Counter sent to ${to === "charterer" ? "Charterer" : "Owner"}`);
    } catch (e: any) {
      Alert.alert("Could not send counter", e?.message ?? "Unknown error");
    } finally {
      setBusy(false);
    }
  }

  function whatsappCharterer() {
    if (!data) return;
    const msg = chartererToBrokerMessage({
      vesselName: data.vessel?.vessel_name ?? "(vessel)",
      cargo: data.req.cargo,
      quantity: data.req.quantity,
      loadPort: data.req.load_port,
      dischargePort: data.req.discharge_port,
      laycanFrom: data.req.laycan_from,
      laycanTo: data.req.laycan_to,
    });
    Linking.openURL(waLink(data.charterer?.whatsapp_number ?? null, msg)).catch(() =>
      Alert.alert("Could not open WhatsApp")
    );
  }

  function whatsappOwner() {
    if (!data) return;
    const msg = brokerToOwnerMessage({
      vesselName: data.vessel?.vessel_name ?? "(vessel)",
      cargo: data.req.cargo,
      quantity: data.req.quantity,
      loadPort: data.req.load_port,
      dischargePort: data.req.discharge_port,
      laycanFrom: data.req.laycan_from,
      laycanTo: data.req.laycan_to,
    });
    Linking.openURL(waLink(data.owner?.whatsapp_number ?? null, msg)).catch(() =>
      Alert.alert("Could not open WhatsApp")
    );
  }

  if (loading || !data) {
    return (
      <View className="flex-1 bg-bg">
        <Header title="Fixture" back />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#0B3D91" />
        </View>
      </View>
    );
  }

  const { req, vessel, charterer, owner, counters } = data;

  return (
    <View className="flex-1 bg-bg">
      <Header
        title={vessel?.vessel_name ?? "Fixture"}
        subtitle="Broker control"
        back
      />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
        <BrokerNotice />

        <View className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3">
          <Text className="text-amber-800 font-semibold">
            Broker commission: {req.broker_commission_percentage}% from Owners' side
          </Text>
        </View>

        <View className="bg-white rounded-2xl p-4 border border-line mb-3">
          <Text className="text-base font-semibold text-ink mb-3">Vessel</Text>
          <FieldRow>
            <Field label="Name" value={vessel?.vessel_name} />
            <Field label="IMO" value={vessel?.imo_number} />
          </FieldRow>
          <FieldRow>
            <Field label="DWT" value={fmtDwt(vessel?.dwt)} />
            <Field label="Year" value={vessel?.year_built} />
          </FieldRow>
          <FieldRow>
            <Field label="Open at" value={vessel?.opening_port} />
            <Field label="Open date" value={fmtDate(vessel?.opening_date)} />
          </FieldRow>
        </View>

        <View className="bg-white rounded-2xl p-4 border border-line mb-3">
          <Text className="text-base font-semibold text-ink mb-3">Charterer (broker-only)</Text>
          <FieldRow>
            <Field label="Company" value={charterer?.company_name} />
            <Field label="Contact" value={charterer?.contact_person} />
          </FieldRow>
          <FieldRow>
            <Field label="Email" value={charterer?.email} />
            <Field label="WhatsApp" value={charterer?.whatsapp_number} />
          </FieldRow>
        </View>

        <View className="bg-white rounded-2xl p-4 border border-line mb-3">
          <Text className="text-base font-semibold text-ink mb-3">Owner (broker-only)</Text>
          <FieldRow>
            <Field label="Company" value={owner?.company_name} />
            <Field label="Contact" value={owner?.contact_person} />
          </FieldRow>
          <FieldRow>
            <Field label="Email" value={owner?.email} />
            <Field label="WhatsApp" value={owner?.whatsapp_number} />
          </FieldRow>
        </View>

        <View className="bg-white rounded-2xl p-4 border border-line mb-3">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-base font-semibold text-ink">Commercial terms</Text>
            <FixtureStatusBadge status={req.status} />
          </View>
          <FieldRow>
            <Field label="Cargo" value={req.cargo} />
            <Field label="Quantity" value={req.quantity} />
          </FieldRow>
          <FieldRow>
            <Field label="Load" value={req.load_port} />
            <Field label="Discharge" value={req.discharge_port} />
          </FieldRow>
          <FieldRow>
            <Field label="Laycan from" value={fmtDate(req.laycan_from)} />
            <Field label="Laycan to" value={fmtDate(req.laycan_to)} />
          </FieldRow>
          <FieldRow>
            <Field label="Freight idea" value={req.freight_idea} />
            <Field label="Demurrage" value={req.demurrage_idea} />
          </FieldRow>
          <Field label="C/P form" value={req.charter_party_form} />
          <Field label="Special requirements" value={req.special_requirements} />
        </View>

        <View className="bg-white rounded-2xl p-4 border border-line mb-3">
          <Text className="text-base font-semibold text-ink mb-2">Status</Text>
          <View className="flex-row flex-wrap gap-2">
            {STATUSES.map((s) => {
              const selected = req.status === s;
              return (
                <Pressable
                  key={s}
                  onPress={() => changeStatus(s)}
                  className={`px-3 py-1.5 rounded-full border ${
                    selected ? "bg-navy-500 border-navy-500" : "bg-white border-line"
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${selected ? "text-white" : "text-ink"}`}
                  >
                    {s}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View className="bg-white rounded-2xl p-4 border border-line mb-3">
          <Text className="text-base font-semibold text-ink mb-2">Negotiation history</Text>
          {counters.length === 0 ? (
            <Text className="text-xs text-muted">No counters yet.</Text>
          ) : (
            counters.map((c, i) => (
              <View
                key={c.id}
                className={i === 0 ? "" : "border-t border-line pt-2 mt-2"}
              >
                <Text className="text-xs text-muted">
                  {c.sender_role} → {c.sent_to_role} · {fmtDate(c.created_at)}
                </Text>
                <FieldRow>
                  <Field label="Freight" value={c.freight} />
                  <Field label="Demurrage" value={c.demurrage} />
                </FieldRow>
                <FieldRow>
                  <Field label="Laycan" value={`${fmtDate(c.laycan_from)}–${fmtDate(c.laycan_to)}`} />
                  <Field label="Load/Disch" value={`${c.load_port ?? "—"} / ${c.discharge_port ?? "—"}`} />
                </FieldRow>
                <Field label="Subjects" value={c.subjects} />
                <Field label="Remarks" value={c.remarks} />
              </View>
            ))
          )}
        </View>

        <View className="bg-white rounded-2xl p-4 border border-line mb-3">
          <Text className="text-base font-semibold text-ink mb-3">
            Counter on behalf of Owner → to Charterer
          </Text>
          <CounterFields f={cToCh} setF={setCToCh} />
          <Button
            label="Send counter to Charterer"
            onPress={() => sendCounter("charterer")}
            loading={busyCh}
            fullWidth
          />
        </View>

        <View className="bg-white rounded-2xl p-4 border border-line mb-3">
          <Text className="text-base font-semibold text-ink mb-3">Counter to Owner</Text>
          <CounterFields f={cToOw} setF={setCToOw} />
          <Button
            label="Send counter to Owner"
            onPress={() => sendCounter("owner")}
            loading={busyOw}
            fullWidth
          />
        </View>

        <View className="flex-row gap-2 mb-3">
          <View className="flex-1">
            <Button
              label="Charterer chat"
              variant="secondary"
              onPress={() =>
                router.push({
                  pathname: "/chat/[fixtureId]",
                  params: { fixtureId: req.id, type: "charterer_broker" },
                })
              }
              fullWidth
            />
          </View>
          <View className="flex-1">
            <Button
              label="Owner chat"
              variant="secondary"
              onPress={() =>
                router.push({
                  pathname: "/chat/[fixtureId]",
                  params: { fixtureId: req.id, type: "broker_owner" },
                })
              }
              fullWidth
            />
          </View>
        </View>

        <View className="flex-row gap-2">
          <View className="flex-1">
            <Button label="WhatsApp Charterer" variant="success" onPress={whatsappCharterer} fullWidth />
          </View>
          <View className="flex-1">
            <Button label="WhatsApp Owner" variant="success" onPress={whatsappOwner} fullWidth />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

interface CFields {
  freight: string;
  demurrage: string;
  laycan_from: string;
  laycan_to: string;
  load_port: string;
  discharge_port: string;
  subjects: string;
  remarks: string;
}

function CounterFields({
  f,
  setF,
}: {
  f: CFields;
  setF: React.Dispatch<React.SetStateAction<CFields>>;
}) {
  const u = (k: keyof CFields, v: string) => setF((s) => ({ ...s, [k]: v }));
  return (
    <>
      <Input label="Freight" value={f.freight} onChangeText={(v) => u("freight", v)} />
      <Input label="Demurrage" value={f.demurrage} onChangeText={(v) => u("demurrage", v)} />
      <Input
        label="Laycan from"
        value={f.laycan_from}
        onChangeText={(v) => u("laycan_from", v)}
        placeholder="YYYY-MM-DD"
      />
      <Input
        label="Laycan to"
        value={f.laycan_to}
        onChangeText={(v) => u("laycan_to", v)}
        placeholder="YYYY-MM-DD"
      />
      <Input label="Load port" value={f.load_port} onChangeText={(v) => u("load_port", v)} />
      <Input label="Discharge port" value={f.discharge_port} onChangeText={(v) => u("discharge_port", v)} />
      <Input
        label="Subjects"
        value={f.subjects}
        onChangeText={(v) => u("subjects", v)}
        multiline
        numberOfLines={2}
      />
      <Input
        label="Remarks"
        value={f.remarks}
        onChangeText={(v) => u("remarks", v)}
        multiline
        numberOfLines={3}
      />
    </>
  );
}
