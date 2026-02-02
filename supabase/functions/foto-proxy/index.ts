import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    // Remove o prefixo /foto-proxy/ do path
    const pathMatch = url.pathname.match(/\/foto-proxy\/(.+)$/);
    
    if (!pathMatch || !pathMatch[1]) {
      return new Response(
        JSON.stringify({ error: 'Path da imagem não fornecido' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const imagePath = pathMatch[1];
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    
    if (!supabaseUrl) {
      return new Response(
        JSON.stringify({ error: 'SUPABASE_URL não configurada' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Buscar imagem do Storage
    const storageUrl = `${supabaseUrl}/storage/v1/object/public/fotos-protocolos/${imagePath}`;
    
    console.log(`Fetching image from: ${storageUrl}`);
    
    const response = await fetch(storageUrl);
    
    if (!response.ok) {
      console.error(`Storage returned ${response.status}: ${response.statusText}`);
      return new Response(
        JSON.stringify({ error: 'Imagem não encontrada' }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const contentType = response.headers.get('Content-Type') || 'image/jpeg';
    const imageData = await response.arrayBuffer();

    return new Response(imageData, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Erro no foto-proxy:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno ao buscar imagem' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
