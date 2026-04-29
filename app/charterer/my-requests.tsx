import React, { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Header } from "@/components/Header";
import { EmptyState } from "@/components/EmptyState";
import { FixtureStatusBadge } from "@/components/StatusBadge";
import { supabase } from "@/lib/supabase";
import { fmtDate } from "@/lib/format";
import type { FixtureRequest } from "@/lib/types";

// Charterer-safe view of own requests — never selects owner_id, broker_id, or any owner fields.
const SAFE =
  "id,vessel_id,charterer_id,cargo,quantity,load_port,discharge_port,laycan_from,laycan_to,freight_idea,demurrage_idea,charter_party_form,special_requirements,status,broker_commission_percentage,created_at,vessels(vessel_name)";

interface MyRow
  extends Pick<
    FixtureRequest,
    | "id"
    | "vessel_id"
    | "charterer_id"
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
  > {
  vessels: { vessel_name: string } | null;
}

export default function MyRequests() {
  const router = useRouter();
  const [rows, setRows] = useState<MyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("fixture_requests")
        .select(SAFE)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setRows((data ?? []) as unknown as MyRow[]);
    } catch (e: any) {
      Alert.alert("Could not load requests", e?.message ?? "Unknown error");
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

  return (
    <View className="flex-1 bg-bg">
      <Header title="My requests" subtitle="Sent to broker" back />
      <FlatList
        data={rows}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0B3D91" />
        }
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              icon="paper-plane-outline"
              title="No requests yet"
              body="Pick an open tanker and send a request — the broker will revert."
            />
          )
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/charterer/request-detail/[id]",
                params: { id: item.id },
              })
            }
            className="bg-white rounded-2xl p-4 mb-3 border border-line active:opacity-90"
          >
            <View className="flex-row justify-between items-start">
              <Text className="flex-1 text-base font-semibold text-ink pr-2" numberOfLines={1}>
                {item.vessels?.vessel_name ?? "(vessel)"}
              </Text>
              <FixtureStatusBadge status={item.status} />
            </View>
            <Text className="text-xs text-muted mt-1">
              {item.cargo ?? "—"} · {item.quantity ?? "—"}
            </Text>
            <View className="flex-row mt-2 gap-3">
              <View className="flex-1">
                <Text className="text-xs text-muted">Load</Text>
                <Text className="text-sm text-ink" numberOfLines={1}>
                  {item.load_port ?? "—"}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-xs text-muted">Disch</Text>
                <Text className="text-sm text-ink" numberOfLines={1}>
                  {item.discharge_port ?? "—"}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-xs text-muted">Laycan</Text>
                <Text className="text-sm text-ink" numberOfLines={1}>
                  {fmtDate(item.laycan_from)}–{fmtDate(item.laycan_to)}
                </Text>
              </View>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}
