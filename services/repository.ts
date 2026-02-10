
import { supabase } from './supabase';
import { User, Material, Simulado, Edital, Plan } from '../types';

// Helper to handle the "localStorage-like" behavior using Supabase 'user_progress' table
// key: 'stats', 'revisions', 'simulado_results', etc.
export const userProgressRepo = {
    get: async <T>(userId: string, key: string, defaultValue: T): Promise<T> => {
        const { data, error } = await supabase
            .from('user_progress')
            .select('value')
            .eq('user_id', userId)
            .eq('key', key)
            .single();

        if (error || !data) return defaultValue;
        return data.value as T;
    },
    set: async <T>(userId: string, key: string, value: T): Promise<void> => {
        const { error } = await supabase
            .from('user_progress')
            .upsert({ user_id: userId, key, value }, { onConflict: 'user_id, key' });
        
        if (error) console.error(`Error saving ${key}:`, error);
    }
};

export const globalRepo = {
    // USERS
    getUsers: async (): Promise<User[]> => {
        const { data, error } = await supabase.from('users').select('*');
        if (error) { console.error(error); return []; }
        
        // Map snake_case from DB (if needed) or assuming direct mapping if we inserted strictly
        return data.map((u: any) => ({
            ...u,
            studyStreak: u.study_streak,
            lastStudyDate: u.last_study_date,
            planId: u.plan_id // Map DB column to Typescript property
        }));
    },
    saveUser: async (user: User): Promise<void> => {
        const dbUser = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            password: user.password,
            approved: user.approved,
            avatar: user.avatar,
            objective: user.objective,
            achievements: user.achievements,
            study_streak: user.studyStreak,
            last_study_date: user.lastStudyDate,
            plan_id: user.planId // Save plan ID
        };
        const { error } = await supabase.from('users').upsert(dbUser);
        if (error) console.error('Error saving user:', error);
    },
    deleteUser: async (id: string): Promise<void> => {
        await supabase.from('users').delete().eq('id', id);
    },

    // PLANS (Stored in 'app_config' for simplicity or a specific table if you created one, 
    // assuming we mock or use app_config array for now to avoid migration issues on your end,
    // OR assuming we just store content JSONs. Let's use 'plans' table if available, but fallback to app_config array for safety without migration rights)
    // STRATEGY: Storing plans list in 'app_config' key='plans_list'
    getPlans: async (): Promise<Plan[]> => {
        const { data, error } = await supabase.from('app_config').select('value').eq('key', 'plans_list').single();
        if (error || !data) return [];
        return data.value as Plan[];
    },
    savePlans: async (plans: Plan[]): Promise<void> => {
        await supabase.from('app_config').upsert({ key: 'plans_list', value: plans });
    },

    // MATERIALS
    getMaterials: async (): Promise<Material[]> => {
        const { data, error } = await supabase.from('materials').select('*');
        if (error) return [];
        return data.map((d: any) => d.content);
    },
    saveMaterials: async (materials: Material[]): Promise<void> => {
        for (const mat of materials) {
            await supabase.from('materials').upsert({ id: mat.id, content: mat });
        }
    },
    deleteMaterial: async (id: string): Promise<void> => {
        await supabase.from('materials').delete().eq('id', id);
    },

    // SIMULADOS
    getSimulados: async (): Promise<Simulado[]> => {
        const { data, error } = await supabase.from('simulados').select('*');
        if (error) return [];
        return data.map((d: any) => d.content);
    },
    saveSimulado: async (sim: Simulado): Promise<void> => {
        await supabase.from('simulados').upsert({ id: sim.id, content: sim });
    },
    deleteSimulado: async (id: string): Promise<void> => {
        await supabase.from('simulados').delete().eq('id', id);
    },

    // EDITAIS
    getEditais: async (): Promise<Edital[]> => {
        const { data, error } = await supabase.from('editais').select('*');
        if (error) return [];
        return data.map((d: any) => d.content);
    },
    saveEdital: async (ed: Edital): Promise<void> => {
        await supabase.from('editais').upsert({ id: ed.id, content: ed });
    },
    deleteEdital: async (id: string): Promise<void> => {
        await supabase.from('editais').delete().eq('id', id);
    },

    // GLOBAL CONFIG / SYSTEM MESSAGE
    getCommandMessage: async (): Promise<string> => {
        const { data, error } = await supabase.from('app_config').select('value').eq('key', 'command_message').single();
        if (error || !data) return '';
        return data.value?.text || '';
    },
    saveCommandMessage: async (message: string): Promise<void> => {
        await supabase.from('app_config').upsert({ key: 'command_message', value: { text: message } });
    },
    
    // TUTORIAL VIDEO
    getTutorialVideo: async (): Promise<string> => {
        const { data, error } = await supabase.from('app_config').select('value').eq('key', 'tutorial_video').single();
        if (error || !data) return '';
        return data.value?.url || '';
    },
    saveTutorialVideo: async (url: string): Promise<void> => {
        await supabase.from('app_config').upsert({ key: 'tutorial_video', value: { url: url } });
    }
};
