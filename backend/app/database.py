import os
from typing import List, Dict, Any, Optional

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "") or os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

_supabase_client = None

def get_supabase():
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client
    
    if SUPABASE_URL and SUPABASE_KEY:
        try:
            from supabase import create_client, Client
            _supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
            return _supabase_client
        except Exception as e:
            print(f"Warning: Failed to initialize Supabase client: {e}")
            return None
    return None

def is_supabase_enabled() -> bool:
    return get_supabase() is not None

# ---------------------------------------------------------------------------
# Supabase Database Methods
# ---------------------------------------------------------------------------

def sb_get_subject(subject_id: str) -> Optional[Dict[str, Any]]:
    client = get_supabase()
    if not client:
        return None
    res = client.table("subjects").select("*").eq("id", subject_id).execute()
    return res.data[0] if res.data else None

def sb_get_questions_for_subject(subject_id: str) -> List[Dict[str, Any]]:
    client = get_supabase()
    if not client:
        return []
    res = client.table("questions").select("*").eq("subject_id", subject_id).execute()
    return res.data or []

def sb_create_session(session_data: Dict[str, Any]):
    client = get_supabase()
    if not client:
        return
    client.table("quiz_sessions").insert(session_data).execute()

def sb_get_session(session_id: str) -> Optional[Dict[str, Any]]:
    client = get_supabase()
    if not client:
        return None
    res = client.table("quiz_sessions").select("*").eq("id", session_id).execute()
    return res.data[0] if res.data else None

def sb_update_session(session_id: str, update_data: Dict[str, Any]):
    client = get_supabase()
    if not client:
        return
    client.table("quiz_sessions").update(update_data).eq("id", session_id).execute()

def sb_record_session_question(record_data: Dict[str, Any]):
    client = get_supabase()
    if not client:
        return
    client.table("session_questions").insert(record_data).execute()

def sb_get_session_history(session_id: str) -> List[Dict[str, Any]]:
    client = get_supabase()
    if not client:
        return []
    res = client.table("session_questions").select("*").eq("session_id", session_id).order("order_index").execute()
    return res.data or []
