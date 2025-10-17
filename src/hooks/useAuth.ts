import { useState, useEffect } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      // Check if user is active after login
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('active')
          .eq('id', session.user.id)
          .single();
        
        if (profile && !profile.active) {
          // User is deactivated, sign out immediately
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
          toast({
            title: "Conta desativada",
            description: "Sua conta foi desativada. Entre em contato com o administrador.",
            variant: "destructive",
          });
        }
      }
      
      setLoading(false);
    });

    // Check current session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      // Check if user is active
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('active')
          .eq('id', session.user.id)
          .single();
        
        if (profile && !profile.active) {
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
          toast({
            title: "Conta desativada",
            description: "Sua conta foi desativada. Entre em contato com o administrador.",
            variant: "destructive",
          });
        }
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      window.location.href = "/";
    } catch (error) {
      console.error("Error signing out:", error);
      window.location.href = "/";
    }
  };

  return { user, session, loading, signOut };
}
