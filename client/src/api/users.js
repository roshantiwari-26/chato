export async function searchUsers(query) {
  const response = await fetch(
    `${import.meta.env.VITE_API_URL}/users/search?q=${encodeURIComponent(query)}`,
    {
      credentials: "include",
    },
  );

  if (!response.ok) {
    throw new Error("Failed to search users");
  }

  return response.json();
}
