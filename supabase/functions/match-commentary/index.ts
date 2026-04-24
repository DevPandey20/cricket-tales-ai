// AI Match Commentary — generates a Star Sports-style pre-match preview
// using Lovable AI Gateway. All facts come from the client (already computed
// from the prediction engine) so the AI just packages them as natural language.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  team1: string;
  team2: string;
  venue: string;
  predictedWinner: string;
  winProbability: number;
  player?: string;
  predictedRuns?: number;
  predictedWickets?: number;
  factors: { label: string; value: string }[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as RequestBody;
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const factsBlock = body.factors.map((f) => `- ${f.label}: ${f.value}`).join("\n");
    const prompt = `Write a sharp, Star Sports-style 2-3 paragraph pre-match preview for an IPL match.

MATCH: ${body.team1} vs ${body.team2}
VENUE: ${body.venue}

DATA-DRIVEN PREDICTION (treat these as your sources of truth):
- Predicted winner: ${body.predictedWinner} (${body.winProbability}% probability)
${body.player ? `- Player to watch: ${body.player} (predicted ${body.predictedRuns ?? 0} runs, ${body.predictedWickets ?? 0} wickets)` : ""}

KEY FACTORS:
${factsBlock}

Tone: confident, vivid, cricket-savvy. Reference the actual numbers above, not vague generalities. No emojis. End with a one-line bold call (e.g. "Backing the Knights to nick this one in the death overs."). Plain prose only — no markdown headings.`;

    const aiResp = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content:
                "You are a senior cricket commentator writing data-driven match previews for an IPL prediction app. Be concise and confident.",
            },
            { role: "user", content: prompt },
          ],
        }),
      },
    );

    if (aiResp.status === 429) {
      return new Response(
        JSON.stringify({ error: "Rate limit reached. Please wait a moment and try again." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (aiResp.status === 402) {
      return new Response(
        JSON.stringify({ error: "AI credits exhausted. Add credits in Lovable Cloud settings." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResp.json();
    const commentary = data?.choices?.[0]?.message?.content ?? "";
    return new Response(JSON.stringify({ commentary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("commentary error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
