import { supabase } from "./src/integrations/supabase/client";

async function check() {
  const { data, error } = await supabase.from('livros').select('titulo, ordem');
  if (error) {
    console.error(error);
    return;
  }
  console.log("Livros no banco:");
  data.forEach(l => console.log(`- ${l.titulo} (Ordem: ${l.ordem})`));
}

check();
