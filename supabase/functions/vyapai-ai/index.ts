import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const { model, messages, max_tokens } = await req.json();

    // Map any custom models or legacy names to gpt-4o-mini
    const targetModel = model?.includes("gpt") ? "gpt-4o-mini" : "gpt-4o-mini";

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: targetModel,
        messages,
        max_tokens: max_tokens || 1000,
        response_format: { type: "json_object" } // Ensure JSON if relevant
      }),
    });

    const data = await res.json();
    
    return new Response(JSON.stringify(data), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      status: res.status,
    });
  } catch (err) {
    return new Response(JSON.stringify({ 
      error: "AI Service Temporarily Unavailable", 
      details: err.message 
    }), {
      status: 200, // Return 200 so the frontend can handle the error object gracefully
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
