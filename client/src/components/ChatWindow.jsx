import { useEffect, useState, useCallback, useRef } from "react";
import MessageInput from "./MessageInput";
import MessageList from "./MessageList";
import { getMessages } from "../api/conversations";
import {
  useWebSocketActions,
  useWebSocketConnection,
  useWebSocketEvents,
} from "../context/WebSocketContext";
import styles from "./ChatWindow.module.css";

const getNormalizedId = (value) => {
  if (value == null) {
    return null;
  }

  if (typeof value === "string" || typeof value === "number") {
    return value.toString();
  }

  return (
    value.id?.toString() ||
    value._id?.toString() ||
    value.clientMessageId?.toString() ||
    null
  );
};

const getServerMessageId = (message) =>
  getNormalizedId(message?._id) || getNormalizedId(message?.id);

const getClientMessageId = (message) =>
  getNormalizedId(message?.clientMessageId);

const getMessageStatus = (message) => {
  if (message.readAt) {
    return "read";
  }

  if (message.deliveredAt) {
    return "delivered";
  }

  return "sent";
};

const messagesMatch = (first, second) => {
  const firstServerId = getServerMessageId(first);
  const secondServerId = getServerMessageId(second);

  if (firstServerId && secondServerId && firstServerId === secondServerId) {
    return true;
  }

  const firstClientId = getClientMessageId(first);
  const secondClientId = getClientMessageId(second);

  return Boolean(
    firstClientId && secondClientId && firstClientId === secondClientId,
  );
};

const mergeMessages = (existingMessages, incomingMessages) => {
  const merged = [...existingMessages];

  for (const incomingMessage of incomingMessages) {
    const existingIndex = merged.findIndex((message) =>
      messagesMatch(message, incomingMessage),
    );

    if (existingIndex === -1) {
      merged.push(incomingMessage);
      continue;
    }

    merged[existingIndex] = {
      ...merged[existingIndex],
      ...incomingMessage,
    };
  }

  return merged.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
};

