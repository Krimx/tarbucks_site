// 1. Initialize Supabase (Replace these with your actual keys from Step 1)
const supabaseUrl = 'https://jjsuczcuipdojsbfutaq.supabase.co';
const supabaseKey = 'sb_publishable_C42OxgLWxLUxaOmn9l6_kg_SLLnBzPv';

const { createClient } = window.supabase;
const supabase = createClient(supabaseUrl, supabaseKey);

// 2. Fetch the data from the database
async function fetchData() {
    const { data, error } = await supabase
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