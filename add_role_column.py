"""
Migration: Add `role` column to users table.

Run ONCE:
    python add_role_column.py

- Adds VARCHAR(20) role column (default 'hr')
- Upgrades the first registered account to 'ceo'
"""

from app.db.dbase import get_db_connection


def run():
    conn = get_db_connection()
    cur = conn.cursor()

    # 1. Add role column if it doesn't exist
    cur.execute("""
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'hr';
    """)

    # 2. Make the first registered user the CEO
    cur.execute("""
        UPDATE users
        SET role = 'ceo'
        WHERE id = (SELECT MIN(id) FROM users);
    """)

    conn.commit()
    cur.close()
    conn.close()

    print("✅ Migration complete: 'role' column added to users table.")
    print("   First account has been upgraded to 'ceo'.")


if __name__ == "__main__":
    run()
