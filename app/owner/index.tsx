import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import { Header } from "@/components/Header";
import { Button } from "@/components/Button";
import { VesselCard } from "@/components/VesselCard";
import { EmptyState } from "@/components/EmptyState";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type { Vessel, VesselStatus } from "@/lib/types";
import { publicShareUrl, shareVesselMessage, waLink } from "@/lib/whatsapp";

const NEXT_STATUS: Record<VesselStatus, VesselStatus> = {
  Open: "Fixed",
  Fixed: "Hidden",
  Hidden: "Open",
};

export default function OwnerDashboard() {
  const router = useRouter();
  const { signOut, profile } = useAuth();
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("vessels")
        .select("*")
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

  async function cycleStatus(v: Vessel) {
    const next = NEXT_STATUS[v.status];
    try {
      const { error } = await supabase
        .from("vessels")
        .update({ status: next })
        .eq("id", v.id);
      if (error) throw error;
      setVessels((prev) =>
        prev.map((x) => (x.id === v.id ? { ...x, status: next } : x))
      );
    } catch (e: any) {
      Alert.alert("Could not update status", e?.message ?? "Unknown error");
    }
  }

  function shareVessel(v: Vessel) {
    const url = publicShareUrl(v.public_share_token);
    const msg = shareVesselMessage({
      vesselName: v.vessel_name,
      dwt: v.dwt,
      openingPort: v.opening_port,
      openingDate: v.opening_date,
      shareUrl: url,
    });
    Linking.openURL(waLink(null, msg)).catch(() => {
      Alert.alert("Could not open WhatsApp");
    });
  }

  return (
    <View className="flex-1 bg-bg">
      <Header
        title="My Fleet"
        subtitle={profile?.company_name ?? undefined}
        right={
          <View className="flex-row items-center gap-1">
            <Link href="/owner/requests" asChild>
              <Pressable className="p-2">
                <Ionicons name="mail-outline" size={20} color="#fff" />
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

      <FlatList
        data={vessels}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0B3D91" />
        }
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              icon="boat-outline"
              title="No vessels yet"
              body="Add your first vessel to start receiving enquiries from charterers via the broker."
              action={
                <Button
                  label="Add your first vessel"
                  onPress={() => router.push({ pathname: "/owner/new" })}
                  fullWidth
                />
              }
            />
          )
        }
        renderItem={({ item }) => (
          <VesselCard
            vessel={item}
            onPress={() => router.push({ pathname: "/owner/edit/[id]", params: { id: item.id } })}
            rightAction={
              <View className="flex-row gap-2">
                <Pressable
                  onPress={() => router.push({ pathname: "/owner/edit/[id]", params: { id: item.id } })}
                  className="flex-1 bg-navy-50 active:bg-navy-100 border border-navy-100 rounded-lg py-2"
                >
                  <Text className="text-center text-navy-600 text-xs font-semibold">Edit</Text>
                </Pressable>
                <Pressable
                  onPress={() => shareVessel(item)}
                  className="flex-1 bg-navy-50 active:bg-navy-100 border border-navy-100 rounded-lg py-2"
                >
                  <Text className="text-center text-navy-600 text-xs font-semibold">Share</Text>
                </Pressable>
                <Pressable
                  onPress={() => cycleStatus(item)}
                  className="flex-1 bg-white active:bg-bg border border-line rounded-lg py-2"
                >
                  <Text className="text-center text-ink text-xs font-semibold">
                    Set {NEXT_STATUS[item.status]}
                  </Text>
                </Pressable>
              </View>
            }
          />
        )}
      />

      <Pressable
        onPress={() => router.push({ pathname: "/owner/new" })}
        className="absolute bottom-6 right-6 bg-navy-500 active:bg-navy-600 rounded-full w-14 h-14 items-center justify-center shadow-lg"
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>
    </View>
  );
}
