const { gql } = require("apollo-server-express");

module.exports = gql`
  scalar Upload

  type StoryReply {
    id: ID
    message: String
    repliedAt: String
  }

  type Story {
    id: ID!
    userId: ID!
    username: String!
    avatar: String!
    mediaType: String         # Optional: "image" | "video"
    mediaUrl: String          # Optional URL to the uploaded media
    caption: String           # Optional text or main content
    createdAt: String!
    expiresAt: String!
    location: String
    viewers: [String]
    replies: [StoryReply]
  }

  type Query {
    getStories(userId: ID!): [Story]
    getStoryById(id: ID!): Story
    getUserStories(userId: ID!): [Story]
  }

  type Mutation {
    addStory(
      userId: ID!
      username: String!
      avatar: String!
      mediaType: String
      mediaUrl: String
      caption: String
      location: String
    ): Story

    uploadStoryMedia(file: Upload!): String
    viewStory(userId: ID!, statusId: ID!) : [Story]
    deleteStory(userId: ID!, statusId: ID!) : String

    replyToStory(storyId: ID!, userId: ID!, message: String!): Story

  }
`;
