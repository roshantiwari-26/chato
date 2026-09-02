function encodeCursor(message) {
  const cursor = {
    createdAt: message.createdAt,
    id: message._id.toString(),
  };

  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

function decodeCursor(cursor) {
  const decoded = Buffer.from(cursor, "base64url").toString("utf8");

  return JSON.parse(decoded);
}

module.exports = {
  encodeCursor,
  decodeCursor,
};
