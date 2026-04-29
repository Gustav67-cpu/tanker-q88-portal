import React from "react";
import { Text, View } from "react-native";
import type { FixtureStatus, VesselStatus } from "@/lib/types";

const vesselTone: Record<VesselStatus, string> = {
  Open: "bg-green-100 text-green-700",
  Fixed: "bg-amber-100 text-amber-700",
  Hidden: "bg-slate-200 text-slate-600",
};

const fixtureTone: Record<FixtureStatus, string> = {
  "New request": "bg-sky-100 text-sky-700",
  "Under broker review": "bg-indigo-100 text-indigo-700",
  "Sent to Owner": "bg-blue-100 text-blue-700",
  "Owner countered": "bg-purple-100 text-purple-700",
  "Sent to Charterer": "bg-cyan-100 text-cyan-700",
  "Charterer countered": "bg-fuchsia-100 text-fuchsia-700",
  Subjects: "bg-amber-100 text-amber-700",
  Fixed: "bg-emerald-100 text-emerald-700",
  Failed: "bg-rose-100 text-rose-700",
  Cancelled: "bg-slate-200 text-slate-600",
};

export function VesselStatusBadge({ status }: { status: VesselStatus }) {
  const tone = vesselTone[status] ?? "bg-slate-200 text-slate-700";
  const [bg, text] = tone.split(" ");
  return (
    <View className={`px-2 py-0.5 rounded-full self-start ${bg}`}>
      <Text className={`text-xs font-semibold ${text}`}>{status}</Text>
    </View>
  );
}

export function FixtureStatusBadge({ status }: { status: FixtureStatus }) {
  const tone = fixtureTone[status] ?? "bg-slate-200 text-slate-700";
  const [bg, text] = tone.split(" ");
  return (
    <View className={`px-2 py-0.5 rounded-full self-start ${bg}`}>
      <Text className={`text-xs font-semibold ${text}`}>{status}</Text>
    </View>
  );
}
