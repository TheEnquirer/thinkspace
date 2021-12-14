import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js';
import Secrets from './.secrets.js';



const supabaseUrl = Secrets.SUPABASE_URL
const supabaseKey = Secrets.SUPABASE_ANON_KEY
export const supabaseClient = createClient(supabaseUrl, supabaseKey)

export const addCommentToDb = async (user, text, coords, children) => {
    console.log("adding a comment :)")
    const { d, e } = await supabaseClient
        .from('comments')
        .insert([
            {
		user: user,
		text: text,
		coords: coords,
		children: children,
	    },
        ])
    return e
}



// TESTING FUNCTION
export const Testing = () => {
    //console.log(supabaseKey)
    addComment();
}

