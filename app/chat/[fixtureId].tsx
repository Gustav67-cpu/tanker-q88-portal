import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, useLocalSearchParams } from "expo-router";
import { Header } from "@/components/Header";
import { BrokerNotice } from "@/components/Banner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type { ChatMessage, ChatType, FixtureRequest } from "@/lib/types";
import { brokerToOwnerMessage, chartererToBrokerMessage, waLink } from "@/lib/whatsapp";

function isChatType(s: string | undefined | null): s is ChatType {
  return s === "charterer_broker" || s === "broker_owner";
}

export default function ChatScreen() {
  const { fixtureId, type } = useLocalSearchParams<{ fixtureId: string; type?: string }>();
  const { session, profile, loading } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [authorized, setAuthorized] = useState<null | boolean>(null);
  const [req, setReq] = useState<FixtureRequest | null>(null);
  const [vesselName, setVesselName] = useState<string>("");
  const [brokerWhatsapp, setBrokerWhatsapp] = useState<string | null>(null);
  const [ownerWhatsapp, setOwnerWhatsapp] = useState<string | null>(null);

  const listRef = useRef<FlatList<ChatMessage>>(null);

  const chatType: ChatType | null = useMemo(
    () => (isChatType(type) ? type : null),
    [type]
  );

  // Authorize and load.
  useEffect(() => {
    if (loading) return;
    if (!session?.user || !profile) {
      setAuthorized(false);
      return;
    }
    if (!fixtureId || !chatType) {
      setAuthorized(false);
      return;
    }
    (async () => {
      try {
        const { data, error } = await supabase
          .from("fixture_requests")
          .select("*")
          .eq("id", fixtureId)
          .maybeSingle();
        if (error) throw error;
        if (!data) {
          setAuthorized(false);
          return;
        }
        const r = data as FixtureRequest;
        setReq(r);

        // Authorization rules.
        let ok = false;
        if (profile.role === "admin") ok = true;
        else if (chatType === "charterer_broker" && r.charterer_id === session.user.id) ok = true;
        else if (chatType === "broker_owner" && r.owner_id === session.user.id) ok = true;
        setAuthorized(ok);
        if (!ok) return;

        // Vessel name (no owner data shown to non-owners).
        const { data: ves } = await supabase
          .from("vessels")
          .select("vessel_name")
          .eq("id", r.vessel_id)
          .maybeSingle();
        setVesselName(ves?.vessel_name ?? "");

        // Broker WhatsApp (anyone may need it).
        const { data: brokerProfile } = await supabase
          .from("profiles")
          .select("whatsapp_number")
          .eq("role", "admin")
          .limit(1)
          .maybeSingle();
        setBrokerWhatsapp(brokerProfile?.whatsapp_number ?? null);

        // Owner WhatsApp only for admin in broker_owner thread.
        if (profile.role === "admin" && chatType === "broker_owner") {
          const { data: ownerProfile } = await supabase
            .from("profiles")
            .select("whatsapp_number")
            .eq("id", r.owner_id)
            .maybeSingle();
          setOwnerWhatsapp(ownerProfile?.whatsapp_number ?? null);
        }

        // Initial messages.
        const { data: msgs, error: mErr } = await supabase
          .from("chat_messages")
          .select("*")
          .eq("fixture_request_id", fixtureId)
          .eq("chat_type", chatType)
          .order("created_at", { ascending: true });
        if (mErr) throw mErr;
        setMessages((msgs ?? []) as ChatMessage[]);
      } catch (e: any) {
        Alert.alert("Could not load chat", e?.message ?? "Unknown error");
        setAuthorized(false);
      }
    })();
  }, [loading, session, profile, fixtureId, chatType]);

  // Realtime subscription.
  useEffect(() => {
    if (!authorized || !fixtureId || !chatType) return;
    const channel = supabase
      .channel(`chat:${fixtureId}:${chatType}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `fixture_request_id=eq.${fixtureId}`,
        },
        (payload) => {
          const m = payload.new as ChatMessage;
          if (m.chat_type !== chatType) return;
          setMessages((prev) => (prev.find((x) => x.id === m.id) ? prev : [...prev, m]));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [authorized, fixtureId, chatType]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    }
  }, [messages.length]);

  async function send() {
    if (!text.trim() || !session?.user || !fixtureId || !chatType) return;
    setSending(true);
    try {
      const { error } = await supabase.from("chat_messages").insert({
        fixture_request_id: fixtureId,
        chat_type: chatType,
        sender_id: session.user.id,
        message: text.trim(),
      });
      if (error) throw error;
      setText("");
    } catch (e: any) {
      Alert.alert("Could not send message", e?.message ?? "Unknown error");
    } finally {
      setSending(false);
    }
  }

  function whatsappContinue() {
    if (!req) return;
    const baseArgs = {
      vesselName: vesselName || "(vessel)",
      cargo: req.cargo,
      quantity: req.quantity,
      loadPort: req.load_port,
      dischargePort: req.discharge_port,
      laycanFrom: req.laycan_from,
      laycanTo: req.laycan_to,
    };
    let phone: string | null = null;
    let msg = "";
    if (chatType === "charterer_broker") {
      // Charterer or admin -> broker
      phone = brokerWhatsapp;
      msg = chartererToBrokerMessage(baseArgs);
    } else {
      // broker_owner thread
      if (profile?.role === "admin") {
        // Broker -> Owner
        phone = ownerWhatsapp;
        msg = brokerToOwnerMessage(baseArgs);
      } else {
        // Owner -> Broker
        phone = brokerWhatsapp;
        msg = brokerToOwnerMessage(baseArgs);
      }
    }
    Linking.openURL(waLink(phone, msg)).catch(() => Alert.alert("Could not open WhatsApp"));
  }

  if (loading || authorized === null) {
    return (
      <View className="flex-1 bg-bg">
        <Header title="Chat" back />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#0B3D91" />
        </View>
      </View>
    );
  }

  if (!authorized) return <Redirect href="/" />;

  const title =
    chatType === "charterer_broker" ? "Charterer ↔ Broker" : "Broker ↔ Owner";

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-bg"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <Header title={title} subtitle={vesselName || undefined} back />

      <View className="px-4 pt-3">
        <BrokerNotice />
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 16 }}
        renderItem={({ item }) => {
          const mine = item.sender_id === session?.user.id;
          return (
            <View className={`mb-2 max-w-[85%] ${mine ? "self-end" : "self-start"}`}>
              <View
                className={`rounded-2xl px-3 py-2 ${
                  mine ? "bg-navy-500" : "bg-white border border-line"
                }`}
              >
                <Text className={`text-sm ${mine ? "text-white" : "text-ink"}`}>{item.message}</Text>
              </View>
              <Text className={`text-[10px] text-muted mt-0.5 ${mine ? "text-right" : ""}`}>
                {new Date(item.created_at).toLocaleString()}
              </Text>
            </View>
          );
        }}
      />

      <View className="px-4 pb-2">
        <Pressable
          onPress={whatsappContinue}
          className="bg-emerald-600 active:bg-emerald-700 rounded-xl py-2 px-3 mb-2 flex-row items-center justify-center"
        >
          <Ionicons name="logo-whatsapp" size={16} color="#fff" />
          <Text className="text-white font-semibold ml-2 text-sm">Continue on WhatsApp</Text>
        </Pressable>
      </View>

      <View className="px-3 pb-3 pt-1 bg-white border-t border-line flex-row items-center gap-2">
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Type a message…"
          placeholderTextColor="#94A3B8"
          multiline
          className="flex-1 border border-line rounded-2xl px-3 py-2 text-base bg-bg max-h-32"
        />
        <Pressable
          onPress={send}
          disabled={!text.trim() || sending}
          className={`rounded-full w-11 h-11 items-center justify-center ${
            !text.trim() || sending ? "bg-navy-200" : "bg-navy-500 active:bg-navy-600"
          }`}
        >
          <Ionicons name="send" size={18} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
