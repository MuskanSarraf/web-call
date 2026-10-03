import AuthPage from "./pages/AuthPage";
import ChatPage from "./pages/ChatPage";
import { useAuth } from "./hooks/useAuth";

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <p>Loading...</p>;
  }

  if (!user) {
    return <AuthPage />;
  }

  return <ChatPage userId={user.id} />;
}

export default App;