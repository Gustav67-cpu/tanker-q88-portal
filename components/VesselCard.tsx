import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Vessel } from "@/lib/types";
import { fmtDate, fmtDwt } from "@/lib/format";
import { VesselStatusBadge } from "./StatusBadge";

interface Props {
  vessel: Vessel;
  onPress?: () => void;
  rightAction?: React.ReactNode;
  showStatus?: boolean;
}

export function VesselCard({ vessel, onPress, rightAction, showStatus = true }: Props) {
  return (
    <Pressable
      onPress={onPress}
      className="bg-white rounded-2xl p-4 mb-3 border border-line shadow-sm active:opacity-90"
    >
      <View className="flex-row justify-between items-start">
        <View className="flex-1 pr-2">
          <Text className="text-base font-semibold text-ink" numberOfLines={1}>
            {vessel.vessel_name}
          </Text>
          <Text className="text-xs text-muted mt-0.5">
            IMO {vessel.imo_number ?? "—"} · {fmtDwt(vessel.dwt)}
            {vessel.year_built ? ` · ${vessel.year_built}` : ""}
          </Text>
        </View>
        {showStatus ? <VesselStatusBadge status={vessel.status} /> : null}
      </View>

      <View className="flex-row mt-3 gap-3">
        <View className="flex-1">
          <Text className="text-xs text-muted">Opening</Text>
          <Text className="text-sm text-ink font-medium" numberOfLines={1}>
            {vessel.opening_port ?? "—"}
          </Text>
          <Text className="text-xs text-muted">{fmtDate(vessel.opening_date)}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-xs text-muted">Coating</Text>
          <Text className="text-sm text-ink font-medium" numberOfLines={1}>
            {vessel.tank_coating ?? "—"}
          </Text>
          <Text className="text-xs text-muted" numberOfLines={1}>
            {vessel.flag ?? ""}
            {vessel.class_society ? ` · ${vessel.class_society}` : ""}
          </Text>
        </View>
      </View>

      {vessel.last_3_cargoes ? (
        <View className="mt-2 pt-2 border-t border-line">
          <Text className="text-xs text-muted">Last 3 cargoes</Text>
          <Text className="text-xs text-ink" numberOfLines={1}>
            {vessel.last_3_cargoes}
          </Text>
        </View>
      ) : null}

      {rightAction ? <View className="mt-3">{rightAction}</View> : null}

      {onPress ? (
        <View className="absolute top-4 right-4">
          {showStatus ? null : <Ionicons name="chevron-forward" size={18} color="#64748B" />}
        </View>
      ) : null}
    </Pressable>
  );
}
