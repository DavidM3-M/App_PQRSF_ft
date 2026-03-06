import { Outlet } from "react-router";
import { InstitutionalNavbar } from "./InstitutionalNavbar";
import { Toaster } from "sonner";
import { ChatBot } from "../ChatBot";
import { AuthProvider } from "../../context/AuthContext";
import { PageTransition } from "../PageTransition";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { GOOGLE_CLIENT_ID } from "../../lib/config";

export function Layout() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <AuthProvider>
      <div className="min-h-screen bg-background">
        <InstitutionalNavbar />
        <main>
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
        <ChatBot />
        <Toaster position="top-right" richColors />
      </div>
    </AuthProvider>
    </GoogleOAuthProvider>
  );
}