import { useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { ArrowRight, LockKeyhole, Mail, X } from "lucide-react";
import { auth } from "../firebase";
import "./auth.css";

function getFriendlyAuthError(error) {
  switch (error?.code) {
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/email-already-in-use":
      return "An account with this email already exists. Try signing in instead.";
    case "auth/weak-password":
      return "Please choose a password with at least 6 characters.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "The email or password is incorrect. Please try again.";
    case "auth/too-many-requests":
      return "There have been too many attempts. Please wait a little and try again.";
    case "auth/operation-not-allowed":
      return "Email/password sign-in is not enabled in Firebase Authentication yet.";
    case "auth/network-request-failed":
      return "A network error occurred. Check your internet connection and try again.";
    default:
      return "Something went wrong. Please try again in a moment.";
  }
}

export default function AuthModal({ initialMode = "signin", onClose, onSuccess }) {
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !loading) onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [loading, onClose]);

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setErrorMessage("");
    setPassword("");
    setConfirmPassword("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setErrorMessage("Enter your email address and password to continue.");
      return;
    }

    if (mode === "signup" && password.length < 6) {
      setErrorMessage("Your password must contain at least 6 characters.");
      return;
    }

    if (mode === "signup" && password !== confirmPassword) {
      setErrorMessage("The passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        await createUserWithEmailAndPassword(auth, cleanEmail, password);
      } else {
        await signInWithEmailAndPassword(auth, cleanEmail, password);
      }
      onSuccess?.();
    } catch (error) {
      console.error("Avenza authentication error:", error);
      setErrorMessage(getFriendlyAuthError(error));
    } finally {
      setLoading(false);
    }
  };

  const isSignup = mode === "signup";

  return (
    <div
      className="auth-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) onClose();
      }}
    >
      <section
        className="auth-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
      >
        <button
          type="button"
          className="auth-close-button"
          aria-label="Close authentication form"
          onClick={onClose}
          disabled={loading}
        >
          <X size={20} />
        </button>

        <div className="auth-brand-mark" aria-hidden="true">A</div>
        <span className="auth-eyebrow">YOUR MONEY, MADE CLEAR</span>
        <h2 id="auth-modal-title">
          {isSignup ? "Create your Avenza account" : "Welcome back"}
        </h2>
        <p className="auth-description">
          {isSignup
            ? "Create an account to start building your personal financial workspace."
            : "Sign in to continue to your Avenza account."}
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="avenza-email">Email address</label>
          <div className="auth-input-wrap">
            <Mail size={18} aria-hidden="true" />
            <input
              id="avenza-email"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoFocus
            />
          </div>

          <label htmlFor="avenza-password">Password</label>
          <div className="auth-input-wrap">
            <LockKeyhole size={18} aria-hidden="true" />
            <input
              id="avenza-password"
              type="password"
              name="password"
              autoComplete={isSignup ? "new-password" : "current-password"}
              placeholder={isSignup ? "At least 6 characters" : "Enter your password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={6}
              required
            />
          </div>

          {isSignup && (
            <>
              <label htmlFor="avenza-confirm-password">Confirm password</label>
              <div className="auth-input-wrap">
                <LockKeyhole size={18} aria-hidden="true" />
                <input
                  id="avenza-confirm-password"
                  type="password"
                  name="confirmPassword"
                  autoComplete="new-password"
                  placeholder="Enter your password again"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  minLength={6}
                  required
                />
              </div>
            </>
          )}

          {errorMessage && (
            <p className="auth-error" role="alert">{errorMessage}</p>
          )}

          <button className="auth-submit-button" type="submit" disabled={loading}>
            {loading
              ? isSignup ? "Creating account..." : "Signing in..."
              : isSignup ? "Create account" : "Sign in"}
            {!loading && <ArrowRight size={17} />}
          </button>
        </form>

        <p className="auth-switch-copy">
          {isSignup ? "Already have an account?" : "New to Avenza?"}{" "}
          <button
            type="button"
            className="auth-switch-button"
            onClick={() => switchMode(isSignup ? "signin" : "signup")}
            disabled={loading}
          >
            {isSignup ? "Sign in" : "Create a free account"}
          </button>
        </p>
        <p className="auth-privacy-note">
          Your account is secured by Firebase Authentication. Your financial data is not uploaded by this form.
        </p>
      </section>
    </div>
  );
}
