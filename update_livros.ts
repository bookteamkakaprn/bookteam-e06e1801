import { supabase } from "./src/integrations/supabase/client";

const livros_jornada = [
  { titulo: "Mantenha Seu Amor Aceso", ordem: 1, trilha: "Essencial" },
  { titulo: "Cultura da Honra", ordem: 2, trilha: "Essencial" },
  { titulo: "Impunível", ordem: 3, trilha: "Jornada" },
  { titulo: "Ative Seu Cérebro", ordem: 4, trilha: "Jornada" },
  { titulo: "Organize Sua Desordem Mental", ordem: 5, trilha: "Jornada" },
  { titulo: "O Despertar da Leoa", ordem: 6, trilha: "Jornada" },
  { titulo: "Mulheres com Espadas", ordem: 7, trilha: "Jornada" },
  { titulo: "Os Caminhos Sobrenaturais da Realeza", ordem: 8, trilha: "Jornada" },
  { titulo: "O Poder Sobrenatural de uma Mente Transformada", ordem: 9, trilha: "Jornada" },
  { titulo: "Treinamento Ministerial", ordem: 10, trilha: "Jornada" },
];

async function update() {
  // Primeiro, vamos ver o que tem lá
  const { data: existing } = await supabase.from('livros').select('id, titulo');
  
  for (const l of livros_jornada) {
    const found = existing?.find(ex => ex.titulo.toLowerCase().includes(l.titulo.toLowerCase()));
    if (found) {
      await supabase.from('livros').update({ ordem: l.ordem, trilha: l.trilha }).eq('id', found.id);
      console.log(`Atualizado: ${l.titulo}`);
    } else {
      // Se não existe, podemos inserir um placeholder
      await supabase.from('livros').insert({ 
        titulo: l.titulo, 
        ordem: l.ordem, 
        categoria: 'Jornada',
        autor: 'Autor',
        descricao: 'Descrição pendente'
      });
      console.log(`Inserido: ${l.titulo}`);
    }
  }
}

update();
