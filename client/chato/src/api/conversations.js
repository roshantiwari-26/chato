export async function getConversations() {
  const response = await fetch(`http://localhost:3000/api/conversations`, {
    credentials: "include",
  });

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
    `${API_URL}/conversations/${conversationId}/messages?${params}`,
    {
      credentials: "include",
    },
  );

  if (!response.ok) {
    throw new Error("Failed to fetch messages");
  }

  return response.json();
}
