import { supabase } from './services/supabase';

export async function saveDeals(deals: any[]) {
  if (deals.length === 0) return;

  const { error } = await supabase
    .from('deals')
    .upsert(deals, {
      onConflict: 'link',
    });

  if (error) {
    console.error(error);
  } else {
    console.log(`${deals.length} deals saved.`);
  }
}