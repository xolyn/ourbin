from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime, timedelta
import sqlite3
import uuid
import os
from typing import List, Optional

APP_VERSION = "1.0.1"
PORT=8000

app = FastAPI(title="OurBin API", version=APP_VERSION)

# 启用CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 数据库文件路径（支持环境变量覆盖）
DB_PATH = os.getenv("DB_PATH", "ourbin.db")
TABLE_NAME="bins"

# 数据模型
class BinCreate(BaseModel):
    content: str
    expiration_hours: float = 24  # 默认24小时过期，支持小数（如0.083表示5分钟）

class BinUpdate(BaseModel):
    content: str

class BinResponse(BaseModel):
    uuid: str
    creation_time: int
    content: str
    expiration_time: int

class BinListItem(BaseModel):
    uuid: str
    creation_time: int
    expiration_time: int
    preview: str

class BinRenew(BaseModel):
    uuids: List[str]  # UUID列表

# 初始化数据库
def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(f'''
        CREATE TABLE IF NOT EXISTS {TABLE_NAME} (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT UNIQUE NOT NULL,
            creation_time INTEGER NOT NULL,
            content TEXT NOT NULL,
            file_path TEXT,
            expiration_time INTEGER NOT NULL
        )
    ''')
    conn.commit()
    conn.close()

# 获取数据库连接
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# 生成UUID
def generate_uuid():
    return str(uuid.uuid4())[:14].replace('-', '')  # 生成14位UUID

# 创建bin
@app.post("/api/bins", response_model=BinResponse)
async def create_bin(bin_data: BinCreate):
    creation_time = int(datetime.now().timestamp())
    expiration_time = creation_time + (bin_data.expiration_hours * 3600)
    bin_uuid = generate_uuid()
    
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO bins (uuid, creation_time, content, expiration_time)
        VALUES (?, ?, ?, ?)
    ''', (bin_uuid, creation_time, bin_data.content, expiration_time))
    conn.commit()
    conn.close()
    
    return BinResponse(
        uuid=bin_uuid,
        creation_time=creation_time,
        content=bin_data.content,
        expiration_time=expiration_time
    )

# 获取bin详情
@app.get("/api/bins/{bin_uuid}", response_model=BinResponse)
async def get_bin(bin_uuid: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT uuid, creation_time, content, expiration_time
        FROM bins
        WHERE uuid = ? AND expiration_time > ?
    ''', (bin_uuid, int(datetime.now().timestamp())))
    
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        raise HTTPException(status_code=404, detail="Not found or expired")
    
    return BinResponse(
        uuid=row['uuid'],
        creation_time=row['creation_time'],
        content=row['content'],
        expiration_time=row['expiration_time']
    )

# 批量续期1天
@app.put("/api/bins/renew")
async def renew_bins(bin_data: BinRenew):
    conn = get_db()
    cursor = conn.cursor()
    current_time = int(datetime.now().timestamp())
    
    if not bin_data.uuids:
        conn.close()
        raise HTTPException(status_code=400, detail="No UUIDs provided")
    
    # 检查所有bin是否存在且未过期
    placeholders = ','.join(['?'] * len(bin_data.uuids))
    cursor.execute(f'''
        SELECT uuid, expiration_time
        FROM bins
        WHERE uuid IN ({placeholders}) AND expiration_time > ?
    ''', bin_data.uuids + [current_time])
    
    existing_bins = cursor.fetchall()
    
    if len(existing_bins) != len(bin_data.uuids):
        conn.close()
        raise HTTPException(status_code=404, detail="Some bins not found or expired")
    
    # 批量更新过期时间（加1天 = 3600*24秒）
    updated_count = 0
    for row in existing_bins:
        new_expiration_time = row['expiration_time'] + 3600*24
        cursor.execute('''
            UPDATE bins
            SET expiration_time = ?
            WHERE uuid = ?
        ''', (new_expiration_time, row['uuid']))
        updated_count += 1
    
    conn.commit()
    conn.close()
    
    return {"message": "Renewed successfully", "updated_count": updated_count}