function ChatWindow({ conversation, currentUser, onBack }) {
  const {
    sendMessage,
    sendCallInitiate,
    sendCallReject,
    sendCallAccept,
    sendWebRTCOffer,
    sendWebRTCAnswer,
    sendWebRTCIceCandidate,
    subscribeToPresence,
    unsubscribePresence,
    sendTypingStart,
    sendTypingStop,
    sendMessageRead,
    sendConversationRead,
    sendMessageDelete,
  } = useWebSocketActions();

  const { connected } = useWebSocketConnection();

  const { lastMessage } = useWebSocketEvents();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [otherUserOnline, setOtherUserOnline] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);

  const peerConnectionRef = useRef(null);
  const pendingIceCandidatesRef = useRef([]);

  const currentUserId = getNormalizedId(currentUser);
  const conversationId = getNormalizedId(conversation);

  const otherUser = conversation?.participants?.find(
    (user) => getNormalizedId(user) !== currentUserId,
  );

  const otherUserId = getNormalizedId(otherUser);

  const updateSingleMessage = useCallback((messageId, updates) => {
    const normalizedMessageId = getNormalizedId(messageId);

    if (!normalizedMessageId) {
      return;
    }

    setMessages((previousMessages) =>
      previousMessages.map((message) => {
        const matches =
          getServerMessageId(message) === normalizedMessageId ||
          getClientMessageId(message) === normalizedMessageId;

        return matches
          ? {
              ...message,
              ...updates,
            }
          : message;
      }),
    );
  }, []);

  const createCallOffer = useCallback(async () => {
    const peerConnection = peerConnectionRef.current;

    if (!peerConnection) {
      return;
    }

    console.log("REQUESTING MICROPHONE");

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });

    console.log("MICROPHONE STREAM:", {
      id: stream.id,
      active: stream.active,
      tracks: stream.getTracks().map((track) => ({
        kind: track.kind,
        enabled: track.enabled,
        muted: track.muted,
        readyState: track.readyState,
      })),
    });

    for (const track of stream.getTracks()) {
      console.log("ADDING LOCAL TRACK:", track);
      peerConnection.addTrack(track, stream);
    }

    const offer = await peerConnection.createOffer();

    console.log("OFFER CREATED:", offer);

    await peerConnection.setLocalDescription(offer);

    console.log("LOCAL DESCRIPTION SET:", peerConnection.localDescription);

    sendWebRTCOffer(otherUserId, offer);
  }, [otherUserId, sendWebRTCOffer]);

  const handleWebRTCOffer = useCallback(
    async (callerId, offer) => {
      const peerConnection = new RTCPeerConnection({
        iceServers: [
          {
            urls: "stun:stun.l.google.com:19302",
          },
        ],
      });

      peerConnectionRef.current = peerConnection;
      console.log("WEBRTC OFFER RECEIVED: peer connection created");

      peerConnection.onicecandidate = (event) => {
        if (!event.candidate) {
          console.log("ICE CANDIDATE GATHERING COMPLETE");
          return;
        }

        console.log("LOCAL ICE CANDIDATE:", event.candidate);

        sendWebRTCIceCandidate(callerId, event.candidate);
      };

      peerConnection.onicegatheringstatechange = () => {
        console.log("ICE GATHERING STATE:", peerConnection.iceGatheringState);
      };

      peerConnection.oniceconnectionstatechange = () => {
        console.log("ICE CONNECTION STATE:", peerConnection.iceConnectionState);
      };

      peerConnection.onconnectionstatechange = () => {
        console.log("PEER CONNECTION STATE:", peerConnection.connectionState);
      };

      peerConnection.onsignalingstatechange = () => {
        console.log("SIGNALING STATE:", peerConnection.signalingState);
      };

      peerConnection.ontrack = (event) => {
        console.log("REMOTE TRACK RECEIVED:", {
          kind: event.track.kind,
          enabled: event.track.enabled,
          muted: event.track.muted,
          readyState: event.track.readyState,
        });

        event.track.onunmute = () => {
          console.log("REMOTE TRACK UNMUTED");
        };

        event.track.onmute = () => {
          console.log("REMOTE TRACK MUTED");
        };

        const audio = new Audio();

        audio.srcObject = event.streams[0];

        audio.onplaying = () => {
          console.log("AUDIO ELEMENT PLAYING");
        };

        audio.onpause = () => {
          console.log("AUDIO ELEMENT PAUSED");
        };

        audio.onended = () => {
          console.log("AUDIO ELEMENT ENDED");
        };

        audio.onerror = (event) => {
          console.error("AUDIO ELEMENT ERROR:", event);
        };

        console.log("AUDIO ELEMENT CREATED:", {
          volume: audio.volume,
          muted: audio.muted,
          paused: audio.paused,
        });

        audio
          .play()
          .then(() => {
            console.log("AUDIO PLAY SUCCESS");
          })
          .catch((error) => {
            console.error("AUDIO PLAY ERROR:", error);
          });
      };

      peerConnection.onicecandidate = (event) => {
        if (!event.candidate) {
          return;
        }

        sendWebRTCIceCandidate(callerId, event.candidate);
      };

      console.log("SETTING REMOTE DESCRIPTION");

      await peerConnection.setRemoteDescription(offer);

      console.log("REMOTE DESCRIPTION SET:", peerConnection.remoteDescription);

      console.log("REQUESTING MICROPHONE");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      console.log("MICROPHONE STREAM:", {
        id: stream.id,
        active: stream.active,
        tracks: stream.getTracks().map((track) => ({
          kind: track.kind,
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
        })),
      });

      for (const track of stream.getTracks()) {
        console.log("ADDING LOCAL TRACK:", track);
        peerConnection.addTrack(track, stream);
      }

      const answer = await peerConnection.createAnswer();

      console.log("ANSWER CREATED:", answer);

      await peerConnection.setLocalDescription(answer);

      console.log("LOCAL DESCRIPTION SET:", peerConnection.localDescription);

      sendWebRTCAnswer(callerId, answer);
    },
    [sendWebRTCIceCandidate, sendWebRTCAnswer],
  );

  const handleWebRTCAnswer = useCallback(async (answer) => {
    const peerConnection = peerConnectionRef.current;

    if (!peerConnection) {
      return;
    }

    await peerConnection.setRemoteDescription(answer);
  }, []);

  const handleWebRTCIceCandidate = useCallback(async (candidate) => {
    console.log("REMOTE ICE CANDIDATE RECEIVED:", candidate);

    const peerConnection = peerConnectionRef.current;

    if (!peerConnection) {
      console.log("ICE CANDIDATE DROPPED: NO PEER CONNECTION");
      return;
    }

    if (!peerConnection.remoteDescription) {
      console.log("ICE CANDIDATE QUEUED: NO REMOTE DESCRIPTION");
      pendingIceCandidatesRef.current.push(candidate);
      return;
    }

    console.log("ADDING REMOTE ICE CANDIDATE");

    await peerConnection.addIceCandidate(candidate);

    console.log("REMOTE ICE CANDIDATE ADDED");
  }, []);

  useEffect(() => {
    setOtherUserOnline(false);
    setOtherUserTyping(false);
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId || !otherUserId || !connected) {
      return;
    }

    subscribeToPresence(otherUserId);

    return () => {
      unsubscribePresence(otherUserId);
    };
  }, [
    conversationId,
    otherUserId,
    connected,
    subscribeToPresence,
    unsubscribePresence,
  ]);

  useEffect(() => {
    if (!lastMessage || !otherUserId) {
      return;
    }

    const { type, payload } = lastMessage;

    if (type !== "presence.online" && type !== "presence.offline") {
      return;
    }

    const targetUserId = getNormalizedId(payload?.userId);

    if (targetUserId !== otherUserId) {
      return;
    }

    setOtherUserOnline(type === "presence.online");
  }, [lastMessage, otherUserId]);

  useEffect(() => {
    if (!lastMessage || !conversationId || !otherUserId) {
      return;
    }

    const { type, payload } = lastMessage;

    if (type !== "typing.start" && type !== "typing.stop") {
      return;
    }

    const typingUserId = getNormalizedId(payload?.userId);

    if (typingUserId !== otherUserId) {
      return;
    }

    setOtherUserTyping(type === "typing.start");
  }, [lastMessage, conversationId, otherUserId]);

  useEffect(() => {
    if (!lastMessage || !conversationId) {
      return;
    }

    const { type, payload } = lastMessage;

    if (!payload) {
      return;
    }

    switch (type) {
      case "message.new": {
        if (getNormalizedId(payload.conversationId) !== conversationId) {
          return;
        }

        const incomingMessage = {
          ...payload,
          status: getMessageStatus(payload),
        };

        setMessages((previousMessages) =>
          mergeMessages(previousMessages, [incomingMessage]),
        );

        if (sendMessageRead && payload.id) {
          sendMessageRead(payload.id);
        }

        break;
      }

      case "message.ack": {
        if (getNormalizedId(payload.conversationId) !== conversationId) {
          return;
        }

        const clientMessageId = getNormalizedId(payload.clientMessageId);

        if (!clientMessageId) {
          return;
        }

        setMessages((previousMessages) =>
          previousMessages.map((message) =>
            getClientMessageId(message) === clientMessageId
              ? {
                  ...message,
                  id: payload.messageId,
                  conversationId:
                    payload.conversationId || message.conversationId,
                  status: "sent",
                  createdAt: payload.createdAt || message.createdAt,
                }
              : message,
          ),
        );

        break;
      }

      case "message.error": {
        const clientMessageId = getNormalizedId(payload.clientMessageId);

        if (!clientMessageId) {
          return;
        }

        updateSingleMessage(clientMessageId, {
          status: "failed",
        });

        break;
      }

      case "message.delivered": {
        if (!payload.messageId) {
          return;
        }

        updateSingleMessage(payload.messageId, {
          status: "delivered",
          deliveredAt: payload.deliveredAt,
        });

        break;
      }

      case "message.read": {
        if (!payload.messageId) {
          return;
        }

        updateSingleMessage(payload.messageId, {
          status: "read",
          readAt: payload.readAt,
        });

        break;
      }

      case "conversation.read": {
        if (getNormalizedId(payload.conversationId) !== conversationId) {
          return;
        }

        setMessages((previousMessages) =>
          previousMessages.map((message) => {
            if (getNormalizedId(message.senderId) !== currentUserId) {
              return message;
            }

            return {
              ...message,
              status: "read",
              readAt: payload.readAt,
            };
          }),
        );

        break;
      }

      case "message.deleted": {
        if (!payload.messageId) {
          return;
        }

        updateSingleMessage(payload.messageId, {
          deletedAt: payload.deletedAt,
        });

        setMessages((previousMessages) =>
          previousMessages.map((message) => {
            if (
              getNormalizedId(message.replyTo?._id) !==
              getNormalizedId(payload.messageId)
            ) {
              return message;
            }

            return {
              ...message,
              replyTo: {
                ...message.replyTo,
                deletedAt: payload.deletedAt,
              },
            };
          }),
        );

        break;
      }

      case "call.incoming": {
        setIncomingCall(lastMessage.payload);
        break;
      }

      case "call.rejected": {
        console.log("Call rejected:", lastMessage.payload);
        break;
      }

      case "call.accepted": {
        const peerConnection = new RTCPeerConnection({
          iceServers: [
            {
              urls: "stun:stun.l.google.com:19302",
            },
          ],
        });

        peerConnectionRef.current = peerConnection;
        console.log("CALL ACCEPTED: peer connection created");

        peerConnection.onicecandidate = (event) => {
          if (!event.candidate) {
            console.log("ICE CANDIDATE GATHERING COMPLETE");
            return;
          }

          console.log("LOCAL ICE CANDIDATE:", event.candidate);

          sendWebRTCIceCandidate(otherUserId, event.candidate);
        };

        peerConnection.onicegatheringstatechange = () => {
          console.log("ICE GATHERING STATE:", peerConnection.iceGatheringState);
        };

        peerConnection.oniceconnectionstatechange = () => {
          console.log(
            "ICE CONNECTION STATE:",
            peerConnection.iceConnectionState,
          );
        };

        peerConnection.onconnectionstatechange = () => {
          console.log("PEER CONNECTION STATE:", peerConnection.connectionState);
        };

        peerConnection.onsignalingstatechange = () => {
          console.log("SIGNALING STATE:", peerConnection.signalingState);
        };

        peerConnection.ontrack = (event) => {
          console.log("REMOTE TRACK RECEIVED:", {
            kind: event.track.kind,
            enabled: event.track.enabled,
            muted: event.track.muted,
            readyState: event.track.readyState,
          });

          event.track.onunmute = () => {
            console.log("REMOTE TRACK UNMUTED");
          };

          event.track.onmute = () => {
            console.log("REMOTE TRACK MUTED");
          };

          const audio = new Audio();

          audio.srcObject = event.streams[0];

          audio.onplaying = () => {
            console.log("AUDIO ELEMENT PLAYING");
          };

          audio.onpause = () => {
            console.log("AUDIO ELEMENT PAUSED");
          };

          audio.onended = () => {
            console.log("AUDIO ELEMENT ENDED");
          };

          audio.onerror = (event) => {
            console.error("AUDIO ELEMENT ERROR:", event);
          };

          console.log("AUDIO ELEMENT CREATED:", {
            volume: audio.volume,
            muted: audio.muted,
            paused: audio.paused,
          });

          audio
            .play()
            .then(() => {
              console.log("AUDIO PLAY SUCCESS");
            })
            .catch((error) => {
              console.error("AUDIO PLAY ERROR:", error);
            });
        };

        peerConnection.onicecandidate = (event) => {
          if (!event.candidate) {
            return;
          }

          sendWebRTCIceCandidate(otherUserId, event.candidate);
        };

        createCallOffer();
        break;
      }

      case "webrtc.offer": {
        const { callerId, offer } = lastMessage.payload;

        handleWebRTCOffer(callerId, offer);

        break;
      }

      case "webrtc.answer": {
        const { answer } = lastMessage.payload;

        handleWebRTCAnswer(answer);

        break;
      }

      case "webrtc.ice-candidate": {
        const { candidate } = payload;

        handleWebRTCIceCandidate(candidate);

        break;
      }

      default:
        break;
    }
  }, [
    lastMessage,
    conversationId,
    currentUserId,
    sendMessageRead,
    updateSingleMessage,
    createCallOffer,
    handleWebRTCOffer,
    handleWebRTCAnswer,
    handleWebRTCIceCandidate,
  ]);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    let isCancelled = false;

    async function fetchMessages() {
      try {
        setLoading(true);
        setMessages([]);

        const data = await getMessages(conversationId);

        if (isCancelled) {
          return;
        }

        const fetchedMessages = (data.messages || []).map((message) => ({
          ...message,
          status: getMessageStatus(message),
        }));

        setMessages((previousMessages) =>
          mergeMessages(previousMessages, fetchedMessages),
        );

        if (sendConversationRead) {
          sendConversationRead(conversationId);
        }
      } catch (error) {
        if (!isCancelled) {
          console.error("Failed to fetch messages:", error);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    fetchMessages();

    return () => {
      isCancelled = true;
    };
  }, [conversationId, sendConversationRead]);

  const handleSend = useCallback(
    (text, replyingTo, attachment) => {
      if (!conversationId || !currentUserId || !otherUserId || !connected) {
        return;
      }

      const clientMessageId = crypto.randomUUID();

      const optimisticMessage = {
        id: clientMessageId,
        clientMessageId,
        conversationId,
        senderId: currentUserId,
        receiverId: otherUserId,
        text,
        type: attachment?.type || "text",
        imageUrl: attachment?.imageUrl || null,
        replyTo: replyingTo || null,
        createdAt: new Date().toISOString(),
        status: "sending",
      };

      setMessages((previousMessages) =>
        mergeMessages(previousMessages, [optimisticMessage]),
      );

      const sent = sendMessage(
        otherUserId,
        text,
        clientMessageId,
        replyingTo?._id || null,
        attachment?.type || "text",
        attachment?.imageUrl || null,
        attachment?.assetId || null,
      );

      if (sent === false) {
        updateSingleMessage(clientMessageId, {
          status: "failed",
        });
      }
    },
    [
      conversationId,
      currentUserId,
      otherUserId,
      connected,
      sendMessage,
      updateSingleMessage,
    ],
  );

  const handleCall = useCallback(() => {
    if (!connected || !otherUserId) {
      return;
    }

    sendCallInitiate(otherUserId);
  }, [connected, otherUserId, sendCallInitiate]);

  if (!conversation) {
    return (
      <section className={styles.emptyWindow}>
        <h2>Select a conversation</h2>{" "}
        <p>Choose a chat from the sidebar to start messaging.</p>
      </section>
    );
  }

  return (
    <section className={styles.chatWindow}>
      <header className={styles.chatHeader}>
        <button
          type="button"
          className={styles.backButton}
          onClick={onBack}
          aria-label="Back to conversations"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M15 18l-6-6 6-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <div className={styles.avatar}>
          {otherUser?.username?.charAt(0).toUpperCase() || "?"}
        </div>
        <div className={styles.userInfo}>
          <h2>{otherUser?.username || "Unknown User"}</h2>

          <span className={otherUserOnline ? styles.online : styles.offline}>
            {otherUserTyping
              ? "Typing..."
              : otherUserOnline
                ? "Online"
                : "Offline"}
          </span>
        </div>
        <button type="button" onClick={handleCall}>
          📞
        </button>
      </header>
      {incomingCall && (
        <div className={styles.incomingCall}>
          <p>Incoming Call</p>

          <div className={styles.incomingCallActions}>
            <button
              type="button"
              onClick={() => {
                sendCallReject(incomingCall.callerId);
                setIncomingCall(null);
              }}
            >
              Reject
            </button>

            <button
              type="button"
              onClick={() => {
                sendCallAccept(incomingCall.callerId);
                setIncomingCall(null);
              }}
            >
              Accept
            </button>
          </div>
        </div>
      )}

      <div className={styles.messagesContainer}>
        {loading && <p className={styles.loading}>Loading messages...</p>}

        {!loading && messages.length === 0 && (
          <p className={styles.emptyChat}>No messages yet.</p>
        )}

        <MessageList
          messages={messages}
          currentUserId={currentUserId}
          sendMessageDelete={sendMessageDelete}
          onReply={setReplyingTo}
        />
      </div>
      <MessageInput
        onSend={handleSend}
        connected={connected}
        receiverId={otherUserId}
        sendTypingStart={sendTypingStart}
        sendTypingStop={sendTypingStop}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
      />
    </section>
  );
}

export default ChatWindow;
