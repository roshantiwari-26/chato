export async function getConversations() {
  const response = await fetch(
    `${import.meta.env.VITE_API_URL}/conversations`,
    {
      credentials: "include",
    },
  );

  if (!response.ok) {
    throw new Error("Failed to fetch conversations");
  }

  return response.json();
}

export async function getMessages(
  conversationId,
  { limit = 50, before = null } = {},
) {
  const params = new URLSearchParams();

  params.set("limit", limit);

  if (before) {
    params.set("before", before);
  }

  const response = await fetch(
    `${import.meta.env.VITE_API_URL}/conversations/${conversationId}/messages?${params}`,
    {
      credentials: "include",
    },
  );

  if (!response.ok) {
    throw new Error("Failed to fetch messages");
  }

  return response.json();
}
