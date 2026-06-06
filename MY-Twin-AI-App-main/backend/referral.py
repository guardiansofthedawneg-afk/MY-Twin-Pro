"""
MyTwin – Referral System v2.0
- إنشاء كود إحالة فريد لكل مستخدم
- تفعيل كود الإحالة ومنح مكافأة للطرفين
- منع تكرار استخدام نفس الكود
- إنشاء رابط إحالة للمشاركة
"""
import os
import hashlib
from datetime import datetime, timezone
from supabase import create_client, Client

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
BASE_URL = os.getenv("EXPO_PUBLIC_API_URL", "https://mytwin.app")

db: Client = None
if SUPABASE_URL and SUPABASE_KEY:
    db = create_client(SUPABASE_URL, SUPABASE_KEY)

def generate_referral_code(uid: str) -> str:
    """
    إنشاء كود إحالة فريد للمستخدم.
    مثال: MT-A3F2X1
    """
    return "MT" + hashlib.sha256(uid.encode()).hexdigest()[:6].upper()

def get_referral_link(uid: str) -> str:
    """
    إنشاء رابط إحالة كامل للمشاركة.
    مثال: https://mytwin.app/join?ref=MT-A3F2X1
    """
    code = generate_referral_code(uid)
    # تخزين الكود في الملف الشخصي إذا لم يكن موجودًا
    if db:
        existing = db.table("profiles").select("referral_code").eq("id", uid).single().execute()
        if not existing.data or not existing.data.get("referral_code"):
            db.table("profiles").update({"referral_code": code}).eq("id", uid).execute()
    return f"{BASE_URL}/join?ref={code}"

def activate_referral(uid: str, code: str) -> dict:
    """
    تفعيل كود إحالة:
    - يمنح المستخدم الجديد 500 توكن.
    - يمنح الداعي (صاحب الكود) 500 توكن.
    - يمنع استخدام نفس الكود أكثر من مرة.
    """
    if not db:
        return {"error": "no_db"}
    
    code = code.upper().strip()
    
    # البحث عن صاحب الكود
    owner = db.table("profiles").select("user_id").eq("referral_code", code).single().execute()
    if not owner.data:
        return {"error": "invalid_code"}
    
    inviter_id = owner.data["user_id"]
    
    # منع استخدام كودك الخاص
    if inviter_id == uid:
        return {"error": "own_code"}
    
    # التحقق من عدم استخدام هذا الكود مسبقًا من قبل هذا المستخدم
    existing = db.table("referral_usage").select("*").eq("id", uid).eq("code", code).single().execute()
    if existing.data:
        return {"error": "already_used"}
    
    # تسجيل استخدام الكود
    db.table("referral_usage").insert({
        "user_id": uid,
        "code": code,
        "inviter_id": inviter_id,
        "activated_at": datetime.now(timezone.utc).isoformat(),
    }).execute()
    
    # منح المكافأة للمستخدم الجديد
    from token_limits import add_referral_bonus
    add_referral_bonus(uid, 500)
    
    # منح المكافأة للداعي
    add_referral_bonus(inviter_id, 500)
    
    return {
        "success": True,
        "bonus": 500,
        "inviter_id": inviter_id,
    }
