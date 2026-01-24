from app.db.dbase import get_db_connection


def insert_resume(filename: str):
    """
    Save uploaded resume metadata into the database.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    query = """
        INSERT INTO resumes (filename)
        VALUES (%s);
    """

    cursor.execute(query, (filename,))
    conn.commit()

    cursor.close()
    conn.close()


def get_all_resumes():
    """
    Fetch all uploaded resumes from the database.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    query = """
        SELECT id, filename, uploaded_at
        FROM resumes
        ORDER BY uploaded_at DESC;
    """

    cursor.execute(query)
    rows = cursor.fetchall()

    cursor.close()
    conn.close()

    return rows
