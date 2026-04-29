import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import { Header } from "@/components/Header";
import { EmptyState } from "@/components/EmptyState";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type { FixtureRequest, FixtureStatus } from "@/lib/types";
import { fmtDate } from "@/lib/format";

const COLUMNS: FixtureStatus[] = [
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

const SELECT =
  "id,vessel_id,charterer_id,owner_id,broker_id,cargo,quantity,load_port,discharge_port,laycan_from,laycan_to,freight_idea,demurrage_idea,charter_party_form,special_requirements,status,broker_commission_percentage,created_at,updated_at,vessels(vessel_name),charterer:charterer_id(company_name),owner:owner_id(company_name)";

interface Row
  extends Pick<
    FixtureRequest,
    | "id"
    | "vessel_id"
    | "charterer_id"
    | "owner_id"
    | "broker_id"
    | "cargo"
    | "quantity"
    | "load_port"
    | "discharge_port"
    | "laycan_from"
    | "laycan_to"
    | "status"
    | "broker_commission_percentage"
    | "created_at"
  > {
  vessels: { vessel_name: string } | null;
  charterer: { company_name: string | null } | null;
  owner: { company_name: string | null } | null;
}

export default function BrokerDesk() {
  const router = useRouter();
  const { signOut, profile } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("fixture_requests")
        .select(SELECT)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setRows((data ?? []) as unknown as Row[]);
    } catch (e: any) {
      Alert.alert("Could not load fixtures", e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const grouped = useMemo(() => {
    const out: Record<FixtureStatus, Row[]> = {
      "New request": [],
      "Under broker review": [],
      "Sent to Owner": [],
      "Owner countered": [],
      "Sent to Charterer": [],
      "Charterer countered": [],
      Subjects: [],
      Fixed: [],
      Failed: [],
      Cancelled: [],
    };
    for (const r of rows) out[r.status].push(r);
    return out;
  }, [rows]);

  return (
    <View className="flex-1 bg-bg">
      <Header
        title="Broker Desk"
        subtitle={profile?.company_name ?? "Admin"}
        right={
          <View className="flex-row items-center gap-1">
            <Link href="/profile" asChild>
              <Pressable className="p-2">
                <Ionicons name="person-circle-outline" size={22} color="#fff" />
              </Pressable>
            </Link>
            <Pressable className="p-2" onPress={signOut}>
              <Ionicons name="log-out-outline" size={20} color="#fff" />
            </Pressable>
          </View>
        }
      />

      <ScrollView
        horizontal
        contentContainerStyle={{ padding: 12 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0B3D91" />
        }
      >
        {COLUMNS.map((col) => (
          <View key={col} className="w-72 mr-3">
            <View className="bg-navy-50 border border-navy-100 rounded-2xl px-3 py-2 mb-2">
              <Text className="text-navy-700 font-semibold text-sm">{col}</Text>
              <Text className="text-navy-600 text-xs">{grouped[col].length} fixture(s)</Text>
            </View>
            <ScrollView style={{ maxHeight: "100%" }} contentContainerStyle={{ paddingBottom: 24 }}>
              {grouped[col].length === 0 ? (
                <View className="py-4">
                  <Text className="text-xs text-muted text-center">— empty —</Text>
                </View>
              ) : (
                grouped[col].map((r) => (
                  <Pressable
                    key={r.id}
                    onPress={() =>
                      router.push({ pathname: "/admin/request/[id]", params: { id: r.id } })
                    }
                    className="bg-white rounded-2xl p-3 mb-2 border border-line active:opacity-90"
                  >
                    <View className="flex-row items-center justify-between">
                      <Text className="flex-1 text-sm font-semibold text-ink pr-2" numberOfLines={1}>
                        {r.vessels?.vessel_name ?? "(vessel)"}
                      </Text>
                      <View className="bg-amber-100 rounded-full px-2 py-0.5">
                        <Text className="text-xs text-amber-800 font-semibold">2.5%</Text>
                      </View>
                    </View>
                    <Text className="text-xs text-muted mt-1" numberOfLines={1}>
                      Charterer: {r.charterer?.company_name ?? "—"}
                    </Text>
                    <Text className="text-xs text-muted" numberOfLines={1}>
                      Owner: {r.owner?.company_name ?? "—"}
                    </Text>
                    <Text className="text-xs text-ink mt-1" numberOfLines={1}>
                      {r.cargo ?? "—"} · {r.quantity ?? "—"}
                    </Text>
                    <Text className="text-xs text-muted" numberOfLines={1}>
                      {r.load_port ?? "—"} → {r.discharge_port ?? "—"}
                    </Text>
                    <Text className="text-xs text-muted">
                      Laycan {fmtDate(r.laycan_from)}–{fmtDate(r.laycan_to)}
                    </Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>
        ))}
        {rows.length === 0 && !loading ? (
          <View className="w-72">
            <EmptyState icon="albums-outline" title="No fixtures yet" body="New requests will land here." />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