# 更新bin
@app.put("/api/bins/{bin_uuid}", response_model=BinResponse)
async def update_bin(bin_uuid: str, bin_data: BinUpdate):
    conn = get_db()
    cursor = conn.cursor()
    
    # 检查bin是否存在且未过期
    cursor.execute('''
        SELECT uuid, creation_time, expiration_time
        FROM bins
        WHERE uuid = ? AND expiration_time > ?
    ''', (bin_uuid, int(datetime.now().timestamp())))
    
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Not found or expired")
    
    # 更新内容
    cursor.execute('''
        UPDATE bins
        SET content = ?
        WHERE uuid = ?
    ''', (bin_data.content, bin_uuid))
    
    conn.commit()
    conn.close()
    
    return BinResponse(
        uuid=bin_uuid,
        creation_time=row['creation_time'],
        content=bin_data.content,
        expiration_time=row['expiration_time']
    )

# 软删除bin（修改过期时间）
@app.delete("/api/bins/{bin_uuid}")
async def delete_bin(bin_uuid: str):
    conn = get_db()
    cursor = conn.cursor()
    
    # 支持多个UUID，通过半角逗号分隔
    uuid_list = [uuid.strip() for uuid in bin_uuid.split(',') if uuid.strip()]
    
    if not uuid_list:
        conn.close()
        raise HTTPException(status_code=400, detail="No valid UUID provided")
    
    # 批量软删除：将过期时间设置为1970-01-01
    expiration_time = 0  # 1970-01-01 00:00:00 UTC
    placeholders = ','.join(['?'] * len(uuid_list))
    cursor.execute(f'''
        UPDATE bins
        SET expiration_time = ?
        WHERE uuid IN ({placeholders})
    ''', [expiration_time] + uuid_list)
    
    deleted_count = cursor.rowcount
    conn.commit()
    conn.close()
    
    return {"message": "Deleted successfully", "deleted_count": deleted_count}

# 列出所有bin
@app.get("/api/bins", response_model=List[BinListItem])
async def list_bins(
    sort_by: str = Query("creation_time", description="排序字段: creation_time, expiration_time"),
    order: str = Query("desc", description="排序顺序: asc, desc")
):
    conn = get_db()
    cursor = conn.cursor()
    current_time = int(datetime.now().timestamp())
    
    # 验证排序字段
    valid_sort_fields = ["creation_time", "expiration_time"]
    if sort_by not in valid_sort_fields:
        sort_by = "creation_time"
    
    # 验证排序顺序
    if order not in ["asc", "desc"]:
        order = "desc"
    
    # 构建SQL查询
    order_clause = f"ORDER BY {sort_by} {order.upper()}"
    
    cursor.execute(f'''
        SELECT uuid, creation_time, content, expiration_time
        FROM bins
        WHERE expiration_time > ?
        {order_clause}
    ''', (current_time,))
    
    rows = cursor.fetchall()
    conn.close()
    
    bins = []
    for row in rows:
        preview = row['content'][:50]
        if len(row['content']) > 50:
            preview += "..."
        
        bins.append(BinListItem(
            uuid=row['uuid'],
            creation_time=row['creation_time'],
            expiration_time=row['expiration_time'],
            preview=preview
        ))
    
    return bins

# 清理已过期的bin
@app.delete("/api/bins/cleanup")
async def cleanup_expired_bins():
    conn = get_db()
    cursor = conn.cursor()
    current_time = int(datetime.now().timestamp())
    
    cursor.execute('''
        DELETE FROM bins
        WHERE expiration_time <= ?
    ''', (current_time,))
    
    deleted_count = cursor.rowcount
    conn.commit()
    conn.close()
    
    return {"message": "Cleanup completed", "deleted_count": deleted_count}

# 重置数据库
@app.delete("/api/bins/reset")
async def reset_database():
    conn = get_db()
    cursor = conn.cursor()
    
    # 删除所有数据
    cursor.execute(f'TRUNCATE TABLE {TABLE_NAME}')
    
    deleted_count = cursor.rowcount
    conn.commit()
    conn.close()
    
    return {"message": "Database reset successfully", "deleted_count": deleted_count}

# 健康检查
@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "version": APP_VERSION}

if __name__ == "__main__":
    init_db()
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)