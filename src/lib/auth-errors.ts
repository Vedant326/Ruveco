import { FirebaseError } from "firebase/app";

const AUTH_ERRORS: Record<string, string> = {
  "auth/invalid-phone-number": "Enter a valid 10-digit mobile number",
  "auth/too-many-requests": "Too many attempts. Please wait a few minutes and try again.",
  "auth/invalid-verification-code": "Wrong OTP. Check the code and try again.",
  "auth/code-expired": "This OTP has expired. Tap Resend to get a new one.",
  "auth/billing-not-enabled": "SMS login needs the Firebase Blaze plan. Use a test number or Google sign-in for now.",
  "auth/operation-not-allowed": "This sign-in method is not turned on in Firebase yet.",
  "auth/network-request-failed": "No internet connection. Please try again.",
  "auth/popup-blocked": "Your browser blocked the Google window. Allow pop-ups and try again.",
  "auth/unauthorized-domain": "This website address is not allowed in Firebase Authentication settings.",
};

/** A sign-in error as a message to show, or null when the person just closed the Google window. */
export function authError(err: unknown) {
  if (err instanceof FirebaseError) {
    if (err.code === "auth/popup-closed-by-user" || err.code === "auth/cancelled-popup-request") return null;
    return AUTH_ERRORS[err.code] ?? "Could not sign in. Please try again.";
  }
  return "Could not sign in. Please try again.";
}
