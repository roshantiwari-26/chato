const Conversation = require("../models/conversationModel");

async function findOrCreateConversation(userA, userB) {
  let conversation = await Conversation.findOne({
    participants: {
      $all: [userA, userB],
    },
  });

  if (conversation) {
    return conversation;
  }
  const participants = [userA, userB].sort((a, b) =>
    a.toString().localeCompare(b.toString()),
  );

  conversation = await Conversation.create({
    participants,
  });

  return conversation;
}

module.exports = {
  findOrCreateConversation,
};
