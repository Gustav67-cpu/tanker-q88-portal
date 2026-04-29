import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
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
import type { FixtureRequest, OfferCounter } from "@/lib/types";
import { fmtDate } from "@/lib/format";
import { brokerToOwnerMessage, waLink } from "@/lib/whatsapp";

// Owner-safe selection — explicitly omits charterer_id, broker_id.
const OWNER_SAFE =
  "id,vessel_id,owner_id,cargo,quantity,load_port,discharge_port,laycan_from,laycan_to,freight_idea,demurrage_idea,charter_party_form,special_requirements,status,broker_commission_percentage,created_at,updated_at,vessels(vessel_name)";

interface SafeRequest
  extends Pick<
    FixtureRequest,
    | "id"
    | "vessel_id"
    | "owner_id"
    | "cargo"
    | "quantity"
    | "load_port"
    | "discharge_port"
    | "laycan_from"
    | "laycan_to"
    | "freight_idea"
    | "demurrage_idea"
    | "charter_party_form"
    | "special_requirements"
    | "status"
    | "broker_commission_percentage"
    | "created_at"
    | "updated_at"
  > {
  vessels: { vessel_name: string } | null;
}

export default function OwnerRequestDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const [req, setReq] = useState<SafeRequest | null>(null);
  const [counters, setCounters] = useState<OfferCounter[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // Counter form state
  const [freight, setFreight] = useState("");
  const [demurrage, setDemurrage] = useState("");
  const [laycanFrom, setLaycanFrom] = useState("");
  const [laycanTo, setLaycanTo] = useState("");
  const [loadPort, setLoadPort] = useState("");
  const [dischargePort, setDischargePort] = useState("");
  const [subjects, setSubjects] = useState("");
  const [remarks, setRemarks] = useState("");

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [rRes, cRes] = await Promise.all([
        supabase.from("fixture_requests").select(OWNER_SAFE).eq("id", id).maybeSingle(),
        supabase
          .from("offers_counters")
          .select("*")
          .eq("fixture_request_id", id)
          .order("created_at", { ascending: true }),
      ]);
      if (rRes.error) throw rRes.error;
      if (cRes.error) throw cRes.error;
      setReq(rRes.data as unknown as SafeRequest);
      setCounters((cRes.data ?? []) as OfferCounter[]);
    } catch (e: any) {
      Alert.alert("Could not load enquiry", e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function submitCounter() {
    if (!id || !session?.user) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("offers_counters").insert({
        fixture_request_id: id,
        sender_role: "owner",
        sent_to_role: "broker",
        freight: freight.trim() || null,
        demurrage: demurrage.trim() || null,
        laycan_from: laycanFrom.trim() || null,
        laycan_to: laycanTo.trim() || null,
        load_port: loadPort.trim() || null,
        discharge_port: dischargePort.trim() || null,
        subjects: subjects.trim() || null,
        remarks: remarks.trim() || null,
      });
      if (error) throw error;
      setFreight("");
      setDemurrage("");
      setLaycanFrom("");
      setLaycanTo("");
      setLoadPort("");
      setDischargePort("");
      setSubjects("");
      setRemarks("");
      await load();
      Alert.alert("Counter sent", "The broker has been notified.");
    } catch (e: any) {
      Alert.alert("Could not send counter", e?.message ?? "Unknown error");
    } finally {
      setBusy(false);
    }
  }

  async function whatsappBroker() {
    if (!req) return;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("whatsapp_number")
        .eq("role", "admin")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      const msg = brokerToOwnerMessage({
        vesselName: req.vessels?.vessel_name ?? "(vessel)",
        cargo: req.cargo,
        quantity: req.quantity,
        loadPort: req.load_port,
        dischargePort: req.discharge_port,
        laycanFrom: req.laycan_from,
        laycanTo: req.laycan_to,
      });
      Linking.openURL(waLink(data?.whatsapp_number ?? null, msg)).catch(() =>
        Alert.alert("Could not open WhatsApp")
      );
    } catch (e: any) {
      Alert.alert("Could not load broker", e?.message ?? "Unknown error");
    }
  }

  if (loading || !req) {
    return (
      <View className="flex-1 bg-bg">
        <Header title="Enquiry" back />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#0B3D91" />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg">
      <Header
        title={req.vessels?.vessel_name ?? "Enquiry"}
        subtitle="Broker-mediated"
        back
      />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
        <BrokerNotice />

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
            <Field label="Load port" value={req.load_port} />
            <Field label="Discharge port" value={req.discharge_port} />
          </FieldRow>
          <FieldRow>
            <Field label="Laycan from" value={fmtDate(req.laycan_from)} />
            <Field label="Laycan to" value={fmtDate(req.laycan_to)} />
          </FieldRow>
          <FieldRow>
            <Field label="Freight idea" value={req.freight_idea} />
            <Field label="Demurrage idea" value={req.demurrage_idea} />
          </FieldRow>
          <FieldRow>
            <Field label="C/P form" value={req.charter_party_form} />
            <Field label="Commission" value={`${req.broker_commission_percentage}%`} />
          </FieldRow>
          <Field label="Special requirements" value={req.special_requirements} />
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
          <Text className="text-base font-semibold text-ink mb-3">Counter / Reply to Broker</Text>
          <Input label="Freight" value={freight} onChangeText={setFreight} placeholder="WS / lump sum / $/mt" />
          <Input label="Demurrage" value={demurrage} onChangeText={setDemurrage} placeholder="$/day" />
          <Input
            label="Laycan from"
            value={laycanFrom}
            onChangeText={setLaycanFrom}
            placeholder="YYYY-MM-DD"
          />
          <Input
            label="Laycan to"
            value={laycanTo}
            onChangeText={setLaycanTo}
            placeholder="YYYY-MM-DD"
          />
          <Input label="Load port" value={loadPort} onChangeText={setLoadPort} />
          <Input label="Discharge port" value={dischargePort} onChangeText={setDischargePort} />
          <Input label="Subjects" value={subjects} onChangeText={setSubjects} multiline numberOfLines={2} />
          <Input label="Remarks" value={remarks} onChangeText={setRemarks} multiline numberOfLines={3} />
          <Button label="Send counter to Broker" onPress={submitCounter} loading={busy} fullWidth />
        </View>

        <Button
          label="Continue on WhatsApp with Broker"
          variant="success"
          onPress={whatsappBroker}
          fullWidth
        />

        <View className="mt-3">
          <Button
            label="Open Broker chat"
            variant="secondary"
            onPress={() =>
              router.push({ pathname: "/chat/[fixtureId]", params: { fixtureId: id!, type: "broker_owner" } })
            }
            fullWidth
          />
        </View>
      </ScrollView>
    </View>
  );
}
