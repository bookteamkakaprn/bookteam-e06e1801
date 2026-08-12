import { supabase } from "./src/integrations/supabase/client";

async function check() {
  const { data, error } = await supabase.from('livros').select('titulo, ordem, trilha');
  if (error) {
    console.error(error);
    return;
  }
  console.log("Livros no banco:");
  data.forEach(l => console.log(`- ${l.titulo} (Ordem: ${l.ordem}, Trilha: ${l.trilha})`));
}

check();
