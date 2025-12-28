import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface UserProfile {
  id: string;
  user_email: string;
  nome: string | null;
  foto_url: string | null;
  telefone: string | null;
  email_contato: string | null;
  unidade: string | null;
  nivel: string | null;
}

export function useUserProfile(userEmail: string | undefined) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchProfile = async () => {
    if (!userEmail) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_email', userEmail)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!userEmail) return false;

    try {
      // Check if profile exists
      const { data: existing } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_email', userEmail)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('user_profiles')
          .update(updates)
          .eq('user_email', userEmail);
        
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('user_profiles')
          .insert({ user_email: userEmail, ...updates });
        
        if (error) throw error;
      }

      await fetchProfile();
      toast({ title: 'Perfil atualizado com sucesso!' });
      return true;
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      toast({ title: 'Erro ao atualizar perfil', variant: 'destructive' });
      return false;
    }
  };

  const uploadFoto = async (file: File): Promise<string | null> => {
    if (!userEmail) return null;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userEmail.replace(/[@.]/g, '_')}_${Date.now()}.${fileExt}`;
      const filePath = `perfis/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('fotos-protocolos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('fotos-protocolos')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Erro ao fazer upload da foto:', error);
      toast({ title: 'Erro ao fazer upload da foto', variant: 'destructive' });
      return null;
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [userEmail]);

  return { profile, loading, updateProfile, uploadFoto, refetch: fetchProfile };
}
