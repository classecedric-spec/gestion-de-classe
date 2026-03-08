import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY')
const SENDER_EMAIL = Deno.env.get('SENDER_EMAIL') || 'no-reply@gestion-de-classe.com'
const SENDER_NAME = Deno.env.get('SENDER_NAME') || 'Gestion de Classe'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { to, bcc, subject, htmlContent } = await req.json()

        // Get the user from the authorization header
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            throw new Error('Missing Authorization header')
        }

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        )

        const {
            data: { user },
        } = await supabaseClient.auth.getUser()

        if (!user) {
            throw new Error('User not found')
        }

        // Fetch user's Brevo API Key
        const { data: userProfile, error: profileError } = await supabaseClient
            .from('CompteUtilisateur')
            .select('brevo_api_key, nom, prenom, email')
            .eq('id', user.id)
            .single()

        if (profileError || !userProfile?.brevo_api_key) {
            throw new Error('Clé API Brevo non configurée dans votre profil.')
        }

        const apiKey = userProfile.brevo_api_key
        const senderEmail = userProfile.email || 'no-reply@gestion-de-classe.com'
        const senderName = `${userProfile.prenom} ${userProfile.nom}`.trim() || 'Gestion de Classe'

        const body: any = {
            sender: { name: senderName, email: senderEmail },
            to: to, // array of { email, name }
            subject: subject,
            htmlContent: htmlContent
        }

        if (bcc && Array.isArray(bcc) && bcc.length > 0) {
            body.bcc = bcc;
        }

        const res = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': apiKey,
                'accept': 'application/json'
            },
            body: JSON.stringify(body)
        })

        const data = await res.json()

        if (!res.ok) {
            console.error('Brevo Error:', data)
            return new Response(JSON.stringify({ error: data }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
