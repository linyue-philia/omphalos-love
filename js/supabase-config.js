// Supabase 配置
const SUPABASE_URL = 'https://njkadeyempcxxonakwnbm.supabase.co';
const SUPABASE_ANON_KEY = '你的anon公钥';

// 创建 Supabase 客户端（改名避免冲突）
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUserId = null;

async function initSupabaseUser() {
    let userId = localStorage.getItem('supabase_user_id');
    if (!userId) {
        userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('supabase_user_id', userId);
    }
    currentUserId = userId;
    console.log('当前用户ID:', currentUserId);
    return userId;
}

async function syncMessagesToSupabase(messages) {
    if (!currentUserId) await initSupabaseUser();
    if (!messages || messages.length === 0) return;
    
    const messagesToSync = messages.map(msg => ({
        id: msg.id,
        text: msg.text || '',
        sender: msg.sender === 'user' ? 'user' : 'partner',
        timestamp: msg.timestamp instanceof Date ? msg.timestamp.toISOString() : new Date(msg.timestamp).toISOString(),
        image: msg.image || null,
        status: msg.status || 'sent',
        favorited: msg.favorited || false,
        note: msg.note || null,
        type: msg.type || 'normal',
        reply_to_id: msg.replyTo?.id || null,
        user_id: currentUserId
    }));
    
    try {
        await supabaseClient.from('messages').delete().eq('user_id', currentUserId);
        if (messagesToSync.length > 0) {
            const { error } = await supabaseClient.from('messages').insert(messagesToSync);
            if (error) console.error('同步失败:', error);
            else console.log(`已同步 ${messagesToSync.length} 条消息`);
        }
    } catch (e) {
        console.error('同步出错:', e);
    }
}

async function loadMessagesFromSupabase() {
    if (!currentUserId) await initSupabaseUser();
    try {
        const { data, error } = await supabaseClient
            .from('messages')
            .select('*')
            .eq('user_id', currentUserId)
            .order('timestamp', { ascending: true });
        
        if (error) { console.error('加载失败:', error); return null; }
        if (data && data.length > 0) {
            return data.map(msg => ({
                id: msg.id,
                text: msg.text,
                sender: msg.sender === 'user' ? 'user' : 'partner',
                timestamp: new Date(msg.timestamp),
                image: msg.image,
                status: msg.status,
                favorited: msg.favorited,
                note: msg.note,
                type: msg.type,
                replyTo: msg.reply_to_id ? { id: msg.reply_to_id } : null
            }));
        }
        return null;
    } catch (e) {
        console.error('加载出错:', e);
        return null;
    }
}
