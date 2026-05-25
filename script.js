// 1. Initialize Supabase
const supabaseUrl = 'https://jjsuczcuipdojsbfutaq.supabase.co';
const supabaseKey = 'sb_publishable_C42OxgLWxLUxaOmn9l6_kg_SLLnBzPv';

// We get createClient from the global supabase object
const { createClient } = window.supabase;

// Renamed to 'supabaseClient' so it doesn't collide with the global 'supabase' variable!
const supabaseClient = createClient(supabaseUrl, supabaseKey);

// 2. Fetch the data from the database
async function fetchData() {
    // Make sure to use the new variable name here too
    const { data, error } = await supabaseClient
        .from('test')
        .select('*');

    const outputElement = document.getElementById('output');

    if (error) {
        console.error('Error:', error);
        outputElement.innerText = 'Failed to connect to Supabase.';
    } else {
        // Output the message from our first data row
        outputElement.innerText = data[0].message; 
    }
}

fetchData();