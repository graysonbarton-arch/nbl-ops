import { getServiceClient, getUser } from '../lib/supabase.js';

function validateId(id) {
  if (!id) return true;
  return typeof id === 'string' && id.length <= 100 && /^[a-zA-Z0-9_-]+$/.test(id);
}

/* ── Seed data — all 44 NBL Live Link List items ─────────── */
const SEED_DATA = [
  { item: 'LED Panels (Pip saw in person)', category: 'LED/Panels', priority: 'High', link: 'https://www.instagram.com/reel/DWPFBDqiVUS/', notes: 'Pip went and saw these in person and they\'re actually really cool', source: 'Pip', use_case: 'General production' },
  { item: 'YouTube Bass Set Design', category: 'Stage Design', priority: 'High', link: 'https://www.instagram.com/reel/DVrD2hDGtN2/', notes: 'Something like this would be cool for a YouTube bass set', source: 'Instagram', use_case: 'YouTube bass set' },
  { item: 'AI Set Design Renders', category: 'Visuals/Content', priority: 'Medium', link: 'https://www.instagram.com/p/DVyyggSAkz4/', notes: 'Can start using AI as inspiration for set designs and getting quick renders', source: 'Instagram', use_case: 'Set design pre-visualization' },
  { item: 'Scaled Down Surrealism/Fantasy/Giant Content', category: 'Stage Design', priority: 'Medium', link: 'https://www.instagram.com/reel/DSzB8eDkZVk/', notes: 'Scaled down surrealism/fantasy/giant content', source: 'Instagram', use_case: 'Production design concepts' },
  { item: 'Pop Up Stage Option', category: 'Stage Design', priority: 'Medium', link: 'https://www.instagram.com/reel/DTNKN3ElN6R/', notes: 'More pop up stage option', source: 'Instagram', use_case: 'Portable/pop-up shows' },
  { item: 'Kinetic Flying System', category: 'Kinetic/Motion', priority: 'High', link: 'https://www.instagram.com/reel/DVoVrqrGtY3/', notes: 'Kinetic system for flying stuff', source: 'Instagram', use_case: 'Flying elements in shows' },
  { item: 'Inspo Reference', category: 'Stage Design', priority: 'Medium', link: 'https://www.instagram.com/p/DWPOinpDAZC/', notes: 'Man\u2026', source: 'Instagram', use_case: 'General inspiration' },
  { item: 'Lighting Precision Reference', category: 'Lighting', priority: 'High', link: 'https://www.reddit.com/r/lightingdesign/s/SoE5iBoyUx', notes: 'Lighting precision goal for shows at the end of this video', source: 'Reddit', use_case: 'Precision lighting for live shows' },
  { item: 'Laser Precision Reference', category: 'Lasers', priority: 'High', link: 'https://www.instagram.com/reel/DVHQT73km8d/', notes: 'This laser guy is the goat with the precision', source: 'Instagram', use_case: 'Laser precision for shows' },
  { item: 'Realistic Visuals (Anyma/Sphere Style)', category: 'Visuals/Content', priority: 'High', link: 'https://www.instagram.com/reel/DVZcpOZjOps/', notes: 'Wanna bring realism to visuals like Anyma did at the Sphere. More fantasy but this big', source: 'Instagram', use_case: 'Realistic fantasy visuals for shows' },
  { item: 'Rental Service Packages/Setups', category: 'Rental Packages', priority: 'High', link: 'https://www.instagram.com/reel/DVOH8yEDQQL/', notes: 'As we roll out the rental service I want to be able to offer packages and setups like this', source: 'Instagram', use_case: 'NBL rental service offerings' },
  { item: 'Rental Setup Reference #2', category: 'Rental Packages', priority: 'High', link: 'https://www.instagram.com/reel/DS2onzLjIrI/', notes: 'Additional rental setup reference', source: 'Instagram', use_case: 'NBL rental service offerings' },
  { item: 'Priority Implementation Item (Sent Before)', category: 'Stage Design', priority: 'High', link: 'https://www.instagram.com/reel/DVYnai3FbdW/', notes: 'Sent this before just wanna get on implementing it ASAP', source: 'Instagram', use_case: 'Priority implementation' },
  { item: 'Big/Giant Elements for Productions', category: 'Props/Physical', priority: 'High', link: 'https://www.instagram.com/reel/DTlF-EmiYF5/', notes: 'Sent before but wanna see how we can add big/giant elements into our productions', source: 'Instagram', use_case: 'Large-scale production elements' },
  { item: 'UV/Blacklight Paint Splatter Panels', category: 'Lighting', priority: 'Medium', link: 'https://www.instagram.com/reel/DVq9K_AEZIQ/', notes: 'Super simple and easy. Cool dynamic for hearing impaired, black light elements, chaos on big bass hits', source: 'Instagram', use_case: 'Accessibility, blacklight elements, bass hit visuals' },
  { item: 'Studio Camera/Filming Equipment', category: 'Lighting', priority: 'High', link: 'https://www.instagram.com/reel/DV7x4R9jmj8/', notes: 'Extremely expensive probably but want something like these for the weekly show we\'re gonna start filming for the network', source: 'Instagram', estimated_cost: 'Likely expensive', use_case: 'Weekly network show filming' },
  { item: 'LED Cubes (Full Cube - All Sides Manipulable)', category: 'LED/Panels', priority: 'High', link: 'https://www.instagram.com/p/B-pEgRJA-cY/', notes: 'Still a big fan of these but in the full cube form where each side of each cube can be manipulated', source: 'Instagram', use_case: 'Modular LED display elements' },
  { item: 'Immersive Experience (BassMint/Meow Wolf Style)', category: 'Stage Design', priority: 'High', link: 'https://www.instagram.com/reel/C5TeiQiLRX7/', notes: 'Would be dope to have something like this as the WiscansinFest BassMint - like a bass music Meow Wolf', source: 'Instagram', use_case: 'WiscansinFest BassMint immersive experience' },
  { item: 'Full Pop-Up Packages from NBL', category: 'Rental Packages', priority: 'High', link: 'https://www.instagram.com/reel/C76JiopvqNf/', notes: 'Definitely wanna start looking into what it would take to maintain and offer whole pop up packages from NBL', source: 'Instagram', use_case: 'NBL pop-up rental packages' },
  { item: 'DMX Controller/Interface', category: 'DMX/Control', priority: 'Medium', link: 'https://www.instagram.com/p/C-se9ByALn2/', notes: 'This looked cool but I don\'t know enough about DMX to know if it\'s actually cool', source: 'Instagram', use_case: 'DMX control for shows' },
  { item: 'LED Over the Crowd', category: 'LED/Panels', priority: 'High', link: 'https://www.instagram.com/reel/DANW3dTJZzF/', notes: 'I\'ve always wanted to have LED product go out and over the crowd somewhere', source: 'Instagram', use_case: 'Overhead LED for audience immersion' },
  { item: 'Music Cue Precision Reference (Previs)', category: 'Lighting', priority: 'High', link: 'https://www.instagram.com/reel/DBLjmfCs9t2/', notes: 'Showed this at previs. The precise timing on the music cues are so important', source: 'Instagram', use_case: 'Music-synced lighting precision' },
  { item: 'LED Depth/Over Crowd Reference', category: 'LED/Panels', priority: 'High', link: 'https://www.instagram.com/p/CvdIyp5sRR-/', notes: 'I like the depth on this. Kind of what I was saying about having the LED go out towards the ppl', source: 'Instagram', use_case: 'LED depth extending toward audience' },
  { item: 'Bass Show Production (Contact Crew in Caption)', category: 'Stage Design', priority: 'High', link: 'https://www.instagram.com/p/C_OHotZKToj/', notes: 'A bass show like this would change our lives!! All the ppl that worked on this are in the caption so if we ever wanna pull this off let\'s hit em', source: 'Instagram', use_case: 'Dream bass show production - contact crew in caption' },
  { item: 'Anyma Giant Physical Elements', category: 'Props/Physical', priority: 'High', link: 'https://www.instagram.com/p/DEXkNysAvPD/', notes: 'This thing! What I was talking about the big/giant content. Anyma (nailed it)', source: 'Instagram', use_case: 'Large-scale physical production elements' },
  { item: 'Content on Stacked Fans', category: 'Visuals/Content', priority: 'Medium', link: 'https://www.instagram.com/p/DImJj74MfkA/', notes: 'Gotta find ways to get cool content on a stack of these fans - don\'t think it\'s been seen that much', source: 'Instagram', use_case: 'Unique fan-based visual display' },
  { item: 'NBL Promo/Ad Concept (BTS Footage)', category: 'Visuals/Content', priority: 'Medium', link: 'https://www.instagram.com/reel/DG1AI0eC1Nz/', notes: 'Cool concept for how we can present what NBL is once we start gathering footage and BTS stuff', source: 'Instagram', use_case: 'NBL marketing/branding content' },
  { item: 'More LED Over Crowd #2', category: 'LED/Panels', priority: 'High', link: 'https://www.instagram.com/reel/DG6rXq3vHla/', notes: 'More LED over the crowd', source: 'Instagram', use_case: 'Overhead LED for audience immersion' },
  { item: 'In The Round Stage Design', category: 'Stage Design', priority: 'Medium', link: 'https://www.instagram.com/reel/DIBvxNTom3u/', notes: 'If we do something in the round I wanna pull this look in', source: 'Instagram', use_case: 'In-the-round show design' },
  { item: 'Physical Cyber Teddy Build (Custom Fabrication)', category: 'Props/Physical', priority: 'High', link: 'https://www.instagram.com/p/DKMym0HsTIi/', notes: 'These ppl can make us something when it\'s time for Cyber Teddy to become real and physical', source: 'Instagram', use_case: 'Physical Cyber Teddy mascot/prop' },
  { item: 'Production Talkback Headset/Comms', category: 'DMX/Control', priority: 'Medium', link: 'https://www.instagram.com/reel/DLkVjzdMjJA/', notes: 'Thought this would be cool for my talkback to production if I need it', source: 'Instagram', use_case: 'Production communication' },
  { item: 'Scaled Down Sphere Show (Anyma Reference)', category: 'Stage Design', priority: 'High', link: 'https://www.instagram.com/reel/DM-x2V8ulzR/', notes: 'Saved to show he took that big ass Sphere show and still had a scaled down version', source: 'Instagram', use_case: 'Scalable show design reference' },
  { item: 'Moving/Breathing LED Panels', category: 'Kinetic/Motion', priority: 'High', link: 'https://www.instagram.com/reel/DN_xRBajIDo/', notes: 'Any movement in LED product is always super fire. Especially those breathing panels that move in and out', source: 'Instagram', use_case: 'Kinetic LED panels for shows' },
  { item: 'Precision Timing Reference #2', category: 'Lighting', priority: 'High', link: 'https://www.instagram.com/reel/DQXFt5JDnQM/', notes: 'Precision again', source: 'Instagram', use_case: 'Music-synced precision' },
  { item: 'Storytelling Production Reference', category: 'Visuals/Content', priority: 'Medium', link: 'https://www.instagram.com/reel/DTIow2mDKIG/', notes: 'Storytelling executed masterfully. Not there yet scale wise but can find practical ways to tell our story outside of content', source: 'Instagram', use_case: 'Narrative storytelling in live shows' },
  { item: 'Cube/Tube Combo with Motors (District Style)', category: 'Kinetic/Motion', priority: 'High', link: 'https://www.instagram.com/reel/DTc9N22DMm3/', notes: 'This is a render but they actually built this. Love the cube/tube combo. Could be used with those motor things like in District', source: 'Instagram', use_case: 'Kinetic cube/tube LED system' },
  { item: 'Big Stream Deck', category: 'DMX/Control', priority: 'Medium', link: 'https://www.instagram.com/reel/DUJaDcxAPe3/', notes: 'Big ass stream deck', source: 'Instagram', use_case: 'Show control interface' },
  { item: 'Heavy LED Fixtures (Pip Saw in China)', category: 'LED/Panels', priority: 'Medium', link: 'https://www.instagram.com/reel/DTxLb2-jfLM/', notes: 'Pip went and saw these in China. He said they are super heavy but we may be able to find some cool ones', source: 'Pip', use_case: 'LED fixture options' },
  { item: 'Cool Lights Reference', category: 'Lighting', priority: 'Medium', link: 'https://www.instagram.com/reel/DWDGQ_Fk1MM/', notes: 'Cool ass lights', source: 'Instagram', use_case: 'Lighting fixtures' },
  { item: 'In The Round Bass Setup / Award Show Look', category: 'Stage Design', priority: 'Medium', link: 'https://www.instagram.com/reel/DUA9NBfjHza/', notes: 'Would be cool for an in the round bass setup or an award show where we only need one look', source: 'Instagram', use_case: 'In-the-round or single-look award show' },
  { item: 'Fire Lighting Reference', category: 'Lighting', priority: 'Medium', link: 'https://www.instagram.com/reel/DWGINMSD0hN/', notes: 'Fire', source: 'Instagram', use_case: 'Lighting design reference' },
  { item: 'NBL Ad/Post Concept', category: 'Visuals/Content', priority: 'Medium', link: 'https://www.instagram.com/reel/DT7p-H1jYaq/', notes: 'Cool post idea for NBL ad', source: 'Instagram', use_case: 'NBL marketing content' },
  { item: 'Simple Backyard/Campaign Setup', category: 'Stage Design', priority: 'Medium', link: 'https://www.instagram.com/reel/DT3LqFzEe_u/', notes: 'Simple and cool setup for small things like showing up in backyards and stuff for a campaign for a bass project', source: 'Instagram', use_case: 'Small-scale guerrilla/campaign setups' },
  { item: 'Cool Lights Reference #2', category: 'Lighting', priority: 'Medium', link: 'https://www.instagram.com/reel/DVfIk9Lisi3/', notes: 'Cool lights', source: 'Instagram', use_case: 'Lighting fixtures' },
];

