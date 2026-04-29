import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import { Header } from "@/components/Header";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { VesselCard } from "@/components/VesselCard";
import { EmptyState } from "@/components/EmptyState";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type { Vessel } from "@/lib/types";

interface Filters {
  q: string;
  dwtMin: string;
  dwtMax: string;
  type: string;
  flag: string;
  classSociety: string;
  openingPort: string;
  openingFrom: string;
  openingTo: string;
  tankCoating: string;
  cargoes: string;
}

const EMPTY_FILTERS: Filters = {
  q: "",
  dwtMin: "",
  dwtMax: "",
  type: "",
  flag: "",
  classSociety: "",
  openingPort: "",
  openingFrom: "",
  openingTo: "",
  tankCoating: "",
  cargoes: "",
};

export default function ChartererList() {
  const router = useRouter();
  const { signOut, profile } = useAuth();
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);

  const load = useCallback(async () => {
    try {
      // RLS limits charterers to status='Open' rows; we still scope explicitly.
      const { data, error } = await supabase
        .from("vessels")
        .select("*")
        .eq("status", "Open")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setVessels((data ?? []) as Vessel[]);
    } catch (e: any) {
      Alert.alert("Could not load vessels", e?.message ?? "Unknown error");
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

  function setF<K extends keyof Filters>(k: K, v: Filters[K]) {
    setFilters((f) => ({ ...f, [k]: v }));
  }

  const filtered = useMemo(() => {
    const ci = (s: string | null | undefined, q: string) =>
      !q || (s ?? "").toLowerCase().includes(q.toLowerCase());
    const dwtMin = filters.dwtMin ? Number(filters.dwtMin) : null;
    const dwtMax = filters.dwtMax ? Number(filters.dwtMax) : null;

    return vessels.filter((v) => {
      if (!ci(v.vessel_name, filters.q)) return false;
      if (dwtMin != null && (v.dwt ?? 0) < dwtMin) return false;
      if (dwtMax != null && (v.dwt ?? 0) > dwtMax) return false;
      if (filters.type) {
        const hay = `${v.trading_area ?? ""} ${v.imo_class ?? ""}`.toLowerCase();
        if (!hay.includes(filters.type.toLowerCase())) return false;
      }
      if (!ci(v.flag, filters.flag)) return false;
      if (!ci(v.class_society, filters.classSociety)) return false;
      if (!ci(v.opening_port, filters.openingPort)) return false;
      if (filters.openingFrom && v.opening_date && v.opening_date < filters.openingFrom)
        return false;
      if (filters.openingTo && v.opening_date && v.opening_date > filters.openingTo) return false;
      if (!ci(v.tank_coating, filters.tankCoating)) return false;
      if (!ci(v.last_3_cargoes, filters.cargoes)) return false;
      return true;
    });
  }, [vessels, filters]);

  return (
    <View className="flex-1 bg-bg">
      <Header
        title="Open tankers"
        subtitle={profile?.company_name ?? undefined}
        right={
          <View className="flex-row items-center gap-1">
            <Link href="/charterer/my-requests" asChild>
              <Pressable className="p-2">
                <Ionicons name="document-text-outline" size={20} color="#fff" />
              </Pressable>
            </Link>
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

      <View className="px-4 pt-3 bg-bg">
        <Input
          value={filters.q}
          onChangeText={(v) => setF("q", v)}
          placeholder="Search vessel name…"
        />
        <Pressable
          onPress={() => setShowFilters((s) => !s)}
          className="flex-row items-center justify-center bg-white border border-line rounded-xl py-2 mb-2"
        >
          <Ionicons name={showFilters ? "chevron-up" : "options-outline"} size={16} color="#0B3D91" />
          <Text className="text-navy-600 font-semibold text-sm ml-1">
            {showFilters ? "Hide filters" : "Filters"}
          </Text>
        </Pressable>
        {showFilters ? (
          <View className="bg-white rounded-2xl p-3 border border-line mb-2">
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Input
                  label="DWT min"
                  value={filters.dwtMin}
                  onChangeText={(v) => setF("dwtMin", v)}
                  keyboardType="numeric"
                />
              </View>
              <View className="flex-1">
                <Input
                  label="DWT max"
                  value={filters.dwtMax}
                  onChangeText={(v) => setF("dwtMax", v)}
                  keyboardType="numeric"
                />
              </View>
            </View>
            <Input
              label="Type / IMO class / area"
              value={filters.type}
              onChangeText={(v) => setF("type", v)}
              placeholder="MR, IMO II, WAF…"
            />
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Input label="Flag" value={filters.flag} onChangeText={(v) => setF("flag", v)} />
              </View>
              <View className="flex-1">
                <Input
                  label="Class society"
                  value={filters.classSociety}
                  onChangeText={(v) => setF("classSociety", v)}
                />
              </View>
            </View>
            <Input
              label="Opening port"
              value={filters.openingPort}
              onChangeText={(v) => setF("openingPort", v)}
            />
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Input
                  label="Opening from"
                  value={filters.openingFrom}
                  onChangeText={(v) => setF("openingFrom", v)}
                  placeholder="YYYY-MM-DD"
                />
              </View>
              <View className="flex-1">
                <Input
                  label="Opening to"
                  value={filters.openingTo}
                  onChangeText={(v) => setF("openingTo", v)}
                  placeholder="YYYY-MM-DD"
                />
              </View>
            </View>
            <Input
              label="Tank coating"
              value={filters.tankCoating}
              onChangeText={(v) => setF("tankCoating", v)}
            />
            <Input
              label="Last 3 cargoes contains"
              value={filters.cargoes}
              onChangeText={(v) => setF("cargoes", v)}
            />
            <Button
              label="Reset filters"
              variant="ghost"
              onPress={() => setFilters(EMPTY_FILTERS)}
              fullWidth
            />
          </View>
        ) : null}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0B3D91" />
        }
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              icon="boat-outline"
              title="No open tankers match"
              body="Adjust filters or pull to refresh."
            />
          )
        }
        renderItem={({ item }) => (
          <VesselCard
            vessel={item}
            onPress={() =>
              router.push({ pathname: "/charterer/vessel/[id]", params: { id: item.id } })
            }
            rightAction={
              <Button
                label="Select / Request This Tanker"
                onPress={() =>
                  router.push({ pathname: "/charterer/request/[id]", params: { id: item.id } })
                }
                fullWidth
              />
            }
          />
        )}
      />
    </View>
  );
}
