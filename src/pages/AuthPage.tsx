import { useState } from "react";
import { signIn, signUp } from "../services/authService";

function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async () => {
    try {
      setMessage("");

      if (isSignUp) {
        await signUp(email, password);
        setMessage("Account created. You can now log in.");
      } else {
        await signIn(email, password);
        setMessage("Logged in successfully.");
      }
    } catch (error) {
      if (error instanceof Error) {
        setMessage(error.message);
      } else {
        setMessage("Something went wrong.");
      }
    }
  };

  return (
    <div>
      <h1>Web Call</h1>

      <h2>{isSignUp ? "Create Account" : "Login"}</h2>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />

      <button onClick={handleSubmit}>
        {isSignUp ? "Sign Up" : "Login"}
      </button>

      <button
        onClick={() => {
          setIsSignUp((current) => !current);
          setMessage("");
        }}
      >
        {isSignUp ? "Already have an account?" : "Create an account"}
      </button>

      {message && <p>{message}</p>}
    </div>
  );
}

export default AuthPage;