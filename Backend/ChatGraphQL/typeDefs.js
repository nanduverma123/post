const { gql } = require("apollo-server-express");

const typeDefs = gql`
  scalar Upload

  type Media {
    url: String
    type: String
    filename: String
    size: Int
  }

type Message {
  id: ID!
  sender: User!
  receiver: User!
  message: String           # ✅ optional message
  media: Media              # ✅ optional media object
  seen: Boolean!            # ✅ seen status
  isLastMessage: Boolean!   # ✅ last message status in conversation
  createdAt: String!
}

type ClearedChat {
  id: ID!
  userId: ID!               # jo user ne chat clear kari hai
  chatWithUserId: ID!       # jisse chat kar rha hai uski id
  clearedAt: String!        # jab chat clear kari tab ka datetime
}

  type ZegoTokenResponse {
    token: String!
    roomID: String!
    userID: String!
    username: String!
    appID: Int!
    serverSecret: String!
  }

  input MediaInput {
    url: String
    type: String
    filename: String
    size: Int
  }

  type Query {
    getMessages(senderId: ID!, receiverId: ID!): [Message]
    getUnreadCount(senderId: ID!, receiverId: ID!): Int
    getLastMessages(userId: ID!): [Message]
    joinvideocall(roomID: String!): ZegoTokenResponse!
    getClearedChats(userId: ID!): [ClearedChat]
    isChatCleared(userId: ID!, chatWithUserId: ID!): Boolean
  }

  type Mutation {
    sendMessage(
      senderId: ID!
      receiverId: ID!
      message: String
      media: MediaInput
    ): Message
    sendMessageWithFile(
      senderId: ID!
      receiverId: ID!
      message: String
      file: Upload
    ): Message
    markMessageAsSeen(messageId: ID!): Boolean
    markAllMessagesAsSeen(senderId: ID!, receiverId: ID!): Boolean
    deleteMessage(messageId: ID!): Boolean
    clearChat(userId: ID!, chatWithUserId: ID!): Boolean
  }
`;

module.exports = typeDefs;
