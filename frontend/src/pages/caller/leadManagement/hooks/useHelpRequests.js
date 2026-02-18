import { useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  createHelpRequest,
  fetchIncomingHelpRequests,
  fetchSentHelpRequests,
  respondToHelpRequest,
} from "../../../../utils/api";
import { queryKeys } from "../../../../hooks/queries/queryKeys";
import { getSocket } from "../../../../utils/socket";

export default function useHelpRequests() {
  const queryClient = useQueryClient();

  const { data: incomingData, isLoading: incomingLoading } = useQuery({
    queryKey: queryKeys.incomingHelpRequests({ status: "pending" }),
    queryFn: () => fetchIncomingHelpRequests({ status: "pending" }),
    staleTime: 30 * 1000,
  });

  const { data: sentData, isLoading: sentLoading } = useQuery({
    queryKey: queryKeys.sentHelpRequests({ status: "pending" }),
    queryFn: () => fetchSentHelpRequests({ status: "pending" }),
    staleTime: 30 * 1000,
  });

  const incoming = incomingData?.data || [];
  const sent = sentData?.data || [];
  const loading = incomingLoading || sentLoading;

  const loadIncoming = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["incomingHelpRequests"] });
  }, [queryClient]);

  const loadSent = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["sentHelpRequests"] });
  }, [queryClient]);

  const loadAll = useCallback(() => {
    loadIncoming();
    loadSent();
  }, [loadIncoming, loadSent]);

  const sendRequest = useCallback(async ({ leadId, toCallerId, type, reason }) => {
    try {
      const res = await createHelpRequest({ leadId, toCallerId, type, reason });
      toast.success(type === "transfer" ? "Transfer request sent" : "Help request sent");
      loadSent();
      return res;
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || "Failed to send request";
      toast.error(msg);
      throw err;
    }
  }, [loadSent]);

  const respond = useCallback(async (requestId, action) => {
    try {
      const res = await respondToHelpRequest(requestId, action);
      toast.success(action === "accept" ? "Request accepted" : "Request rejected");
      loadIncoming();
      return res;
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || "Failed to respond";
      toast.error(msg);
      throw err;
    }
  }, [loadIncoming]);

  // Socket listeners
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onNewRequest = (data) => {
      toast(
        `${data.fromCaller?.name || "A caller"} is requesting ${data.type === "transfer" ? "to transfer" : "help on"} lead "${data.lead?.name || "Unknown"}"`,
        { icon: "🤝", duration: 6000 }
      );
      loadIncoming();
    };

    const onResponse = (data) => {
      const verb = data.action === "accept" ? "accepted" : "rejected";
      toast(
        `${data.byCaller?.name || "Caller"} ${verb} your ${data.type} request`,
        { icon: data.action === "accept" ? "✅" : "❌", duration: 5000 }
      );
      loadSent();
    };

    socket.on("help:request:new", onNewRequest);
    socket.on("help:request:responded", onResponse);

    return () => {
      socket.off("help:request:new", onNewRequest);
      socket.off("help:request:responded", onResponse);
    };
  }, [loadIncoming, loadSent]);

  return {
    incoming,
    sent,
    loading,
    sendRequest,
    respond,
    loadIncoming,
    loadSent,
    loadAll,
    incomingCount: incoming.length,
  };
}
