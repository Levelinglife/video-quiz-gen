
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audioData, languageCode = 'en-US' } = await req.json();
    const googleCloudKey = Deno.env.get('GOOGLE_CLOUD_API_KEY');

    if (!googleCloudKey) {
      throw new Error('Google Cloud API key not configured');
    }

    if (!audioData) {
      throw new Error('Audio data is required');
    }

    // Convert base64 audio to the format needed by Speech-to-Text API
    const audioBytes = atob(audioData);
    const audioBuffer = new Uint8Array(audioBytes.length);
    for (let i = 0; i < audioBytes.length; i++) {
      audioBuffer[i] = audioBytes.charCodeAt(i);
    }

    // Prepare the request for Google Speech-to-Text API
    const speechRequest = {
      config: {
        encoding: 'WEBM_OPUS',
        sampleRateHertz: 48000,
        languageCode: languageCode,
        enableAutomaticPunctuation: true,
        enableWordTimeOffsets: false,
        model: 'latest_long'
      },
      audio: {
        content: audioData
      }
    };

    const response = await fetch(
      `https://speech.googleapis.com/v1/speech:recognize?key=${googleCloudKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(speechRequest),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google Speech-to-Text API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    if (!result.results || result.results.length === 0) {
      throw new Error('No speech detected in audio');
    }

    // Combine all transcription results
    const transcript = result.results
      .map((result: any) => result.alternatives[0]?.transcript || '')
      .filter((text: string) => text.trim().length > 0)
      .join(' ');

    return new Response(JSON.stringify({
      transcript: transcript,
      confidence: result.results[0]?.alternatives[0]?.confidence || 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in speech-to-text function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
