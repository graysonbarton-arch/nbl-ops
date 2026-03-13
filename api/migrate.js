import { getServiceClient } from '../lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const secret = req.headers['x-migrate-key'];
  if (secret !== 'nbl-run-migrate-2026') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const supabase = getServiceClient();
  const results = [];

  // Step 1: Check if advances table exists, create if not
  try {
    const { error } = await supabase.from('advances').select('id').limit(1);
    if (error && error.message.includes('Could not find')) {
      results.push({ step: 'advances_table', status: 'needs_creation' });
    } else {
      results.push({ step: 'advances_table', status: 'exists' });
    }
  } catch (e) {
    results.push({ step: 'advances_check', error: e.message });
  }

  // Step 2: Check budgets table id column type
  try {
    const { data, error } = await supabase.from('budgets').select('id').limit(1);
    if (error) {
      results.push({ step: 'budgets_check', error: error.message });
    } else {
      results.push({ step: 'budgets_check', status: 'ok', sample: data });
    }
  } catch (e) {
    results.push({ step: 'budgets_check', error: e.message });
  }

  // Step 3: Try inserting a test budget with text ID
  try {
    const { data, error } = await supabase
      .from('budgets')
      .upsert({
        id: 'test_text_id_check',
        title: 'Migration Test',
        subtitle: '',
        status: 'Draft',
        data: { _migrationTest: true },
        created_by: 'anonymous',
        updated_by: 'anonymous',
      }, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      results.push({ step: 'budgets_text_id_insert', error: error.message });
    } else {
      results.push({ step: 'budgets_text_id_insert', status: 'ok', id: data.id });
      // Clean up test row
      await supabase.from('budgets').delete().eq('id', 'test_text_id_check');
    }
  } catch (e) {
    results.push({ step: 'budgets_text_id_insert', error: e.message });
  }

  // Step 4: Try inserting a test advance
  try {
    const { data, error } = await supabase
      .from('advances')
      .upsert({
        id: 'test_adv_check',
        show_name: 'Migration Test',
        venue: '',
        show_date: '',
        status: 'Not Started',
        data: { _migrationTest: true },
        created_by: 'anonymous',
        updated_by: 'anonymous',
      }, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      results.push({ step: 'advances_insert', error: error.message });
    } else {
      results.push({ step: 'advances_insert', status: 'ok', id: data.id });
      await supabase.from('advances').delete().eq('id', 'test_adv_check');
    }
  } catch (e) {
    results.push({ step: 'advances_insert', error: e.message });
  }

  return res.status(200).json({ results });
}
