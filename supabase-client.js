// Supabase Client Configuration
import { createClient } from '@supabase/supabase-js'

// Replace these with your actual Supabase URL and anon key
const SUPABASE_URL = 'https://fwgjphiegsppfvbpoxwi.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3Z2pwaGllZ3NwcGZ2YnBveHdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NjkzNDYsImV4cCI6MjA4NzE0NTM0Nn0.6KpbC7QP9p1uEYndZzf_2cgbeATGUiTxLjjvr8fvY8A'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})

// Database helper functions
export const db = {
  // Tasks
  async getTasks() {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  },
  
  async createTask(task) {
    const { data, error } = await supabase
      .from('tasks')
      .insert([task])
      .select()
    
    if (error) throw error
    return data[0]
  },
  
  async updateTask(id, updates) {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
    
    if (error) throw error
    return data[0]
  },
  
  async deleteTask(id) {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },
  
  // User Progress
  async getUserProgress() {
    const { data, error } = await supabase
      .from('user_progress')
      .select('*')
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    return data
  },
  
  async updateUserProgress(updates) {
    const { data, error } = await supabase
      .from('user_progress')
      .update(updates)
      .eq('user_id', supabase.auth.user()?.id)
      .select()
    
    if (error) throw error
    return data[0]
  },
  
  // Achievements
  async getAchievements() {
    const { data, error } = await supabase
      .from('achievements')
      .select('*')
      .order('level', { ascending: true })
    
    if (error) throw error
    return data
  },
  
  // Profile
  async getProfile() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    return data
  },
  
  async updateProfile(updates) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', supabase.auth.user()?.id)
      .select()
    
    if (error) throw error
    return data[0]
  }
}

// Auth helper functions
export const auth = {
  async signUp(email, password, options = {}) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options
    })
    
    if (error) throw error
    return data
  },
  
  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) throw error
    return data
  },
  
  async signInWithOAuth(provider) {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider
    })
    
    if (error) throw error
    return data
  },
  
  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },
  
  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  },
  
  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback)
  }
}

// Real-time subscriptions
export const realtime = {
  subscribeToTasks(callback) {
    return supabase
      .channel('tasks')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'tasks',
          filter: `user_id=eq.${supabase.auth.user()?.id}`
        }, 
        callback
      )
      .subscribe()
  },
  
  subscribeToUserProgress(callback) {
    return supabase
      .channel('user_progress')
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'user_progress',
          filter: `user_id=eq.${supabase.auth.user()?.id}`
        }, 
        callback
      )
      .subscribe()
  }
}

export default supabase
