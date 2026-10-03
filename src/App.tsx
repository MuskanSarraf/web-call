import AuthPage from "./pages/AuthPage";
import { useAuth } from "./hooks/useAuth";
import { signOut } from "./services/authService";

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <p>Loading...</p>;
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div>
      <h1>Welcome!</h1>

      <p>You are logged in.</p>

      <p>Email: {user.email}</p>

      <button onClick={() => void signOut()}>
        Logout
      </button>
    </div>
  );
}

export default App;