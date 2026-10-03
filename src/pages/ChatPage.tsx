import { useEffect, useState } from "react";
import type { Message } from "../types/message";
import type { Profile } from "../types/profile";
import { getMessages, sendMessage } from "../services/messageService";
import { getProfiles } from "../services/profileService";
import { signOut } from "../services/authService";

type ChatPageProps = {
  userId: string;
};

function ChatPage({ userId }: ChatPageProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadProfiles = async () => {
      try {
        setError("");

        const data = await getProfiles(userId);
        setProfiles(data);
      } catch (error) {
        if (error instanceof Error) {
          setError(error.message);
        } else {
          setError("Failed to load users.");
        }
      } finally {
        setLoading(false);
      }
    };

    void loadProfiles();
  }, [userId]);

  useEffect(() => {
    if (!selectedUser) {
      setMessages([]);
      return;
    }

    const loadMessages = async () => {
      try {
        setError("");

        const data = await getMessages(userId, selectedUser.id);
        setMessages(data);
      } catch (error) {
        if (error instanceof Error) {
          setError(error.message);
        } else {
          setError("Failed to load messages.");
        }
      }
    };

    void loadMessages();
  }, [userId, selectedUser]);

  const handleSendMessage = async () => {
    if (!selectedUser) {
      return;
    }

    const trimmedMessage = messageText.trim();

    if (!trimmedMessage) {
      return;
    }

    try {
      setError("");

      const newMessage = await sendMessage(userId, {
        receiverId: selectedUser.id,
        message: trimmedMessage,
      });

      setMessages((currentMessages) => [
        ...currentMessages,
        newMessage,
      ]);

      setMessageText("");
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Failed to send message.");
      }
    }
  };

  if (loading) {
    return <p>Loading users...</p>;
  }

  return (
    <div>
      <header>
        <h1>Web Call</h1>

        <button onClick={() => void signOut()}>
          Logout
        </button>
      </header>

      <hr />

      <section>
        <h2>Users</h2>

        {profiles.length === 0 ? (
          <p>No other users found.</p>
        ) : (
          profiles.map((profile) => (
            <button
              key={profile.id}
              onClick={() => setSelectedUser(profile)}
            >
              {profile.email}
            </button>
          ))
        )}
      </section>

      <hr />

      {selectedUser ? (
        <section>
          <h2>Chat with {selectedUser.email}</h2>

          <div>
            {messages.length === 0 ? (
              <p>No messages yet.</p>
            ) : (
              messages.map((message) => (
                <div key={message.id}>
                  <strong>
                    {message.senderId === userId ? "You" : selectedUser.email}
                  </strong>

                  <p>{message.message}</p>
                </div>
              ))
            )}
          </div>

          <div>
            <input
              type="text"
              placeholder="Type a message..."
              value={messageText}
              onChange={(event) => setMessageText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void handleSendMessage();
                }
              }}
            />

            <button onClick={() => void handleSendMessage()}>
              Send
            </button>
          </div>
        </section>
      ) : (
        <p>Select a user to start chatting.</p>
      )}

      {error && <p>{error}</p>}
    </div>
  );
}

export default ChatPage;