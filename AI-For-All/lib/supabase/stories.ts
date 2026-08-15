import { createClient } from './client';
import { defaultStories, StoryModule } from '../story-data';

export async function fetchAllStories(): Promise<StoryModule[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('stories')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      // Map DB columns to StoryModule type
      const dbStories: StoryModule[] = data.map((row: any) => ({
        id: row.id,
        title: row.title,
        category: row.category || 'AI Basics',
        level: row.level || 'Starter',
        type: row.type === 'with_activity' ? 'with_activity' : 'choices_only',
        description: row.description || '',
        color: row.color || '#79a8ff',
        image: row.image || 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Untitled%20design%20%2889%29%201-VY50vMtptXr0tOsB2AUUCKt4I96OmQ.png',
        status: row.status || 'Published',
        updatedAt: row.updated_at ? new Date(row.updated_at).toLocaleDateString() : 'Recently',
        createdAt: row.created_at || new Date().toISOString(),
        skillsBuildUrl: row.skills_build_url || '',
        skillsBuildButtonText: row.skills_build_button_text || 'Take Course',
        scenes: row.scenes || [],
        activity: row.activity || undefined,
      }));

      // ONLY merge default stories if the database is literally empty on first load.
      // But actually, if they delete everything, they want it to be empty.
      // So we will just return the dbStories directly. 
      // If you want default stories back, you can manually seed them.
      return dbStories;
    } else if (data && data.length === 0) {
      // The table exists but is empty. Return empty array instead of re-injecting defaults
      // so that deleted items stay deleted.
      return [];
    } else if (error) {
      console.warn('[Stories DB] Supabase fetch error:', error);
    }
  } catch (err) {
    console.warn('[Stories DB] Supabase fetch failed or table not found, using local storage fallback:', err);
  }

  // Fallback to localStorage if available in browser
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('ai_for_all_custom_stories');
      if (stored) {
        const customStories: StoryModule[] = JSON.parse(stored);
        const customIds = new Set(customStories.map(s => s.id));
        const filteredDefault = defaultStories.filter(s => !customIds.has(s.id));
        return [...customStories, ...filteredDefault];
      }
    } catch {
      // Ignore JSON error
    }
  }

  return defaultStories;
}

export async function fetchStoryById(id: string): Promise<StoryModule | null> {
  const allStories = await fetchAllStories();
  return allStories.find(s => s.id === id || s.id === `story-${id}`) || null;
}

export async function saveStoryToDb(story: StoryModule): Promise<boolean> {
  let savedToSupabase = false;

  try {
    const supabase = createClient();
    const payload = {
      id: story.id,
      title: story.title,
      category: story.category,
      level: story.level,
      type: story.type,
      description: story.description || '',
      color: story.color || '#79a8ff',
      image: story.image || '',
      status: story.status,
      skills_build_url: story.skillsBuildUrl || '',
      skills_build_button_text: story.skillsBuildButtonText || 'Take Course',
      scenes: story.scenes,
      activity: story.activity || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('stories').upsert(payload, { onConflict: 'id' });
    if (!error) {
      savedToSupabase = true;
    } else {
      console.error('[Stories DB] Supabase upsert error:', error);
    }
  } catch (err) {
    console.warn('[Stories DB] Supabase save error:', err);
  }

  // Always save to localStorage as local fallback
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('ai_for_all_custom_stories');
      let list: StoryModule[] = stored ? JSON.parse(stored) : [];
      const idx = list.findIndex(s => s.id === story.id);
      if (idx >= 0) {
        list[idx] = story;
      } else {
        list.unshift(story);
      }
      localStorage.setItem('ai_for_all_custom_stories', JSON.stringify(list));
    } catch (e) {
      console.error('[Stories LocalStorage] Error saving local backup:', e);
    }
  }

  return true;
}

export async function deleteStoryFromDb(id: string): Promise<boolean> {
  try {
    const supabase = createClient();
    await supabase.from('stories').delete().eq('id', id);
  } catch (err) {
    console.warn('[Stories DB] Supabase delete error:', err);
  }

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('ai_for_all_custom_stories');
      if (stored) {
        let list: StoryModule[] = JSON.parse(stored);
        list = list.filter(s => s.id !== id);
        localStorage.setItem('ai_for_all_custom_stories', JSON.stringify(list));
      }
    } catch {}
  }
  return true;
}
