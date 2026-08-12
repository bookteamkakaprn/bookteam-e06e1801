import { supabase } from "./src/integrations/supabase/client";
const { data, error } = await supabase.from('configuracoes_pagamento').select('*');
console.log(JSON.stringify(data, null, 2), error);