export default async function handler(req, res) {
  const action = req.query.action || '';

  // LIST
  if (req.method === 'GET' && (!action || action === 'list')) {
    try {
      const supabase = getServiceClient();
      const { data, error } = await supabase
        .from('links')
        .select('*')
        .eq('is_archived', false)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return res.status(200).json(data || []);
    } catch (err) {
      console.error('List links error:', err);
      return res.status(500).json({ error: 'Failed to list links' });
    }
  }

  // GET
  if (req.method === 'GET' && action === 'get') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'Link ID is required' });

    try {
      const supabase = getServiceClient();
      const { data, error } = await supabase
        .from('links')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) return res.status(404).json({ error: 'Link not found' });
      return res.status(200).json(data);
    } catch (err) {
      console.error('Get link error:', err);
      return res.status(500).json({ error: 'Failed to get link' });
    }
  }

  // SAVE (upsert)
  if (req.method === 'POST' && (!action || action === 'save')) {
    const auth = await getUser(req);
    const userId = auth ? auth.user.id : 'anonymous';
    const body = req.body;

    if (!body.id && !body.item) return res.status(400).json({ error: 'Item name is required' });
    if (body.id && !validateId(body.id)) return res.status(400).json({ error: 'Invalid link ID format' });

    try {
      const supabase = getServiceClient();
      const id = body.id || ('link_' + Date.now());

      const row = {
        id,
        item: body.item,
        category: body.category || null,
        purchase_status: body.purchase_status || 'To Research',
        review_status: body.review_status || 'Not Started',
        priority: body.priority || 'Medium',
        link: body.link || null,
        notes: body.notes || null,
        source: body.source || null,
        estimated_cost: body.estimated_cost || null,
        use_case: body.use_case || null,
        updated_at: new Date().toISOString(),
        updated_by: userId,
      };

      // Check if exists
      const { data: existing } = await supabase
        .from('links')
        .select('id')
        .eq('id', id)
        .single();

      if (existing) {
        delete row.id; // don't update PK
        const { data, error } = await supabase
          .from('links')
          .update(row)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return res.status(200).json({ link: data, created: false });
      } else {
        row.created_by = userId;
        const { data, error } = await supabase
          .from('links')
          .insert(row)
          .select()
          .single();
        if (error) throw error;
        return res.status(201).json({ link: data, created: true });
      }
    } catch (err) {
      console.error('Save link error:', err);
      return res.status(500).json({ error: 'Failed to save link', detail: err?.message });
    }
  }

  // DELETE (soft)
  if (req.method === 'POST' && action === 'delete') {
    const auth = await getUser(req);
    const userId = auth ? auth.user.id : 'anonymous';
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'Link ID is required' });

    try {
      const supabase = getServiceClient();
      const { error } = await supabase
        .from('links')
        .update({ is_archived: true, updated_at: new Date().toISOString(), updated_by: userId })
        .eq('id', id);
      if (error) throw error;
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('Delete link error:', err);
      return res.status(500).json({ error: 'Failed to delete link' });
    }
  }

  // SEED — one-time bulk insert
  if (req.method === 'POST' && action === 'seed') {
    try {
      const supabase = getServiceClient();

      // Check if already seeded
      const { count } = await supabase
        .from('links')
        .select('id', { count: 'exact', head: true });

      if (count > 0) {
        return res.status(200).json({ message: 'Already seeded', count });
      }

      const rows = SEED_DATA.map((item, i) => ({
        id: 'link_seed_' + String(i + 1).padStart(3, '0'),
        ...item,
        purchase_status: 'To Research',
        review_status: 'Not Started',
        is_archived: false,
        created_by: 'seed',
        updated_by: 'seed',
      }));

      const { error } = await supabase.from('links').insert(rows);
      if (error) throw error;

      return res.status(201).json({ message: 'Seeded ' + rows.length + ' links', count: rows.length });
    } catch (err) {
      console.error('Seed links error:', err);
      return res.status(500).json({ error: 'Failed to seed links', detail: err?.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
