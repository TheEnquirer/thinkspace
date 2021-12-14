import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js';
import Secrets from './.secrets.js';



const supabaseUrl = Secrets.SUPABASE_URL
const supabaseKey = Secrets.SUPABASE_ANON_KEY
export const supabaseClient = createClient(supabaseUrl, supabaseKey)

export const addComment = async () => {
    const { d, e } = await supabaseClient
        .from('comments')
        .insert([
            { user: "jeffery", content: {user: "jeffery", text: "heew!", children: [] } },
        ])
    return e
}


// TESTING FUNCTION
export const Testing = () => {
    //console.log(supabaseKelsy)
    addComment();
}

