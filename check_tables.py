import os
from supabase import create_client, Client

url = os.environ.get("VITE_SUPABASE_URL")
key = os.environ.get("VITE_SUPABASE_ANON_KEY")
supabase: Client = create_client(url, key)

res = supabase.table('livros').select('titulo, ordem').execute()
print("Livros no banco:")
for l in res.data:
    print(f"- {l['titulo']} (Ordem: {l['ordem']})")
